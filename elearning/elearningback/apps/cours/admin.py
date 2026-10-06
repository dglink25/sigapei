"""Enregistrements admin de l'application Cours."""
from django.contrib import admin

from apps.cours.models import Cours, CoursClasses, Lecons


class CoursClassesInline(admin.TabularInline):
    model = CoursClasses
    extra = 0


class LeconsInline(admin.TabularInline):
    model = Lecons
    extra = 0


@admin.register(Cours)
class CoursAdmin(admin.ModelAdmin):
    list_display = ('titre', 'statut', 'matiere_id', 'enseignant_id',
                    'tenant_id', 'date_publication', 'created_at')
    list_filter = ('statut',)
    search_fields = ('titre',)
    inlines = [CoursClassesInline, LeconsInline]
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')


@admin.register(Lecons)
class LeconsAdmin(admin.ModelAdmin):
    list_display = ('titre', 'cours', 'ordre', 'type_contenu', 'created_at')
    list_filter = ('type_contenu',)
    ordering = ('cours', 'ordre')
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')
