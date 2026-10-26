"""Sérialiseurs de l'application Quiz.

Deux familles de questions :
- `QuestionPassageSerializer` : ce que voit l'apprenant pendant le quiz
  (sans les réponses correctes ni la réponse de référence).
- `QuestionRestitutionSerializer` : ce que restitue l'enseignant/l'élève
  après soumission (avec corrections), selon le paramètre du quiz.
"""
from rest_framework import serializers

from apps.core.choices import TypeQuestion
from apps.core.mixins import TenantSerializerMixin
from apps.quiz.models import (
    OptionsQuestion,
    Questions,
    Quiz,
    ReponsesApprenant,
    TentativesQuiz,
)


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionsQuestion
        fields = ['uuid', 'libelle', 'est_correcte', 'ordre']


class QuestionPassageSerializer(serializers.ModelSerializer):
    """Question telle que présentée à l'apprenant (sans les réponses)."""
    options = serializers.SerializerMethodField()

    class Meta:
        model = Questions
        fields = ['uuid', 'type', 'enonce', 'bareme', 'ordre', 'options']

    def get_options(self, question):
        return [
            {'uuid': option.uuid, 'libelle': option.libelle,
             'ordre': option.ordre}
            for option in question.options.all()
        ]


class QuestionRestitutionSerializer(serializers.ModelSerializer):
    """Question restituée après soumission : corrections visibles."""
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Questions
        fields = ['uuid', 'type', 'enonce', 'bareme', 'ordre', 'options',
                  'reponse_reference']


class OptionCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionsQuestion
        fields = ['libelle', 'est_correcte', 'ordre']


class QuestionCreationSerializer(TenantSerializerMixin,
                                 serializers.ModelSerializer):
    """Création d'une question avec ses options (POST .../questions/)."""
    # Facultatif : une question ouverte n'a pas d'options. La validation
    # exige toujours au moins une option pour un QCM / vrai-faux.
    options = OptionCreationSerializer(many=True, write_only=True,
                                       required=False, default=list)
    # Facultatif : si le client n'en fournit pas, la vue attribue
    # automatiquement le dernier ordre du quiz + 1 (voir views.py).
    ordre = serializers.IntegerField(required=False)

    class Meta:
        model = Questions
        fields = ['uuid', 'type', 'enonce', 'reponse_reference', 'bareme',
                  'ordre', 'options']
        read_only_fields = ['uuid']

    def validate(self, donnees):
        type_question = donnees.get('type')
        options = donnees.get('options', [])
        if type_question in (TypeQuestion.QCM, TypeQuestion.VRAI_FAUX):
            if not options:
                raise serializers.ValidationError(
                    {'options': 'Un QCM / vrai-faux exige au moins une option.'}
                )
            if type_question == TypeQuestion.VRAI_FAUX and len(options) != 2:
                raise serializers.ValidationError(
                    {'options': 'Un vrai/faux a exactement deux options.'}
                )
            if not any(option['est_correcte'] for option in options):
                raise serializers.ValidationError(
                    {'options': 'Au moins une option doit être correcte.'}
                )
        return donnees

    def create(self, validated_data):
        options = validated_data.pop('options')
        question = super().create(validated_data)
        OptionsQuestion.objects.bulk_create([
            OptionsQuestion(
                question=question, tenant_id=question.tenant_id, **option
            )
            for option in options
        ])
        return question


class QuizSerializer(TenantSerializerMixin,
                     serializers.ModelSerializer):
    """Quiz - version liste (sans questions imbriquées)."""
    nb_questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['uuid', 'matiere_id', 'classe_id', 'titre',
                  'tentatives_max', 'chrono_secondes', 'date_limite',
                  'restitution', 'seuil_validation',
                  'ordre_aleatoire_questions', 'melanger_options',
                  'statut', 'nb_questions', 'created_at', 'updated_at']
        read_only_fields = ['uuid', 'created_at', 'updated_at']

    def get_nb_questions(self, quiz):
        return quiz.questions.count()


class QuizDetailSerializer(QuizSerializer):
    """Quiz - version détail avec questions et options imbriquées."""
    questions = QuestionRestitutionSerializer(many=True, read_only=True)

    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']


class ReponseSerializer(serializers.ModelSerializer):
    """Réponse d'un apprenant, restituée avec sa question."""
    question_uuid = serializers.UUIDField(source='question.uuid',
                                          read_only=True)
    enonce = serializers.CharField(source='question.enonce', read_only=True)
    bareme = serializers.DecimalField(source='question.bareme',
                                      max_digits=6, decimal_places=2,
                                      read_only=True)

    class Meta:
        model = ReponsesApprenant
        fields = ['uuid', 'question_uuid', 'enonce', 'bareme',
                  'reponse_donnee', 'note_ia', 'note_finale',
                  'validee_par_enseignant']


class TentativeSerializer(serializers.ModelSerializer):
    """Tentative - version sans les réponses (restitution différée)."""
    quiz_uuid = serializers.UUIDField(source='quiz.uuid', read_only=True)
    quiz_titre = serializers.CharField(source='quiz.titre', read_only=True)

    class Meta:
        model = TentativesQuiz
        fields = ['uuid', 'quiz_uuid', 'quiz_titre', 'apprenant_id',
                  'numero', 'statut', 'note_totale', 'date_debut',
                  'date_soumission', 'evaluation_note_id', 'created_at']


class TentativeDetailSerializer(TentativeSerializer):
    """Tentative - version détaillée avec réponses (restitution immédiate
    ou après validation)."""
    reponses = ReponseSerializer(many=True, read_only=True)

    class Meta(TentativeSerializer.Meta):
        fields = TentativeSerializer.Meta.fields + ['reponses']
