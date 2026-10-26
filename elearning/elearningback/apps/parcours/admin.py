"""Enregistrements admin de l'application Parcours."""
from django.contrib import admin

from apps.parcours.models import EtapesParcours, Parcours, ParcoursClasses


class ParcoursClassesInline(admin.TabularInline):
    model = ParcoursClasses
    extra = 0


class EtapesInline(admin.TabularInline):
    model = EtapesParcours
    extra = 0


@admin.register(Parcours)
class ParcoursAdmin(admin.ModelAdmin):
    list_display = ('titre', 'statut', 'matiere_id', 'enseignant_id',
                    'tenant_id', 'date_publication', 'created_at')
    list_filter = ('statut',)
    search_fields = ('titre',)
    inlines = [ParcoursClassesInline, EtapesInline]
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')


@admin.register(EtapesParcours)
class EtapesParcoursAdmin(admin.ModelAdmin):
    list_display = ('parcours', 'ordre', 'titre', 'cours', 'quiz',
                    'created_at')
    list_filter = ('parcours',)
    ordering = ('parcours', 'ordre')
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')
