"""Enregistrements admin de l'application Quiz."""
from django.contrib import admin

from apps.quiz.models import (
    OptionsQuestion,
    Questions,
    Quiz,
    ReponsesApprenant,
    TentativesQuiz,
)


class QuestionsInline(admin.TabularInline):
    model = Questions
    extra = 0
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('titre', 'classe_id', 'matiere_id', 'statut',
                    'tentatives_max', 'restitution', 'tenant_id')
    list_filter = ('statut', 'restitution')
    search_fields = ('titre',)
    inlines = [QuestionsInline]
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')


@admin.register(OptionsQuestion)
class OptionsQuestionAdmin(admin.ModelAdmin):
    list_display = ('libelle', 'question', 'est_correcte', 'ordre')
    list_filter = ('est_correcte',)
    readonly_fields = ('uuid', 'tenant_id', 'created_at')


@admin.register(TentativesQuiz)
class TentativesQuizAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'quiz', 'apprenant_id', 'numero', 'statut',
                    'note_totale', 'date_soumission')
    list_filter = ('statut',)
    readonly_fields = ('uuid', 'tenant_id', 'date_debut', 'created_at',
                       'updated_at')


@admin.register(ReponsesApprenant)
class ReponsesApprenantAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'tentative', 'question', 'note_ia',
                    'note_finale', 'validee_par_enseignant')
    list_filter = ('validee_par_enseignant',)
    readonly_fields = ('uuid', 'tenant_id', 'created_at', 'updated_at')
