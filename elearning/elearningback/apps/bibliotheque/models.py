"""Modèles de l'application Bibliothèque.

`matiere_id`, `classe_id`, `enseignant_id` sont des UUID externes
(evaluations.matieres, scolarite.classes, rh.personnel) : jamais dupliqués
localement (règle 4).
"""
from django.db import models

from apps.core.models import BaseModel
from apps.medias.models import Medias


class RessourcesBibliotheque(BaseModel):
    """Ressource pédagogique partagée en bibliothèque."""
    titre = models.CharField('Titre', max_length=255)
    matiere_id = models.UUIDField('Matière (externe)', db_index=True)
    classe_id = models.UUIDField('Classe (externe)', db_index=True)
    enseignant_id = models.UUIDField('Enseignant (externe)', db_index=True)
    media = models.ForeignKey(
        Medias, on_delete=models.CASCADE, related_name='ressources',
    )
    mots_cles = models.JSONField(
        'Mots-clés', default=list, blank=True,
        help_text='Liste de mots-clés, ex. ["algebre", "equation"].',
    )
    date_depot = models.DateTimeField('Déposée le', auto_now_add=True)

    class Meta:
        db_table = 'ressources_bibliotheque'
        verbose_name = 'Ressource de bibliothèque'
        verbose_name_plural = 'Ressources de bibliothèque'
        ordering = ['-date_depot']

    def __str__(self):
        return self.titre
