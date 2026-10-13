"""Modèles de l'application Parcours.

`matiere_id`, `enseignant_id` et `classe_id` sont des UUID externes
(schémas `evaluations.matieres`, `rh.personnel`, `scolarite.classes`) :
jamais dupliqués localement (règle 4).

Un parcours est une séquence ordonnée d'étapes ; chaque étape référence
exactement un contenu local : un cours ou un quiz (contrainte en base).
"""
from django.db import models
from django.utils import timezone

from apps.core.choices import StatutContenu
from apps.core.models import BaseModel


class Parcours(BaseModel):
    """Parcours — suppression logique uniquement (statut `archive`)."""
    STATUTS = StatutContenu.choices

    titre = models.CharField('Titre', max_length=255)
    description = models.TextField('Description', blank=True, default='')
    matiere_id = models.UUIDField('Matière (externe)', db_index=True)
    enseignant_id = models.UUIDField('Enseignant (externe)', db_index=True)
    statut = models.CharField(
        'Statut', max_length=20, choices=STATUTS,
        default=StatutContenu.BROUILLON, db_index=True,
    )
    date_publication = models.DateTimeField(
        'Publié le', null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'parcours'
        verbose_name = 'Parcours'
        verbose_name_plural = 'Parcours'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # La date de publication est horodatée au premier passage à `publie`.
        if self.statut == StatutContenu.PUBLIE and not self.date_publication:
            self.date_publication = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class ParcoursClasses(BaseModel):
    """Table de liaison parcours <-> classe (classe externe `scolarite.classes`)."""
    parcours = models.ForeignKey(
        Parcours, on_delete=models.CASCADE, related_name='parcours_classes',
    )
    classe_id = models.UUIDField('Classe (externe)', db_index=True)

    class Meta:
        db_table = 'parcours_classes'
        verbose_name = 'Affectation parcours-classe'
        verbose_name_plural = 'Affectations parcours-classe'
        constraints = [
            models.UniqueConstraint(
                fields=['parcours', 'classe_id'], name='uniq_parcours_classes',
            ),
        ]

    def __str__(self):
        return f'Parcours {self.parcours_id} / classe {self.classe_id}'


class EtapesParcours(BaseModel):
    """Étape ordonnée d'un parcours — exactement un contenu (cours ou quiz).

    Le titre est facultatif : à la restitution, le titre du contenu
    référencé est utilisé par défaut.
    """
    parcours = models.ForeignKey(
        Parcours, on_delete=models.CASCADE, related_name='etapes',
    )
    titre = models.CharField('Titre', max_length=255, blank=True, default='')
    ordre = models.PositiveIntegerField(
        "Ordre d'affichage", db_index=True,
    )
    cours = models.ForeignKey(
        'cours.Cours', on_delete=models.CASCADE,
        related_name='etapes_parcours', null=True, blank=True,
    )
    quiz = models.ForeignKey(
        'quiz.Quiz', on_delete=models.CASCADE,
        related_name='etapes_parcours', null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'etapes_parcours'
        verbose_name = 'Étape de parcours'
        verbose_name_plural = 'Étapes de parcours'
        ordering = ['ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['parcours', 'ordre'], name='uniq_etape_parcours_ordre',
            ),
            # Exactement un contenu par étape : cours OU quiz, jamais les
            # deux, jamais aucun.
            models.CheckConstraint(
                condition=(
                    models.Q(cours__isnull=False, quiz__isnull=True)
                    | models.Q(cours__isnull=True, quiz__isnull=False)
                ),
                name='chk_etape_un_contenu',
            ),
        ]

    @property
    def type_contenu(self):
        """`cours` ou `quiz` selon le contenu référencé."""
        return 'cours' if self.cours_id else 'quiz'

    @property
    def contenu_titre(self):
        """Titre du contenu référencé (celui de l'étape s'il est défini)."""
        if self.titre:
            return self.titre
        if self.cours_id:
            return self.cours.titre
        return self.quiz.titre

    def __str__(self):
        return f'{self.ordre}. {self.contenu_titre}'
