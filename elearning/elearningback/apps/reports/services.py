"""Services de report de notes vers le microservice Evaluations.

Le report (soumission notée, tentative validée) écrit la note dans
`evaluations.notes` via `EvaluationsClient`, puis l'appelant mémorise
l'UUID `evaluation_note_id`. Aucune donnée Evaluations n'est dupliquée.
"""
from apps.core.services import EvaluationsClient


def reporter_soumission(soumission):
    """Reporte la note d'une soumission ; renvoie l'UUID evaluations.notes."""
    client = EvaluationsClient()
    return client.reporter_note(
        tenant_id=soumission.tenant_id,
        apprenant_id=soumission.apprenant_id,
        matiere_id=soumission.devoir.matiere_id,
        note=soumission.note,
        commentaire=soumission.commentaire,
    )


def reporter_tentative(tentative):
    """Reporte la note totale d'une tentative validée ; renvoie l'UUID."""
    client = EvaluationsClient()
    return client.reporter_note(
        tenant_id=tentative.tenant_id,
        apprenant_id=tentative.apprenant_id,
        matiere_id=tentative.quiz.matiere_id,
        note=tentative.note_totale,
        commentaire=f'Quiz : {tentative.quiz.titre} '
                    f'(tentative n°{tentative.numero})',
    )
