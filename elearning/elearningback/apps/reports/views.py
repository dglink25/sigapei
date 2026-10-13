"""Vues de l'application Reports (activité & statistiques).

Vues en lecture seule, transverses aux applications du module :
- GET /v1/apprenants/{uuid}/activite/ : activité E-learning d'un apprenant
  (usage parent/élève) ;
- GET /v1/statistiques/ : indicateurs du tenant ;
- GET /v1/statistiques/consolidees/ : indicateurs regroupés par matière.
"""
from django.db.models import Avg, Count
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cours.models import Cours, Lecons
from apps.devoirs.models import Devoirs, Soumissions
from apps.quiz.models import Quiz, TentativesQuiz


class ApprenantActiviteView(APIView):
    """Activité E-learning d'un apprenant (soumissions + tentatives)."""

    def get(self, request, apprenant_uuid):
        tenant_id = request.tenant_id
        soumissions = (
            Soumissions.objects.filter(
                tenant_id=tenant_id, apprenant_id=apprenant_uuid,
            ).select_related('devoir').order_by('-date_depot')
        )
        tentatives = (
            TentativesQuiz.objects.filter(
                tenant_id=tenant_id, apprenant_id=apprenant_uuid,
            ).select_related('quiz').order_by('-date_debut')
        )
        return Response({
            'apprenant_id': str(apprenant_uuid),
            'soumissions': [
                {
                    'uuid': str(soumission.uuid),
                    'devoir_uuid': str(soumission.devoir.uuid),
                    'devoir_titre': soumission.devoir.titre,
                    'date_depot': soumission.date_depot,
                    'en_retard': soumission.en_retard,
                    'note': soumission.note,
                    'note_reportee': soumission.note_reportee,
                }
                for soumission in soumissions
            ],
            'tentatives_quiz': [
                {
                    'uuid': str(tentative.uuid),
                    'quiz_uuid': str(tentative.quiz.uuid),
                    'quiz_titre': tentative.quiz.titre,
                    'numero': tentative.numero,
                    'statut': tentative.statut,
                    'note_totale': tentative.note_totale,
                    'date_soumission': tentative.date_soumission,
                }
                for tentative in tentatives
            ],
        })


class StatistiquesView(APIView):
    """GET /v1/statistiques/ : indicateurs globaux du tenant courant."""

    def get(self, request):
        tenant_id = request.tenant_id
        return Response({
            'cours': {
                'total': Cours.objects.filter(tenant_id=tenant_id).count(),
                'publies': Cours.objects.filter(
                    tenant_id=tenant_id, statut='publie',
                ).count(),
                'archives': Cours.objects.filter(
                    tenant_id=tenant_id, statut='archive',
                ).count(),
                'lecons': Lecons.objects.filter(tenant_id=tenant_id).count(),
            },
            'devoirs': {
                'total': Devoirs.objects.filter(tenant_id=tenant_id).count(),
                'soumissions': Soumissions.objects.filter(
                    tenant_id=tenant_id,
                ).count(),
                'soumissions_en_retard': Soumissions.objects.filter(
                    tenant_id=tenant_id, en_retard=True,
                ).count(),
                'moyenne_notes': Soumissions.objects.filter(
                    tenant_id=tenant_id, note__isnull=False,
                ).aggregate(moyenne=Avg('note'))['moyenne'],
            },
            'quiz': {
                'total': Quiz.objects.filter(tenant_id=tenant_id).count(),
                'tentatives': TentativesQuiz.objects.filter(
                    tenant_id=tenant_id,
                ).count(),
                'moyenne_tentatives': TentativesQuiz.objects.filter(
                    tenant_id=tenant_id, statut='valide',
                ).aggregate(moyenne=Avg('note_totale'))['moyenne'],
            },
        })


class StatistiquesConsolideesView(APIView):
    """GET /v1/statistiques/consolidees/ : regroupement par matière."""

    def get(self, request):
        tenant_id = request.tenant_id

        cours_par_matiere = (
            Cours.objects.filter(tenant_id=tenant_id)
            .values('matiere_id')
            .annotate(nb_cours=Count('id'))
        )
        devoirs_par_matiere = (
            Devoirs.objects.filter(tenant_id=tenant_id)
            .values('matiere_id')
            .annotate(nb_devoirs=Count('id'))
        )
        moyenne_soumissions = (
            Soumissions.objects.filter(
                tenant_id=tenant_id, note__isnull=False,
            ).values('devoir__matiere_id')
            .annotate(moyenne=Avg('note'))
        )
        tentatives_par_matiere = (
            TentativesQuiz.objects.filter(tenant_id=tenant_id)
            .values('quiz__matiere_id')
            .annotate(nb_tentatives=Count('id'),
                      moyenne_quiz=Avg('note_totale'))
        )

        # Fusion des agrégats par matière en une seule ligne lisible.
        matieres = {}
        for ligne in cours_par_matiere:
            matieres.setdefault(ligne['matiere_id'], {})['nb_cours'] = \
                ligne['nb_cours']
        for ligne in devoirs_par_matiere:
            matieres.setdefault(ligne['matiere_id'], {})['nb_devoirs'] = \
                ligne['nb_devoirs']
        for ligne in moyenne_soumissions:
            matieres.setdefault(
                ligne['devoir__matiere_id'], {},
            )['moyenne_devoirs'] = ligne['moyenne']
        for ligne in tentatives_par_matiere:
            entree = matieres.setdefault(ligne['quiz__matiere_id'], {})
            entree['nb_tentatives_quiz'] = ligne['nb_tentatives']
            entree['moyenne_quiz'] = ligne['moyenne_quiz']

        return Response({
            'matieres': [
                {'matiere_id': str(matiere_id), **donnees}
                for matiere_id, donnees in sorted(matieres.items())
            ],
        })
