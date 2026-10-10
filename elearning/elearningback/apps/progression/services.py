"""Services de l'application Progression : calcul d'avancement.

Le pourcentage est calculé à la lecture — aucune dénormalisation — pour
rester toujours cohérent avec les étapes réellement terminées.
"""
from decimal import ROUND_HALF_UP, Decimal

from apps.progression.models import ProgressionEtapes


def construire_progression(parcours, apprenant_id):
    """Construit le résumé d'avancement d'un apprenant dans un parcours.

    Renvoie les étapes avec leur état (terminée ou non) ainsi que les
    compteurs et le pourcentage d'avancement.
    """
    etapes = list(
        parcours.etapes.select_related('cours', 'quiz').all()
    )
    terminees = set(
        ProgressionEtapes.objects.filter(
            etape__parcours=parcours, apprenant_id=apprenant_id,
            est_terminee=True,
        ).values_list('etape_id', flat=True)
    )
    nb_etapes = len(etapes)
    nb_terminees = sum(1 for etape in etapes if etape.id in terminees)
    pourcentage = (
        (Decimal(nb_terminees) * 100 / Decimal(nb_etapes)).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )
        if nb_etapes else Decimal('0')
    )
    return {
        'parcours_uuid': str(parcours.uuid),
        'titre': parcours.titre,
        'apprenant_id': str(apprenant_id),
        'nb_etapes': nb_etapes,
        'nb_terminees': nb_terminees,
        'pourcentage': pourcentage,
        'etapes': [
            {
                'uuid': str(etape.uuid),
                'ordre': etape.ordre,
                'titre': etape.contenu_titre,
                'type_contenu': etape.type_contenu,
                'contenu_uuid': str(
                    etape.cours.uuid if etape.cours_id else etape.quiz.uuid
                ),
                'terminee': etape.id in terminees,
            }
            for etape in etapes
        ],
    }
