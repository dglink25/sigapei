"""Énumérations métier partagées par le module E-learning.

Centralisées ici pour que chaque modèle/sérialiseur référence la même
source de vérité (statuts, types de contenus, politiques de retard...).
"""
from django.db import models


class StatutContenu(models.TextChoices):
    """Suppression logique : aucun contenu n'est supprimé physiquement."""
    BROUILLON = 'brouillon', 'Brouillon'
    PUBLIE = 'publie', 'Publié'
    ARCHIVE = 'archive', 'Archivé'


class TypeMedia(models.TextChoices):
    VIDEO = 'video', 'Vidéo'
    DOCUMENT = 'document', 'Document'
    IMAGE = 'image', 'Image'


class TypeContenuLecon(models.TextChoices):
    TEXTE = 'texte', 'Texte'
    DOCUMENT = 'document', 'Document'
    VIDEO = 'video', 'Vidéo'


class PolitiqueRetard(models.TextChoices):
    BLOCAGE = 'blocage', 'Blocage (aucun dépôt après la date limite)'
    PENALITE = 'penalite', 'Pénalité (dépôt tardif autorisé, marqué en retard)'


class Restitution(models.TextChoices):
    IMMEDIATE = 'immediate', 'Immédiate (résultats visibles dès la soumission)'
    APRES_DATE_LIMITE = (
        'apres_date_limite',
        'Après date limite (verrouillée jusqu\u2019à la clôture du quiz)',
    )
    DIFFEREE = 'differee', 'Différée (résultats visibles après validation enseignant)'


class StatutTentative(models.TextChoices):
    EN_COURS = 'en_cours', 'En cours'
    SOUMIS = 'soumis', 'Soumis'
    VALIDE = 'valide', 'Validé'


class TypeQuestion(models.TextChoices):
    QCM = 'qcm', 'QCM'
    VRAI_FAUX = 'vrai_faux', 'Vrai / Faux'
    OUVERTE = 'ouverte', 'Question ouverte'
