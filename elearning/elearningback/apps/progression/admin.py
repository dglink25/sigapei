"""Enregistrements admin de l'application Progression."""
from django.contrib import admin

from apps.progression.models import ProgressionEtapes


@admin.register(ProgressionEtapes)
class ProgressionEtapesAdmin(admin.ModelAdmin):
    list_display = ('etape', 'apprenant_id', 'est_terminee',
                    'date_terminee', 'tenant_id', 'created_at')
    list_filter = ('est_terminee',)
    search_fields = ('apprenant_id',)
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')
