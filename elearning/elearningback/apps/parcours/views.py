"""Vues de l'application Parcours."""
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.choices import StatutContenu
from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import (
    EnseignantAffectePermission,
    LectureTousEcritureEnseignant,
)
from apps.parcours.models import Parcours
from apps.parcours.serializers import (
    EtapeSerializer,
    ParcoursDetailSerializer,
    ParcoursSerializer,
)
from apps.progression.services import construire_progression


class ParcoursViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des parcours pédagogiques.

    - Exposition par `uuid` uniquement (jamais la clé primaire `id`).
    - Filtres liste : `?matiere_id=`, `?classe_id=`, `?statut=`.
    - Suppression logique : `DELETE` est refusé, utiliser l'action
      `archiver/` ; le détail inclut les étapes ordonnées.
    - GET .../progression/?apprenant_id= : avancement d'un apprenant.
    """
    queryset = Parcours.objects.all()
    lookup_field = 'uuid'
    permission_classes = [LectureTousEcritureEnseignant,
                          EnseignantAffectePermission]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ParcoursDetailSerializer
        return ParcoursSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        matiere_id = params.get('matiere_id')
        if matiere_id:
            queryset = queryset.filter(matiere_id=matiere_id)

        classe_id = params.get('classe_id')
        if classe_id:
            queryset = queryset.filter(parcours_classes__classe_id=classe_id)

        statut = params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        return queryset.distinct()

    def destroy(self, request, *args, **kwargs):
        """Règle 3 : aucun parcours n'est supprimé physiquement."""
        return Response(
            {'detail': 'Suppression physique interdite : utiliser '
                       "l'action archiver (POST /v1/parcours/{uuid}/archiver/)."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'])
    def archiver(self, request, uuid=None):
        """POST /v1/parcours/{uuid}/archiver/ : passage au statut `archive`."""
        parcours = self.get_object()
        parcours.statut = StatutContenu.ARCHIVE
        parcours.save(
            update_fields=['statut', 'updated_at', 'date_publication'],
        )
        return Response(self.get_serializer(parcours).data)

    @action(detail=True, methods=['post'])
    def etapes(self, request, uuid=None):
        """POST /v1/parcours/{uuid}/etapes/

        Deux usages :
        - Ajout d'une étape : corps = champs de l'étape (titre facultatif,
          `cours` OU `quiz`, ordre facultatif - auto si absent).
        - Réordonnancement : corps = {"reordonner": [{"uuid": ..., "ordre": 2}, ...]}
        """
        parcours = self.get_object()

        if 'reordonner' in request.data:
            return self._reordonner(parcours, request.data['reordonner'])
        return self._ajouter_etape(parcours, request.data)

    def _ajouter_etape(self, parcours, donnees):
        serializer = EtapeSerializer(data=donnees,
                                     context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        if 'ordre' not in donnees:
            derniere = parcours.etapes.order_by('-ordre').values_list(
                'ordre', flat=True,
            ).first()
            serializer.validated_data['ordre'] = (derniere or 0) + 1
        etape = serializer.save(parcours=parcours)
        return Response(EtapeSerializer(etape).data,
                        status=status.HTTP_201_CREATED)

    def _reordonner(self, parcours, reordonnements):
        if not isinstance(reordonnements, list):
            raise ValidationError(
                {'reordonner': 'Doit être une liste '
                               '[{"uuid": "...", "ordre": N}, ...].'}
            )
        with transaction.atomic():
            for element in reordonnements:
                etape = parcours.etapes.filter(
                    uuid=element.get('uuid'),
                ).first()
                if not etape or 'ordre' not in element:
                    raise ValidationError(
                        {'reordonner': f"Entrée invalide : {element} "
                                       "(uuid d'étape et ordre requis)."}
                    )
                etape.ordre = element['ordre']
                etape.save(update_fields=['ordre', 'updated_at'])
        etapes = parcours.etapes.all()
        return Response(EtapeSerializer(etapes, many=True).data)

    @action(detail=True, methods=['get'])
    def progression(self, request, uuid=None):
        """GET /v1/parcours/{uuid}/progression/?apprenant_id=

        Avancement d'un apprenant : étapes terminées, nombre et
        pourcentage d'avancement (calculés à la lecture).
        """
        parcours = self.get_object()
        apprenant_id = request.query_params.get('apprenant_id')
        if not apprenant_id:
            raise ValidationError({'apprenant_id': 'Paramètre requis.'})
        return Response(construire_progression(parcours, apprenant_id))
