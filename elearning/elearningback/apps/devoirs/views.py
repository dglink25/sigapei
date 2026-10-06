"""Vues de l'application Devoirs."""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.choices import PolitiqueRetard
from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import EnseignantAffectePermission
from apps.core.services import ServiceExterneNonConfigure
from apps.devoirs.models import Devoirs, Soumissions
from apps.devoirs.serializers import (
    DevoirSerializer,
    SoumissionSerializer,
)
from apps.reports.services import reporter_soumission


class DevoirsViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des devoirs + dépôt/liste des soumissions par devoir.

    - Filtres liste : `?matiere_id=`, `?classe_id=`, `?apprenant_id=` (ce
      dernier ne s'applique qu'à l'action `soumissions`).
    - POST /v1/devoirs/{uuid}/soumissions/ : dépôt d'un apprenant ; le
      retard est calculé automatiquement contre `date_limite`, et la
      politique `blocage` refuse tout dépôt tardif.
    """
    queryset = Devoirs.objects.all()
    serializer_class = DevoirSerializer
    lookup_field = 'uuid'
    permission_classes = [EnseignantAffectePermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if matiere_id := params.get('matiere_id'):
            queryset = queryset.filter(matiere_id=matiere_id)
        if classe_id := params.get('classe_id'):
            queryset = queryset.filter(classe_id=classe_id)
        return queryset

    @action(detail=True, methods=['get', 'post'])
    def soumissions(self, request, uuid=None):
        """GET : liste des soumissions du devoir (enseignant).
        POST : dépôt d'une soumission (apprenant/parent)."""
        devoir = self.get_object()

        if request.method == 'GET':
            soumissions = devoir.soumissions.select_related('devoir')
            apprenant_id = request.query_params.get('apprenant_id')
            if apprenant_id:
                soumissions = soumissions.filter(apprenant_id=apprenant_id)
            page = self.paginate_queryset(soumissions)
            serializer = SoumissionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return self._deposer(devoir, request)

    def _deposer(self, devoir, request):
        """Crée la soumission et détermine `en_retard` automatiquement."""
        maintenant = timezone.now()
        en_retard = maintenant > devoir.date_limite
        if en_retard and devoir.politique_retard == PolitiqueRetard.BLOCAGE:
            raise ValidationError(
                {'date_limite': 'Date limite dépassée : la politique de '
                                'retard de ce devoir interdit tout dépôt.'}
            )

        serializer = SoumissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        soumission = serializer.save(devoir=devoir, en_retard=en_retard)
        return Response(
            SoumissionSerializer(soumission).data,
            status=status.HTTP_201_CREATED,
        )


class SoumissionsViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Lecture des soumissions + annotations enseignant + report de note."""
    queryset = Soumissions.objects.select_related('devoir')
    serializer_class = SoumissionSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        queryset = super().get_queryset()
        if apprenant_id := self.request.query_params.get('apprenant_id'):
            queryset = queryset.filter(apprenant_id=apprenant_id)
        return queryset

    @action(detail=True, methods=['patch'], url_path='note')
    def note(self, request, uuid=None):
        """PATCH /v1/soumissions/{uuid}/note/ : saisie/annotation de note."""
        soumission = self.get_object()
        note = request.data.get('note')
        if note is None:
            raise ValidationError({'note': 'Requis.'})
        soumission.note = note
        soumission.commentaire = request.data.get(
            'commentaire', soumission.commentaire,
        )
        soumission.save(update_fields=['note', 'commentaire', 'updated_at'])
        return Response(SoumissionSerializer(soumission).data)

    @action(detail=True, methods=['post'])
    def reporter(self, request, uuid=None):
        """POST /v1/soumissions/{uuid}/reporter/ : report de la note vers
        `evaluations.notes` puis `note_reportee=True`."""
        soumission = self.get_object()
        if soumission.note is None:
            raise ValidationError(
                {'note': 'La soumission doit être notée avant tout report.'}
            )
        if soumission.note_reportee:
            return Response(
                {'detail': 'Note déjà reportée.',
                 'evaluation_note_id': soumission.evaluation_note_id},
            )
        try:
            soumission.evaluation_note_id = reporter_soumission(soumission)
        except ServiceExterneNonConfigure as erreur:
            return Response({'detail': str(erreur)},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        soumission.note_reportee = True
        soumission.save(
            update_fields=['evaluation_note_id', 'note_reportee',
                           'updated_at'],
        )
        return Response(SoumissionSerializer(soumission).data)
