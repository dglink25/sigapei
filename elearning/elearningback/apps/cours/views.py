"""Vues de l'application Cours."""
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.choices import StatutContenu
from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import EnseignantAffectePermission
from apps.cours.models import Cours, Lecons
from apps.cours.serializers import CoursSerializer, LeconSerializer


class CoursViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des cours.

    - Exposition par `uuid` uniquement (jamais la clé primaire `id`).
    - Filtres liste : `?matiere_id=`, `?classe_id=`, `?statut=`.
    - Suppression logique : `DELETE` est refusé, utiliser l'action
      `archiver/` ; le détail inclut les leçons imbriquées.
    """
    queryset = Cours.objects.all()
    serializer_class = CoursSerializer
    lookup_field = 'uuid'
    permission_classes = [EnseignantAffectePermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        matiere_id = params.get('matiere_id')
        if matiere_id:
            queryset = queryset.filter(matiere_id=matiere_id)

        classe_id = params.get('classe_id')
        if classe_id:
            queryset = queryset.filter(cours_classes__classe_id=classe_id)

        statut = params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        return queryset.distinct()

    def destroy(self, request, *args, **kwargs):
        """Règle 3 : aucun cours n'est supprimé physiquement."""
        return Response(
            {'detail': 'Suppression physique interdite : utiliser '
                       "l'action archiver (POST /v1/cours/{uuid}/archiver/)."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'])
    def archiver(self, request, uuid=None):
        """POST /v1/cours/{uuid}/archiver/ : passage au statut `archive`."""
        cours = self.get_object()
        cours.statut = StatutContenu.ARCHIVE
        cours.save(update_fields=['statut', 'updated_at', 'date_publication'])
        return Response(self.get_serializer(cours).data)

    @action(detail=True, methods=['post'])
    def lecons(self, request, uuid=None):
        """POST /v1/cours/{uuid}/lecons/

        Deux usages :
        - Ajout d'une leçon : corps = champs de la leçon (titre, type_contenu,
          contenu_texte, media, ordre facultatif - auto si absent).
        - Réordonnancement : corps = {"reordonner": [{"uuid": ..., "ordre": 2}, ...]}
        """
        cours = self.get_object()

        if 'reordonner' in request.data:
            return self._reordonner(cours, request.data['reordonner'])
        return self._ajouter_lecon(cours, request.data)

    def _ajouter_lecon(self, cours, donnees):
        serializer = LeconSerializer(data=donnees,
                                      context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        if 'ordre' not in donnees:
            derniere = cours.lecons.order_by('-ordre').values_list(
                'ordre', flat=True).first()
            serializer.validated_data['ordre'] = (derniere or 0) + 1
        lecon = serializer.save(cours=cours)
        return Response(LeconSerializer(lecon).data,
                        status=status.HTTP_201_CREATED)

    def _reordonner(self, cours, reordonnements):
        if not isinstance(reordonnements, list):
            raise ValidationError(
                {'reordonner': 'Doit être une liste '
                               '[{"uuid": "...", "ordre": N}, ...].'}
            )
        with transaction.atomic():
            for element in reordonnements:
                lecon = cours.lecons.filter(uuid=element.get('uuid')).first()
                if not lecon or 'ordre' not in element:
                    raise ValidationError(
                        {'reordonner': f"Entrée invalide : {element} "
                                       '(uuid de leçon et ordre requis).'}
                    )
                lecon.ordre = element['ordre']
                lecon.save(update_fields=['ordre', 'updated_at'])
        lecons = cours.lecons.all()
        return Response(LeconSerializer(lecons, many=True).data)
