"""Sérialiseurs de l'application Devoirs."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.cours.models import Cours
from apps.devoirs.models import Devoirs, SoumissionFichiers, Soumissions
from apps.medias.models import Medias
from apps.medias.serializers import MediaRefSerializer


class FichierSoumissionSerializer(serializers.ModelSerializer):
    """Fichier attaché à une soumission (média en référence `uuid`)."""
    media = MediaRefSerializer(read_only=True)

    class Meta:
        model = SoumissionFichiers
        fields = ['uuid', 'media']


class SoumissionSerializer(TenantSerializerMixin,
                           serializers.ModelSerializer):
    """Soumission.

    En écriture, `fichiers` est une liste d'UUID de médias (déjà uploadés
    via /v1/medias/) ; en lecture, chaque fichier est restitué en détail.
    """
    fichiers = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Medias.objects.all(), many=True,
        write_only=True, required=False,
    )
    fichiers_detail = FichierSoumissionSerializer(
        source='fichiers', many=True, read_only=True,
    )
    devoir_uuid = serializers.SlugRelatedField(
        slug_field='uuid', read_only=True, source='devoir',
    )

    class Meta:
        model = Soumissions
        fields = [
            'uuid', 'devoir_uuid', 'apprenant_id', 'soumis_par',
            'date_depot', 'en_retard', 'note', 'commentaire',
            'note_reportee', 'evaluation_note_id', 'fichiers',
            'fichiers_detail', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'uuid', 'date_depot', 'en_retard', 'note', 'note_reportee',
            'evaluation_note_id', 'created_at', 'updated_at',
        ]

    def create(self, validated_data):
        medias = validated_data.pop('fichiers', [])
        soumission = super().create(validated_data)
        SoumissionFichiers.objects.bulk_create([
            SoumissionFichiers(soumission=soumission, media=media,
                               tenant_id=soumission.tenant_id)
            for media in medias
        ])
        return soumission


class DevoirSerializer(TenantSerializerMixin,
                       serializers.ModelSerializer):
    nb_soumissions = serializers.SerializerMethodField()
    # Le cours lié est exposé par son `uuid` (jamais la clé primaire).
    cours = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Cours.objects.all(),
        required=False, allow_null=True,
    )

    class Meta:
        model = Devoirs
        fields = [
            'uuid', 'cours', 'matiere_id', 'classe_id', 'titre', 'enonce',
            'date_limite', 'note_max', 'politique_retard',
            'nb_soumissions', 'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']

    def get_nb_soumissions(self, devoir):
        return devoir.soumissions.count()
