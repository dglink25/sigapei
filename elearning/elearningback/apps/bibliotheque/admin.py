"""Enregistrements admin de l'application Bibliothèque."""
from django.contrib import admin

from apps.bibliotheque.models import RessourcesBibliotheque


@admin.register(RessourcesBibliotheque)
class RessourcesBibliothequeAdmin(admin.ModelAdmin):
    list_display = ('titre', 'matiere_id', 'classe_id', 'enseignant_id',
                    'date_depot', 'tenant_id')
    search_fields = ('titre',)
    readonly_fields = ('uuid', 'tenant_id', 'date_depot', 'created_at')
