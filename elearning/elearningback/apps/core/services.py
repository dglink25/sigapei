"""Passerelles vers les autres microservices E-Académique.

Aucune table externe n'est dupliquée dans le schéma `elearning` (règle 4) :
les références croisées se font par UUID, et les vérifications/écritures
externes passent par les services ci-dessous.
"""
import json
import logging
import urllib.request
from uuid import UUID

from django.conf import settings

logger = logging.getLogger(__name__)


class ServiceExterneNonConfigure(Exception):
    """Le service externe requis n'est pas encore configuré (URL absente)."""


class DroitsService:
    """Vérifie qu'un enseignant est affecté au couple (matière, classe).

    La source de vérité est `rh.affectations` (microservice RH). Tant que la
    passerelle n'est pas configurée (`DROITS_STRICTS = False`, défaut), le
    service reste permissif et journalise l'appel afin de ne pas bloquer le
    développement. Passer `DROITS_STRICTS=True` pour activer le contrôle réel
    dès que l'API RH est joignable.
    """

    @staticmethod
    def peut_gerer(enseignant_id, matiere_id, classe_id, tenant_id):
        """L'enseignant peut-il créer/modifier ce contenu ?"""
        if not getattr(settings, 'DROITS_STRICTS', False):
            logger.info(
                'Droits permissifs (rh.affectations non branché) : '
                'enseignant=%s matiere=%s classe=%s tenant=%s',
                enseignant_id, matiere_id, classe_id, tenant_id,
            )
            return True

        # TODO (intégration RH) : interroger rh.affectations via son API, ex :
        # GET /v1/affectations/?enseignant=<uuid>&matiere=<uuid>&classe=<uuid>
        logger.warning(
            'DROITS_STRICTS actif mais rh.affectations non branché : refus. '
            'enseignant=%s tenant=%s', enseignant_id, tenant_id,
        )
        return False


class EvaluationsClient:
    """Écriture des notes dans `evaluations.notes` (microservice Evaluations).

    Le report de note ne duplique rien : le microservice E-learning conserve
    uniquement l'UUID `evaluation_note_id` renvoyé par Evaluations.
    """

    def __init__(self):
        self.base_url = getattr(settings, 'EVALUATIONS_API_URL', None)

    def reporter_note(self, tenant_id, apprenant_id, matiere_id, note,
                      commentaire=''):
        """Crée une note dans evaluations.notes, renvoie son UUID."""
        if not self.base_url:
            raise ServiceExterneNonConfigure(
                "EVALUATIONS_API_URL n'est pas configurée : impossible de "
                "reporter la note vers le microservice Evaluations."
            )
        url = self.base_url.rstrip('/') + '/v1/notes/'
        corps = json.dumps({
            'tenant_id': str(tenant_id),
            'apprenant_id': str(apprenant_id),
            'matiere_id': str(matiere_id),
            'note': str(note),
            'commentaire': commentaire,
        }).encode('utf-8')
        requete = urllib.request.Request(
            url, data=corps,
            headers={'Content-Type': 'application/json',
                     'X-Tenant-ID': str(tenant_id)},
            method='POST',
        )
        with urllib.request.urlopen(requete, timeout=10) as reponse:
            donnees = json.loads(reponse.read().decode('utf-8'))
        return UUID(donnees['uuid'])
