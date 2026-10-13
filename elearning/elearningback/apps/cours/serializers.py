"""Sérialiseurs de l'application Cours."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.cours.models import Cours, CoursClasses, Lecons
from apps.medias.models import Medias
from apps.medias.serializers import MediaRefSerializer


class LeconSerializer(TenantSerializerMixin,
                      serializers.ModelSerializer):
    """Leçon — le média est référencé par son `uuid`."""
    # Facultatif : si le client n'en fournit pas, la vue attribue
    # automatiquement le dernier ordre du cours + 1 (voir views.py).
    ordre = serializers.IntegerField(required=False)
    media = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Medias.objects.all(),
        required=False, allow_null=True,
    )
    media_detail = MediaRefSerializer(source='media', read_only=True)

    class Meta:
        model = Lecons
        fields = [
            'uuid', 'titre', 'ordre', 'type_contenu', 'contenu_texte',
            'media', 'media_detail', 'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']


class CoursSerializer(TenantSerializerMixin,
                      serializers.ModelSerializer):
    """Cours.

    En écriture, `classes` est une liste d'UUID externes de classes
    (scolarite.classes) : les affectations cours-classes sont synchronisées.
    En lecture, `classes_liees` restitue ces UUID et `lecons` imbrique
    les leçons du cours.
    """
    classes = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False,
    )
    classes_liees = serializers.SerializerMethodField()
    lecons = LeconSerializer(many=True, read_only=True)

    class Meta:
        model = Cours
        fields = [
            'uuid', 'matiere_id', 'enseignant_id', 'titre', 'description',
            'coefficient', 'volume_horaire',
            'statut', 'date_publication', 'classes', 'classes_liees',
            'lecons', 'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'date_publication', 'created_at',
                            'updated_at']

    def get_classes_liees(self, cours):
        return [liaison.classe_id for liaison in cours.cours_classes.all()]

    def _synchroniser_classes(self, cours, uuids_classes):
        """Remplace les affectations cours-classes par la liste fournie."""
        if uuids_classes is None:
            return  # Champ absent : on ne touche à rien.
        CoursClasses.objects.filter(cours=cours).delete()
        CoursClasses.objects.bulk_create([
            CoursClasses(cours=cours, classe_id=classe_id,
                         tenant_id=cours.tenant_id)
            for classe_id in uuids_classes
        ])

    def create(self, validated_data):
        uuids_classes = validated_data.pop('classes', None)
        cours = super().create(validated_data)
        self._synchroniser_classes(cours, uuids_classes)
        return cours

    def update(self, instance, validated_data):
        uuids_classes = validated_data.pop('classes', None)
        cours = super().update(instance, validated_data)
        self._synchroniser_classes(cours, uuids_classes)
        return cours
