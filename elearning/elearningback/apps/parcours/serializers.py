"""Sérialiseurs de l'application Parcours."""
from rest_framework import serializers

from apps.core.mixins import TenantSerializerMixin
from apps.cours.models import Cours
from apps.parcours.models import EtapesParcours, Parcours, ParcoursClasses
from apps.quiz.models import Quiz


class EtapeSerializer(TenantSerializerMixin,
                      serializers.ModelSerializer):
    """Étape - le contenu (cours ou quiz) est référencé par son `uuid`."""
    # Facultatif : si le client n'en fournit pas, la vue attribue
    # automatiquement le dernier ordre du parcours + 1 (voir views.py).
    ordre = serializers.IntegerField(required=False)
    cours = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Cours.objects.all(),
        required=False, allow_null=True,
    )
    quiz = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Quiz.objects.all(),
        required=False, allow_null=True,
    )
    contenu = serializers.SerializerMethodField()

    class Meta:
        model = EtapesParcours
        fields = [
            'uuid', 'titre', 'ordre', 'cours', 'quiz', 'contenu',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']

    def validate(self, donnees):
        """Une étape référence exactement un contenu : cours OU quiz."""
        cours = donnees.get('cours')
        quiz = donnees.get('quiz')
        if self.partial and self.instance:
            cours = cours if 'cours' in donnees else self.instance.cours
            quiz = quiz if 'quiz' in donnees else self.instance.quiz
        if bool(cours) == bool(quiz):
            raise serializers.ValidationError(
                'Une étape référence exactement un contenu : '
                'fournir `cours` OU `quiz` (jamais les deux, jamais aucun).'
            )
        return donnees

    def get_contenu(self, etape):
        """Restitution compacte du contenu : type + uuid + titre."""
        if etape.cours_id:
            return {'type': 'cours', 'uuid': etape.cours.uuid,
                    'titre': etape.cours.titre}
        return {'type': 'quiz', 'uuid': etape.quiz.uuid,
                'titre': etape.quiz.titre}


class ParcoursSerializer(TenantSerializerMixin,
                         serializers.ModelSerializer):
    """Parcours.

    En écriture, `classes` est une liste d'UUID externes de classes
    (scolarite.classes) : les affectations parcours-classes sont
    synchronisées. En lecture, `classes_liees` restitue ces UUID.
    """
    classes = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False,
    )
    classes_liees = serializers.SerializerMethodField()
    nb_etapes = serializers.SerializerMethodField()

    class Meta:
        model = Parcours
        fields = [
            'uuid', 'titre', 'description', 'matiere_id', 'enseignant_id',
            'statut', 'date_publication', 'classes', 'classes_liees',
            'nb_etapes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'date_publication', 'created_at',
                            'updated_at']

    def get_classes_liees(self, parcours):
        return [
            liaison.classe_id for liaison in parcours.parcours_classes.all()
        ]

    def get_nb_etapes(self, parcours):
        return parcours.etapes.count()

    def _synchroniser_classes(self, parcours, uuids_classes):
        """Remplace les affectations parcours-classes par la liste fournie."""
        if uuids_classes is None:
            return  # Champ absent : on ne touche à rien.
        ParcoursClasses.objects.filter(parcours=parcours).delete()
        ParcoursClasses.objects.bulk_create([
            ParcoursClasses(parcours=parcours, classe_id=classe_id,
                            tenant_id=parcours.tenant_id)
            for classe_id in uuids_classes
        ])

    def create(self, validated_data):
        uuids_classes = validated_data.pop('classes', None)
        parcours = super().create(validated_data)
        self._synchroniser_classes(parcours, uuids_classes)
        return parcours

    def update(self, instance, validated_data):
        uuids_classes = validated_data.pop('classes', None)
        parcours = super().update(instance, validated_data)
        self._synchroniser_classes(parcours, uuids_classes)
        return parcours


class ParcoursDetailSerializer(ParcoursSerializer):
    """Parcours - version détail avec les étapes ordonnées imbriquées."""
    etapes = EtapeSerializer(many=True, read_only=True)

    class Meta(ParcoursSerializer.Meta):
        fields = ParcoursSerializer.Meta.fields + ['etapes']
