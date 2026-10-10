"""Modèles de l'application Progression.

Suivi de l'avancement des apprenants dans les parcours : une ligne par
couple (étape, apprenant). `apprenant_id` et `soumis_par` sont des UUID
externes (`scolarite.apprenants`, `identite.utilisateurs`) : jamais
dupliqués localement (règle 4).
"""
from django.db import models

from apps.core.models import BaseModel


class ProgressionEtapes(BaseModel):
    """Progression d'un apprenant sur une étape de parcours.

    `soumis_par` conserve le compte réellement utilisé pour l'action
    (apprenant ou parent — programme béninois, section 2.6 du cahier des
    charges), tandis que la donnée reste attribuée à `apprenant_id`.
    """
    etape = models.ForeignKey(
        'parcours.EtapesParcours', on_delete=models.CASCADE,
        related_name='progressions',
    )
    apprenant_id = models.UUIDField('Apprenant (externe)', db_index=True)
    soumis_par = models.UUIDField(
        'Déposé par (externe : apprenant ou parent)', null=True, blank=True,
    )
    est_terminee = models.BooleanField('Étape terminée', default=False)
    date_terminee = models.DateTimeField(
        'Terminée le', null=True, blank=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'progression_etapes'
        verbose_name = "Progression d'étape"
        verbose_name_plural = "Progressions d'étapes"
        ordering = ['etape__parcours_id', 'etape__ordre']
        constraints = [
            models.UniqueConstraint(
                fields=['etape', 'apprenant_id'],
                name='uniq_progression_etape',
            ),
        ]

    def __str__(self):
        return f'Étape {self.etape_id} / apprenant {self.apprenant_id}'
