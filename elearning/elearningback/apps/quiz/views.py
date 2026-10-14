"""Vues de l'application Quiz."""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.choices import Restitution, StatutTentative
from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import EnseignantAffectePermission
from apps.core.services import ServiceExterneNonConfigure
from apps.quiz.models import Quiz, ReponsesApprenant, TentativesQuiz
from apps.quiz.serializers import (
    QuestionCreationSerializer,
    QuestionPassageSerializer,
    QuizDetailSerializer,
    QuizSerializer,
    ReponseSerializer,
    TentativeDetailSerializer,
    TentativeSerializer,
)
from apps.quiz.services import (
    corriger_reponses_ouvertes,
    noter_reponse_immediatement,
    recalculer_note_totale,
)
from apps.reports.services import reporter_tentative


class QuizViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des quiz.

    - Filtres liste : `?matiere_id=`, `?classe_id=`, `?statut=`.
    - DELETE refusé (suppression logique) : passer `statut=archive` par PATCH.
    - Détail avec questions/options imbriquées.
    """
    queryset = Quiz.objects.all()
    lookup_field = 'uuid'
    permission_classes = [EnseignantAffectePermission]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if matiere_id := params.get('matiere_id'):
            queryset = queryset.filter(matiere_id=matiere_id)
        if classe_id := params.get('classe_id'):
            queryset = queryset.filter(classe_id=classe_id)
        if statut := params.get('statut'):
            queryset = queryset.filter(statut=statut)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Suppression logique : jamais de DELETE physique sur un quiz."""
        return Response(
            {'detail': 'Suppression physique interdite : passer le statut à '
                       '"archive" via PATCH /v1/quiz/{uuid}/.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'])
    def questions(self, request, uuid=None):
        """POST /v1/quiz/{uuid}/questions/ : ajout d'une question avec
        options et barème (transaction atomique)."""
        quiz = self.get_object()
        serializer = QuestionCreationSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        if 'ordre' not in request.data:
            derniere = quiz.questions.order_by('-ordre').values_list(
                'ordre', flat=True).first()
            serializer.validated_data['ordre'] = (derniere or 0) + 1
        with transaction.atomic():
            question = serializer.save(quiz=quiz)
        return Response(
            {'uuid': question.uuid, 'ordre': question.ordre,
             'options': [
                 {'uuid': option.uuid, 'ordre': option.ordre}
                 for option in question.options.all()
             ]},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def tentatives(self, request, uuid=None):
        """POST /v1/quiz/{uuid}/tentatives/ : démarrage d'une tentative.

        Vérifie `tentatives_max`, attribue le prochain numéro et renvoie
        les questions à répondre (sans les réponses correctes).
        """
        quiz = self.get_object()
        apprenant_id = request.data.get('apprenant_id')
        if not apprenant_id:
            raise ValidationError({'apprenant_id': 'Requis.'})

        nb_existantes = quiz.tentatives.filter(
            apprenant_id=apprenant_id,
        ).count()
        # `tentatives_max` null = quiz d'entraînement, sans limite.
        if (quiz.tentatives_max is not None
                and nb_existantes >= quiz.tentatives_max):
            raise ValidationError(
                {'tentatives_max': f'Nombre maximal de tentatives atteint '
                                   f'({quiz.tentatives_max}).'}
            )

        tentative = TentativesQuiz.objects.create(
            quiz=quiz,
            apprenant_id=apprenant_id,
            soumis_par=request.data.get('soumis_par'),
            numero=nb_existantes + 1,
            statut=StatutTentative.EN_COURS,
            tenant_id=request.tenant_id,
        )
        questions = QuestionPassageSerializer(
            quiz.questions.prefetch_related('options'), many=True,
        )
        return Response(
            {'tentative': TentativeSerializer(tentative).data,
             'questions': questions.data},
            status=status.HTTP_201_CREATED,
        )


class TentativesViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Tentatives de quiz : restitution, soumission, validation, report."""
    queryset = TentativesQuiz.objects.select_related('quiz')
    lookup_field = 'uuid'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TentativeDetailSerializer
        return TentativeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if apprenant_id := self.request.query_params.get('apprenant_id'):
            queryset = queryset.filter(apprenant_id=apprenant_id)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        """GET /v1/tentatives/{uuid}/ : restitution selon le paramètre du
        quiz - différée jusqu'à validation enseignant si configuré ainsi."""
        tentative = self.get_object()
        restitution_immediate = (
            tentative.quiz.restitution == Restitution.IMMEDIATE
            or tentative.statut == StatutTentative.VALIDE
        )
        # « Après date limite » : verrouillée jusqu'à la clôture du quiz
        # (sans date limite configurée, la restitution est immédiate).
        if (tentative.quiz.restitution == Restitution.APRES_DATE_LIMITE
                and not restitution_immediate
                and (tentative.quiz.date_limite is None
                     or timezone.now() > tentative.quiz.date_limite)):
            restitution_immediate = True
        if restitution_immediate:
            return Response(TentativeDetailSerializer(tentative).data)
        return Response({
            **TentativeSerializer(tentative).data,
            'restitution': 'differee',
            'detail': 'Résultats disponibles après validation de '
                      "l'enseignant.",
        })

    @action(detail=True, methods=['post'])
    def soumettre(self, request, uuid=None):
        """POST /v1/tentatives/{uuid}/soumettre/

        Corps : {"reponses": [{"question": "<uuid>", "reponse_donnee": "..."}]}
        Score QCM/vrai_faux calculé immédiatement, correction IA déclenchée
        pour les questions ouvertes.
        """
        tentative = self.get_object()
        if tentative.statut != StatutTentative.EN_COURS:
            raise ValidationError(
                {'statut': 'Cette tentative a déjà été soumise.'}
            )
        donnees_reponses = request.data.get('reponses')
        if not isinstance(donnees_reponses, list) or not donnees_reponses:
            raise ValidationError(
                {'reponses': 'Liste requise : [{"question": "...", '
                             '"reponse_donnee": "..."}].'}
            )
        questions = {
            str(question.uuid): question
            for question in tentative.quiz.questions.all()
        }

        with transaction.atomic():
            for element in donnees_reponses:
                question = questions.get(str(element.get('question', '')))
                if question is None:
                    raise ValidationError(
                        {'reponses': f"Question {element.get('question')} "
                                     'n\'appartient pas à ce quiz.'}
                    )
                reponse, _ = ReponsesApprenant.objects.update_or_create(
                    tentative=tentative, question=question,
                    defaults={
                        'reponse_donnee': str(element.get('reponse_donnee',
                                                         '')),
                        'tenant_id': request.tenant_id,
                    },
                )
                noter_reponse_immediatement(reponse)

            tentative.statut = StatutTentative.SOUMIS
            tentative.date_soumission = timezone.now()
            tentative.save(update_fields=['statut', 'date_soumission',
                                          'updated_at'])
            recalculer_note_totale(tentative)

        # Correction IA asynchrone des questions ouvertes (stub journalisé).
        corriger_reponses_ouvertes(tentative)

        tentative.refresh_from_db()
        if tentative.quiz.restitution == Restitution.DIFFEREE:
            return Response({
                **TentativeSerializer(tentative).data,
                'restitution': 'differee',
                'detail': 'Réponses enregistrées. Résultats après validation '
                          "de l'enseignant.",
            })
        return Response(TentativeDetailSerializer(tentative).data)

    @action(detail=True, methods=['post'])
    def valider(self, request, uuid=None):
        """POST /v1/tentatives/{uuid}/valider/ : validation finale de
        l'enseignant (reconduit la note totale, passe à `valide`)."""
        tentative = self.get_object()
        if tentative.statut != StatutTentative.SOUMIS:
            raise ValidationError(
                {'statut': 'Seule une tentative soumise peut être validée.'}
            )
        tentative.statut = StatutTentative.VALIDE
        tentative.save(update_fields=['statut', 'updated_at'])
        recalculer_note_totale(tentative)
        tentative.refresh_from_db()
        return Response(TentativeDetailSerializer(tentative).data)

    @action(detail=True, methods=['post'])
    def reporter(self, request, uuid=None):
        """POST /v1/tentatives/{uuid}/reporter/ : report de la note totale
        validée vers `evaluations.notes`."""
        tentative = self.get_object()
        if tentative.statut != StatutTentative.VALIDE:
            raise ValidationError(
                {'statut': 'La tentative doit être validée avant tout report.'}
            )
        if tentative.evaluation_note_id:
            return Response(
                {'detail': 'Note déjà reportée.',
                 'evaluation_note_id': tentative.evaluation_note_id},
            )
        try:
            tentative.evaluation_note_id = reporter_tentative(tentative)
        except ServiceExterneNonConfigure as erreur:
            return Response({'detail': str(erreur)},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        tentative.save(update_fields=['evaluation_note_id', 'updated_at'])
        return Response(TentativeSerializer(tentative).data)


class ReponsesViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Lecture des réponses + validation de la note par l'enseignant."""
    queryset = ReponsesApprenant.objects.select_related('question',
                                                        'tentative')
    serializer_class = ReponseSerializer
    lookup_field = 'uuid'

    @action(detail=True, methods=['patch'], url_path='note')
    def note(self, request, uuid=None):
        """PATCH /v1/reponses/{uuid}/note/ : ajuste/valide `note_finale`.

        Le corps contient `note_finale` (à partir de la proposition IA ou
        de la correction immédiate). Marque la réponse validée.
        """
        reponse = self.get_object()
        note_finale = request.data.get('note_finale')
        if note_finale is None:
            raise ValidationError({'note_finale': 'Requis.'})
        bareme = reponse.question.bareme
        if Decimal(str(note_finale)) < 0 or Decimal(str(note_finale)) > bareme:
            raise ValidationError(
                {'note_finale': f'Doit être comprise entre 0 et {bareme}.'}
            )
        reponse.note_finale = note_finale
        reponse.validee_par_enseignant = True
        reponse.save(update_fields=['note_finale',
                                    'validee_par_enseignant',
                                    'updated_at'])
        recalculer_note_totale(reponse.tentative)
        return Response(ReponseSerializer(reponse).data)
