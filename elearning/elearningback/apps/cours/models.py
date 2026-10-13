"""Modèles de l'application Cours.

`matiere_id` et `enseignant_id` sont des UUID externes (schémas
`evaluations.matieres` et `rh.personnel`) : jamais dupliqués localement.
"""
from django.db import models
from django.utils import timezone

from apps.core.choices import StatutContenu, TypeContenuLecon
from apps.core.models import BaseModel
from apps.medias.models import Medias


class Cours(BaseModel):
    """Cours — suppression logique uniquement (statut `archive`)."""
    STATUTS = StatutContenu.choices

    matiere_id = models.UUIDField('Matière (externe)', db_index=True)
    enseignant_id = models.UUIDField('Enseignant (externe)', db_index=True)
    titre = models.CharField('Titre', max_length=255)
    description = models.TextField('Description', blank=True, default='')
    coefficient = models.DecimalField(
        'Coefficient', max_digits=5, decimal_places=2, null=True, blank=True,
    )
    volume_horaire = models.DecimalField(
        'Volume horaire (heures)', max_digits=6, decimal_places=2,
        null=True, blank=True,
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=STATUTS,
        default=StatutContenu.BROUILLON, db_index=True,
    )
    date_publication = models.DateTimeField(
        'Publié le', null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'cours'
        verbose_name = 'Cours'
        verbose_name_plural = 'Cours'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # La date de publication est horodatée au premier passage à `publie`.
        if self.statut == StatutContenu.PUBLIE and not self.date_publication:
            self.date_publication = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class CoursClasses(BaseModel):
    """Table de liaison cours <-> classe (classe externe `scolarite.classes`)."""
    cours = models.ForeignKey(
        Cours, on_delete=models.CASCADE, related_name='cours_classes',
    )
    classe_id = models.UUIDField('Classe (externe)', db_index=True)

    class Meta:
        db_table = 'cours_classes'
        verbose_name = 'Affectation cours-classe'
        verbose_name_plural = 'Affectations cours-classe'
        constraints = [
            models.UniqueConstraint(
                fields=['cours', 'classe_id'], name='uniq_cours_classes',
            ),
        ]

    def __str__(self):
        return f'Cours {self.cours_id} / classe {self.classe_id}'


class Lecons(BaseModel):
    """Leçon d'un cours — texte, document ou vidéo."""
    cours = models.ForeignKey(
        Cours, on_delete=models.CASCADE, related_name='lecons',
    )
    titre = models.CharField('Titre', max_length=255)
    ordre = models.PositiveIntegerField(
        "Ordre d'affichage", db_index=True,
    )
    type_contenu = models.CharField(
        'Type de contenu', max_length=20, choices=TypeContenuLecon.choices,
        default=TypeContenuLecon.TEXTE,
    )
    contenu_texte = models.TextField('Contenu texte', blank=True, default='')
    media = models.ForeignKey(
        Medias, on_delete=models.SET_NULL, related_name='lecons',
        null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'lecons'
        verbose_name = 'Leçon'
        verbose_name_plural = 'Leçons'
        ordering = ['ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['cours', 'ordre'], name='uniq_lecon_ordre',
            ),
        ]

    def __str__(self):
        return f'{self.ordre}. {self.titre}'
