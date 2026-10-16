"""Sérialiseurs de l'application Bibliothèque."""
from rest_framework import serializers

from apps.bibliotheque.models import RessourcesBibliotheque
from apps.core.mixins import TenantSerializerMixin
from apps.medias.models import Medias
from apps.medias.serializers import MediaRefSerializer


class RessourcesBibliothequeSerializer(TenantSerializerMixin,
                                        serializers.ModelSerializer):
    """Ressource - le média est référencé par son `uuid`."""
    media = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Medias.objects.all(),
    )
    media_detail = MediaRefSerializer(source='media', read_only=True)

    class Meta:
        model = RessourcesBibliotheque
        fields = [
            'uuid', 'titre', 'matiere_id', 'classe_id', 'enseignant_id',
            'media', 'media_detail', 'mots_cles', 'date_depot', 'created_at',
        ]
        read_only_fields = ['uuid', 'date_depot', 'created_at']
