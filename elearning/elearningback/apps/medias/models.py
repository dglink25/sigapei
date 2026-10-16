"""Modèles de l'application Médias."""
from django.db import models

from apps.core.choices import TypeMedia
from apps.core.models import BaseModel


class Medias(BaseModel):
    """Fichier déposé sur Cloudinary (upload direct signé) ou S3/MinIO.

    Une seule des deux localisations est renseignée selon la destination
    d'upload : `public_id_cloudinary` pour Cloudinary, `chemin_stockage`
    pour S3/MinIO.
    """
    type = models.CharField('Type', max_length=20, choices=TypeMedia.choices)
    nom_fichier = models.CharField(
        'Nom du fichier', max_length=255, blank=True, default='',
    )
    url_cloudinary = models.URLField('URL Cloudinary', null=True, blank=True)
    public_id_cloudinary = models.CharField(
        'Identifiant public Cloudinary', max_length=255, null=True, blank=True,
    )
    chemin_stockage = models.CharField(
        'Chemin S3/MinIO (clé objet)', max_length=1024, null=True, blank=True,
    )

    class Meta:
        db_table = 'medias'
        verbose_name = 'Média'
        verbose_name_plural = 'Médias'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'public_id_cloudinary'],
                name='uniq_medias_public_id_cloudinary',
            ),
        ]

    def __str__(self):
        return self.nom_fichier or f'Média {self.uuid}'
