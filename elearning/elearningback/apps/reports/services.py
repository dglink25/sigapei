"""Services de report de notes vers le microservice Evaluations.

Le report (soumission notée, tentative validée) écrit la note dans
`evaluations.notes` via `EvaluationsClient`, puis l'appelant mémorise
l'UUID `evaluation_note_id`. Aucune donnée Evaluations n'est dupliquée.
"""
from apps.core.services import EvaluationsClient


def reporter_soumission(soumission, enseignant_id, matiere_evaluations_uuid,
                        date_report):
    """Reporte la note d'une soumission ; renvoie l'UUID evaluations.notes."""
    client = EvaluationsClient()
    return client.reporter_note(
        tenant_id=soumission.tenant_id,
        apprenant_id=soumission.apprenant_id,
        matiere_id=matiere_evaluations_uuid,
        enseignant_id=enseignant_id,
        source='devoir',
        source_uuid=soumission.uuid,
        activite_uuid=soumission.devoir_id,
        activite_libelle=soumission.devoir.titre,
        valeur=soumission.note,
        note_sur=soumission.devoir.note_max,
        date_report=date_report,
        commentaire=soumission.commentaire,
    )


def reporter_tentative(tentative, enseignant_id, matiere_evaluations_uuid,
                       date_report):
    """Reporte la note totale d'une tentative validée ; renvoie l'UUID."""
    client = EvaluationsClient()
    return client.reporter_note(
        tenant_id=tentative.tenant_id,
        apprenant_id=tentative.apprenant_id,
        matiere_id=matiere_evaluations_uuid,
        enseignant_id=enseignant_id,
        source='quiz',
        source_uuid=tentative.uuid,
        activite_uuid=tentative.quiz_id,
        activite_libelle=tentative.quiz.titre,
        valeur=tentative.note_totale,
        note_sur=tentative.quiz.seuil_validation or 20,
        date_report=date_report,
        commentaire=f'Quiz : {tentative.quiz.titre} '
                    f'(tentative n°{tentative.numero})',
    )
