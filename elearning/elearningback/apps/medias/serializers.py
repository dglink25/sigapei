"""Sérialiseurs de l'application Médias."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.medias.models import Medias


class MediaRefSerializer(serializers.ModelSerializer):
    """Version compacte d'un média, utilisée dans les réponses imbriquées."""

    class Meta:
        model = Medias
        fields = ['uuid', 'type', 'nom_fichier', 'url_cloudinary',
                  'chemin_stockage']


class MediasSerializer(TenantSerializerMixin,
                       serializers.ModelSerializer):
    class Meta:
        model = Medias
        fields = [
            'uuid', 'type', 'nom_fichier', 'url_cloudinary',
            'public_id_cloudinary', 'chemin_stockage', 'created_at',
        ]
        read_only_fields = ['uuid', 'created_at']
