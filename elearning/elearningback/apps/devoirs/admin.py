"""Enregistrements admin de l'application Devoirs."""
from django.contrib import admin

from apps.devoirs.models import Devoirs, SoumissionFichiers, Soumissions


@admin.register(Devoirs)
class DevoirsAdmin(admin.ModelAdmin):
    list_display = ('titre', 'classe_id', 'matiere_id', 'date_limite',
                    'note_max', 'politique_retard', 'tenant_id', 'created_at')
    list_filter = ('politique_retard',)
    search_fields = ('titre',)
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')


@admin.register(Soumissions)
class SoumissionsAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'devoir', 'apprenant_id', 'date_depot',
                    'en_retard', 'note', 'note_reportee')
    list_filter = ('en_retard', 'note_reportee')
    readonly_fields = ('uuid', 'tenant_id', 'date_depot', 'created_at',
                        'updated_at')


@admin.register(SoumissionFichiers)
class SoumissionFichiersAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'soumission', 'media')
    readonly_fields = ('uuid', 'tenant_id', 'created_at')
