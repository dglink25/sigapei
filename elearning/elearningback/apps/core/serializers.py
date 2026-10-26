"""Sérialiseurs du socle commun."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.core.models import ParametresModule


class ParametresModuleSerializer(TenantSerializerMixin,
                                  serializers.ModelSerializer):
    class Meta:
        model = ParametresModule
        fields = [
            'uuid', 'tentatives_multiples_defaut', 'restitution_defaut',
            'visibilite_parents', 'alertes_sms', 'recap_email',
            'notifications_push', 'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
