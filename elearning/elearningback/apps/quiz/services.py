"""Services métier de l'application Quiz : correction et notation.

Convention de réponse (`reponse_donnee`) :
- qcm : liste JSON des UUID des options choisies,
       ex. '["a1b2...","c3d4..."]' ;
- vrai_faux : UUID de l'option choisie (chaîne simple) ;
- ouverte : texte libre (correction IA asynchrone).
"""
import json
import logging
from decimal import Decimal

from apps.core.choices import TypeQuestion

logger = logging.getLogger(__name__)


def extraire_uuids_choisis(reponse_donnee):
    """Normalise `reponse_donnee` en ensemble d'UUID d'options (choix)."""
    reponse_donnee = (reponse_donnee or '').strip()
    if not reponse_donnee:
        return set()
    if reponse_donnee.startswith('['):
        try:
            return {str(uuid) for uuid in json.loads(reponse_donnee)}
        except (ValueError, TypeError):
            return set()
    return {reponse_donnee}


def corriger_choix(question, reponse_donnee):
    """Note immédiate d'une question QCM/vrai_faux : tout ou rien.

    Renvoie le barème si l'ensemble des options choisies correspond
    exactement à l'ensemble des options correctes, sinon 0.
    """
    uuids_corrects = {
        str(option.uuid) for option in question.options.all()
        if option.est_correcte
    }
    if extraire_uuids_choisis(reponse_donnee) == uuids_corrects:
        return question.bareme
    return Decimal('0')


def corriger_reponses_ouvertes(tentative):
    """Déclenche la correction IA des questions ouvertes d'une tentative.

    Stub d'intégration : la tâche asynchrone (Celery + service IA externe)
    écrira `note_ia` sur chaque réponse ouverte. Les réponses sont
    identifiées ici et journalisées pour ne rien bloquer.
    """
    reponses_ouvertes = tentative.reponses.filter(
        question__type=TypeQuestion.OUVERTE,
    ).select_related('question')
    for reponse in reponses_ouvertes:
        logger.info(
            'Correction IA à déclencher : reponse=%s question=%s '
            '(reponse_reference="%s")',
            reponse.uuid, reponse.question.uuid,
            reponse.question.reponse_reference[:80],
        )
        # TODO (intégration IA) : appeler le service de correction et écrire
        # reponse.note_ia = <note proposée par l'IA> ; reponse.save(...).


def noter_reponse_immediatement(reponse):
    """Note une réponse dès la soumission (QCM/vrai_faux uniquement).

    La note immédiate est écrite dans `note_finale` (l'enseignant peut
    toujours l'ajuster via PATCH /v1/reponses/{uuid}/note/).
    """
    if reponse.question.type in (TypeQuestion.QCM, TypeQuestion.VRAI_FAUX):
        reponse.note_finale = corriger_choix(
            reponse.question, reponse.reponse_donnee,
        )
        reponse.save(update_fields=['note_finale', 'updated_at'])


def recalculer_note_totale(tentative):
    """Somme les notes finales connues et met à jour `note_totale`."""
    total = Decimal('0')
    for reponse in tentative.reponses.all():
        total += reponse.note_finale or Decimal('0')
    tentative.note_totale = total
    tentative.save(update_fields=['note_totale', 'updated_at'])
    return total
