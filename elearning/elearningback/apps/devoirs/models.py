"""Modèles de l'application Devoirs.

`apprenant_id`, `soumis_par`, `classe_id`, `matiere_id` sont des UUID
externes (scolarite.apprenants, rh.personnel, evaluations.matieres) :
jamais dupliqués localement (règle 4).
"""
from django.db import models

from apps.core.choices import PolitiqueRetard
from apps.core.models import BaseModel
from apps.cours.models import Cours
from apps.medias.models import Medias


class Devoirs(BaseModel):
    """Devoir donné à une classe pour une matière."""
    cours = models.ForeignKey(
        Cours, on_delete=models.SET_NULL, related_name='devoirs',
        null=True, blank=True,
    )
    matiere_id = models.UUIDField('Matière (externe)', db_index=True)
    classe_id = models.UUIDField('Classe (externe)', db_index=True)
    titre = models.CharField('Titre', max_length=255)
    enonce = models.TextField('Énoncé')
    date_limite = models.DateTimeField('Date limite')
    note_max = models.DecimalField(
        'Note maximale', max_digits=6, decimal_places=2, default=20,
    )
    politique_retard = models.CharField(
        'Politique en cas de retard', max_length=20,
        choices=PolitiqueRetard.choices, default=PolitiqueRetard.PENALITE,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'devoirs'
        verbose_name = 'Devoir'
        verbose_name_plural = 'Devoirs'
        ordering = ['-date_limite']

    def __str__(self):
        return self.titre


class Soumissions(BaseModel):
    """Dépôt d'un apprenant pour un devoir — unique par (devoir, apprenant)."""
    devoir = models.ForeignKey(
        Devoirs, on_delete=models.CASCADE, related_name='soumissions',
    )
    apprenant_id = models.UUIDField('Apprenant (externe)', db_index=True)
    soumis_par = models.UUIDField(
        'Déposé par (externe : apprenant ou parent)',
    )
    date_depot = models.DateTimeField('Déposé le', auto_now_add=True)
    en_retard = models.BooleanField('En retard', default=False)
    note = models.DecimalField(
        'Note attribuée', max_digits=6, decimal_places=2, null=True, blank=True,
    )
    commentaire = models.TextField(
        'Commentaire enseignant', blank=True, default='',
    )
    note_reportee = models.BooleanField(
        'Note reportée vers evaluations.notes', default=False,
    )
    evaluation_note_id = models.UUIDField(
        'Note Evaluations (externe)', null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'soumissions'
        verbose_name = 'Soumission'
        verbose_name_plural = 'Soumissions'
        ordering = ['-date_depot']
        constraints = [
            models.UniqueConstraint(
                fields=['devoir', 'apprenant_id'], name='uniq_soumission',
            ),
        ]

    def __str__(self):
        return f'Soumission {self.apprenant_id} / {self.devoir_id}'


class SoumissionFichiers(BaseModel):
    """Pièce jointe d'une soumission (média déjà uploadé côté client)."""
    soumission = models.ForeignKey(
        Soumissions, on_delete=models.CASCADE, related_name='fichiers',
    )
    media = models.ForeignKey(
        Medias, on_delete=models.CASCADE, related_name='soumission_fichiers',
    )

    class Meta:
        db_table = 'soumission_fichiers'
        verbose_name = 'Fichier de soumission'
        verbose_name_plural = 'Fichiers de soumission'
        constraints = [
            models.UniqueConstraint(
                fields=['soumission', 'media'], name='uniq_fichier_soumission',
            ),
        ]

    def __str__(self):
        return f'Fichier {self.media_id} / soumission {self.soumission_id}'
