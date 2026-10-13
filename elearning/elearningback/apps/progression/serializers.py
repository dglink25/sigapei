"""Sérialiseurs de l'application Progression."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.progression.models import ProgressionEtapes


class ProgressionEtapeSerializer(TenantSerializerMixin,
                                 serializers.ModelSerializer):
    """Progression d'un apprenant sur une étape.

    En écriture (POST /v1/progressions/) : `etape` est l'UUID de l'étape
    et `apprenant_id` est requis ; `soumis_par` est facultatif (parent
    agissant au nom de l'enfant — programme béninois).
    """
    etape = serializers.UUIDField(write_only=True)
    etape_detail = serializers.SerializerMethodField()
    parcours_uuid = serializers.UUIDField(
        source='etape.parcours.uuid', read_only=True,
    )

    class Meta:
        model = ProgressionEtapes
        fields = [
            'uuid', 'etape', 'etape_detail', 'parcours_uuid',
            'apprenant_id', 'soumis_par', 'est_terminee', 'date_terminee',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'uuid', 'est_terminee', 'date_terminee', 'created_at',
            'updated_at',
        ]

    def get_etape_detail(self, progression):
        """Restitution compacte de l'étape suivie."""
        etape = progression.etape
        return {
            'uuid': str(etape.uuid),
            'ordre': etape.ordre,
            'titre': etape.contenu_titre,
            'type_contenu': etape.type_contenu,
        }
