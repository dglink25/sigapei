"""Enregistrements admin du socle commun."""
from django.contrib import admin

from apps.core.models import ParametresModule


@admin.register(ParametresModule)
class ParametresModuleAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'tenant_id', 'updated_at')
    list_filter = ('visibilite_parents',)
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')
