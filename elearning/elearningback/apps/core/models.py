"""Modèles du socle commun.

`BaseModel` porte les règles transversales du cahier des charges :
isolation multi-tenant (`tenant_id`), identifiant public `uuid`
(la clé primaire `id` n'est jamais exposée), horodatage de création.
"""
import uuid

from django.db import models


class BaseModel(models.Model):
    """Socle abstrait de toutes les tables métier du schéma `elearning`.

    - `id` : clé primaire interne (performance des jointures), jamais exposée
      par l'API : tous les viewsets utilisent `lookup_field = 'uuid'`.
    - `uuid` : identifiant public (UUID4) unique, utilisé dans les URLs.
    - `tenant_id` : identifiant du locataire (établissement), indexé pour
      garantir des filtres multi-tenant performants sur chaque table.
    - `created_at` : date de création automatique.
    """
    uuid = models.UUIDField(
        'Identifiant public', default=uuid.uuid4, unique=True, editable=False,
    )
    tenant_id = models.UUIDField('Locataire', db_index=True, editable=False)
    created_at = models.DateTimeField('Créé le', auto_now_add=True)

    class Meta:
        abstract = True


class ParametresModule(BaseModel):
    """Paramètres du module E-learning — un seul jeu par tenant (singleton)."""
    tentatives_multiples_defaut = models.BooleanField(
        'Tentatives multiples par défaut', default=True,
    )
    restitution_defaut = models.CharField(
        'Restitution par défaut', max_length=20, default='immediate',
    )
    visibilite_parents = models.BooleanField(
        'Visible par les parents', default=True,
    )
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'parametres_module'
        verbose_name = 'Paramètre du module'
        verbose_name_plural = 'Paramètres du module'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id'], name='uniq_parametres_tenant',
            ),
        ]

    def __str__(self):
        return f'Paramètres du module (tenant {self.tenant_id})'
