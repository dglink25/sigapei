"""Vues de l'application Bibliothèque."""
from rest_framework import viewsets

from apps.bibliotheque.models import RessourcesBibliotheque
from apps.bibliotheque.serializers import RessourcesBibliothequeSerializer
from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import EnseignantAffectePermission


class RessourcesViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des ressources de bibliothèque.

    Filtres liste : `?matiere_id=`, `?classe_id=`, `?enseignant_id=`,
    `?mot_cle=` (la ressource doit contenir ce mot-clé).
    """
    queryset = RessourcesBibliotheque.objects.select_related('media')
    serializer_class = RessourcesBibliothequeSerializer
    lookup_field = 'uuid'
    permission_classes = [EnseignantAffectePermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if matiere_id := params.get('matiere_id'):
            queryset = queryset.filter(matiere_id=matiere_id)
        if classe_id := params.get('classe_id'):
            queryset = queryset.filter(classe_id=classe_id)
        if enseignant_id := params.get('enseignant_id'):
            queryset = queryset.filter(enseignant_id=enseignant_id)
        if mot := params.get('mot_cle'):
            # Contient-elle ce mot-clé ? Filtre portable : le JSON est
            # comparé tel quel (SQLite le stocke en texte, PostgreSQL en
            # jsonb - le lookup `contains` fonctionne sur les deux).
            queryset = queryset.filter(mots_cles__contains=[mot])
        return queryset
