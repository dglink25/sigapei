"""Vues de l'application Progression."""
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.mixins import TenantViewSetMixin
from apps.parcours.models import EtapesParcours
from apps.progression.models import ProgressionEtapes
from apps.progression.serializers import ProgressionEtapeSerializer


class ProgressionsViewSet(TenantViewSetMixin,
                          mixins.CreateModelMixin,
                          mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          viewsets.GenericViewSet):
    """Suivi d'avancement des apprenants dans les parcours.

    - POST /v1/progressions/ : marque une étape terminée (idempotent) ;
      corps : {"etape": "<uuid>", "apprenant_id": "<uuid>",
               "soumis_par": "<uuid> facultatif"}.
    - GET /v1/progressions/ : filtres `?apprenant_id=` et `?parcours=`.
    - Aucune modification ni suppression : le DELETE/PATCH/PUT ne sont
      pas exposés — l'historique de progression est conservé.
    - Le résumé par parcours (% d'avancement) est exposé par
      GET /v1/parcours/{uuid}/progression/?apprenant_id=.
    """
    queryset = ProgressionEtapes.objects.select_related(
        'etape', 'etape__parcours', 'etape__cours', 'etape__quiz',
    )
    serializer_class = ProgressionEtapeSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if apprenant_id := params.get('apprenant_id'):
            queryset = queryset.filter(apprenant_id=apprenant_id)
        if parcours := params.get('parcours'):
            queryset = queryset.filter(etape__parcours__uuid=parcours)
        return queryset

    def create(self, request, *args, **kwargs):
        """Marque une étape terminée pour un apprenant (idempotent).

        L'étape est résolue dans le tenant courant : une étape d'un
        autre établissement est refusée.
        """
        apprenant_id = request.data.get('apprenant_id')
        if not apprenant_id:
            raise ValidationError({'apprenant_id': 'Requis.'})
        etape = EtapesParcours.objects.filter(
            tenant_id=request.tenant_id, uuid=request.data.get('etape'),
        ).first()
        if etape is None:
            raise ValidationError(
                {'etape': 'Étape inconnue pour ce tenant.'}
            )
        progression, _ = ProgressionEtapes.objects.update_or_create(
            etape=etape, apprenant_id=apprenant_id,
            defaults={
                'soumis_par': request.data.get('soumis_par'),
                'est_terminee': True,
                'date_terminee': timezone.now(),
                'tenant_id': request.tenant_id,
            },
        )
        return Response(
            ProgressionEtapeSerializer(progression).data,
            status=status.HTTP_201_CREATED,
        )
