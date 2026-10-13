"""Modèles de l'application Quiz.

`matiere_id`, `classe_id`, `apprenant_id`, `soumis_par` sont des UUID
externes (evaluations.matieres, scolarite.classes, scolarite.apprenants,
rh.personnel) : jamais dupliqués localement (règle 4).
"""
from django.db import models

from apps.core.choices import (
    Restitution,
    StatutContenu,
    StatutTentative,
    TypeQuestion,
)
from apps.core.models import BaseModel


class Quiz(BaseModel):
    """Quiz — suppression logique comme les cours (statut `archive`)."""
    STATUTS = StatutContenu.choices

    matiere_id = models.UUIDField('Matière (externe)', db_index=True)
    classe_id = models.UUIDField('Classe (externe)', db_index=True)
    titre = models.CharField('Titre', max_length=255)
    # `null` = tentatives illimitées (quiz d'entraînement).
    tentatives_max = models.PositiveIntegerField(
        'Nombre maximal de tentatives', default=1, null=True, blank=True,
    )
    chrono_secondes = models.PositiveIntegerField(
        'Durée du chrono (secondes)', null=True, blank=True,
    )
    date_limite = models.DateTimeField(
        'Date limite de passage', null=True, blank=True,
    )
    restitution = models.CharField(
        'Restitution des résultats', max_length=20, choices=Restitution.choices,
        default=Restitution.IMMEDIATE,
    )
    seuil_validation = models.DecimalField(
        'Seuil de validation (note /20)', max_digits=5, decimal_places=2,
        null=True, blank=True,
    )
    ordre_aleatoire_questions = models.BooleanField(
        'Ordre des questions aléatoire', default=False,
    )
    melanger_options = models.BooleanField(
        'Mélanger les options de réponse', default=False,
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=STATUTS,
        default=StatutContenu.BROUILLON, db_index=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'quiz'
        verbose_name = 'Quiz'
        verbose_name_plural = 'Quiz'
        ordering = ['-created_at']

    def __str__(self):
        return self.titre


class Questions(BaseModel):
    """Question d'un quiz (QCM, vrai/faux ou ouverte)."""

    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name='questions',
    )
    type = models.CharField(
        'Type', max_length=20, choices=TypeQuestion.choices,
    )
    enonce = models.TextField('Énoncé')
    reponse_reference = models.TextField(
        'Réponse de référence (correction IA)', blank=True, default='',
    )
    bareme = models.DecimalField(
        'Barème', max_digits=6, decimal_places=2, default=1,
    )
    ordre = models.PositiveIntegerField('Ordre', db_index=True)

    class Meta:
        db_table = 'questions'
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        ordering = ['ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['quiz', 'ordre'], name='uniq_question_ordre',
            ),
        ]

    def __str__(self):
        return f'{self.ordre}. {self.enonce[:50]}'


class OptionsQuestion(BaseModel):
    """Option de réponse d'une question (QCM, vrai/faux)."""
    question = models.ForeignKey(
        Questions, on_delete=models.CASCADE, related_name='options',
    )
    libelle = models.CharField('Libellé', max_length=500)
    est_correcte = models.BooleanField('Réponse correcte', default=False)
    ordre = models.PositiveIntegerField('Ordre', db_index=True)

    class Meta:
        db_table = 'options_question'
        verbose_name = 'Option de question'
        verbose_name_plural = 'Options de question'
        ordering = ['ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'ordre'], name='uniq_option_ordre',
            ),
        ]

    def __str__(self):
        return self.libelle


class TentativesQuiz(BaseModel):
    """Tentative d'un apprenant — numérotée, au plus `tentatives_max`."""
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name='tentatives',
    )
    apprenant_id = models.UUIDField('Apprenant (externe)', db_index=True)
    soumis_par = models.UUIDField(
        'Déposé par (externe : apprenant ou parent)', null=True, blank=True,
    )
    numero = models.PositiveIntegerField('Numéro de tentative')
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutTentative.choices,
        default=StatutTentative.EN_COURS, db_index=True,
    )
    note_totale = models.DecimalField(
        'Note totale', max_digits=7, decimal_places=2, null=True, blank=True,
    )
    evaluation_note_id = models.UUIDField(
        'Note Evaluations (externe)', null=True, blank=True,
    )
    date_debut = models.DateTimeField('Commencée le', auto_now_add=True)
    date_soumission = models.DateTimeField('Soumise le', null=True, blank=True)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'tentatives_quiz'
        verbose_name = 'Tentative de quiz'
        verbose_name_plural = 'Tentatives de quiz'
        ordering = ['-date_debut']
        constraints = [
            models.UniqueConstraint(
                fields=['quiz', 'apprenant_id', 'numero'],
                name='uniq_tentative_numero',
            ),
        ]

    def __str__(self):
        return f'Tentative {self.numero} — quiz {self.quiz_id}'


class ReponsesApprenant(BaseModel):
    """Réponse d'un apprenant à une question, au sein d'une tentative."""
    tentative = models.ForeignKey(
        TentativesQuiz, on_delete=models.CASCADE, related_name='reponses',
    )
    question = models.ForeignKey(
        Questions, on_delete=models.CASCADE, related_name='reponses',
    )
    reponse_donnee = models.TextField('Réponse donnée', blank=True, default='')
    note_ia = models.DecimalField(
        "Note proposée par l'IA", max_digits=6, decimal_places=2,
        null=True, blank=True,
    )
    note_finale = models.DecimalField(
        'Note finale (validée enseignant)', max_digits=6, decimal_places=2,
        null=True, blank=True,
    )
    validee_par_enseignant = models.BooleanField(
        "Validée par l'enseignant", default=False,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'reponses_apprenant'
        verbose_name = 'Réponse d\'apprenant'
        verbose_name_plural = 'Réponses d\'apprenant'
        ordering = ['question__ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['tentative', 'question'], name='uniq_reponse',
            ),
        ]

    def __str__(self):
        return f'Réponse {self.question_id} / tentative {self.tentative_id}'
