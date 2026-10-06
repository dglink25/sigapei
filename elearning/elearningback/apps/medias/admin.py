"""Enregistrements admin de l'application Médias."""
from django.contrib import admin

from apps.medias.models import Medias


@admin.register(Medias)
class MediasAdmin(admin.ModelAdmin):
    list_display = ('nom_fichier', 'type', 'uuid', 'tenant_id', 'created_at')
    list_filter = ('type',)
    search_fields = ('nom_fichier', 'public_id_cloudinary')
    readonly_fields = ('uuid', 'tenant_id', 'created_at')
