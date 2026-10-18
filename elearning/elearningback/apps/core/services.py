"""Passerelles vers les autres microservices E-Académique.

Aucune table externe n'est dupliquée dans le schéma `elearning` (règle 4) :
les références croisées se font par UUID, et les vérifications/écritures
externes passent par les services ci-dessous.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from uuid import UUID

from django.conf import settings

logger = logging.getLogger(__name__)


class ServiceExterneNonConfigure(Exception):
    """Le service externe requis n'est pas encore configuré (URL absente)."""


class DroitsService:
    """Vérifie qu'un enseignant est affecté au couple (matière, classe).

    La source de vérité est `rh.affectations` (microservice RH), interrogée par
    son API interne `/v1/interne/affectations/verifier` (règle 1 : aucune
    jointure SQL inter-schémas ; règle 3 : secret `X-Internal-Secret`).

    Tant que `DROITS_STRICTS` est faux (défaut), le service reste permissif et
    journalise l'appel afin de ne pas bloquer le développement. Passer
    `DROITS_STRICTS=True` pour activer le contrôle réel. En cas d'échec
    (configuration absente, RH injoignable, réponse invalide), le service
    refuse (fail closed) plutôt que d'autoriser à tort.
    """

    @staticmethod
    def peut_gerer(enseignant_id, matiere_id, classe_id, tenant_id):
        """L'enseignant peut-il créer/modifier ce contenu ?"""
        if not getattr(settings, 'DROITS_STRICTS', False):
            logger.info(
                'Droits permissifs (DROITS_STRICTS=False) : '
                'enseignant=%s matiere=%s classe=%s tenant=%s',
                enseignant_id, matiere_id, classe_id, tenant_id,
            )
            return True

        base_url = getattr(settings, 'RH_API_URL', '')
        secret = getattr(settings, 'INTERNAL_API_SECRET', '')
        if not base_url or not secret:
            logger.error(
                'DROITS_STRICTS actif mais RH_API_URL / INTERNAL_API_SECRET '
                'absent(s) : refus (fail closed). enseignant=%s tenant=%s',
                enseignant_id, tenant_id,
            )
            return False

        requete = DroitsService._requete_verifier(
            base_url, secret, tenant_id, enseignant_id, matiere_id, classe_id,
        )
        try:
            with urllib.request.urlopen(
                requete, timeout=float(getattr(settings, 'RH_TIMEOUT', 5)),
            ) as reponse:
                corps = json.loads(reponse.read().decode('utf-8'))
        except (urllib.error.URLError, OSError, ValueError) as erreur:
            logger.error(
                'RH (affectations) injoignable ou réponse invalide : %s '
                '- refus (fail closed). enseignant=%s tenant=%s',
                erreur, enseignant_id, tenant_id,
            )
            return False

        donnee = corps.get('data') or {}

        return bool(donnee.get('affecte', False))

    @staticmethod
    def _requete_verifier(base_url, secret, tenant_id, enseignant_id,
                          matiere_id, classe_id):
        parametres = urllib.parse.urlencode({
            'tenant_id': tenant_id,
            'enseignant_uuid': enseignant_id,
            'matiere_uuid': matiere_id,
            'classe_uuid': classe_id,
        })
        url = base_url.rstrip('/') + '/v1/interne/affectations/verifier?' + parametres

        return urllib.request.Request(
            url,
            headers={
                'Accept': 'application/json',
                'X-Internal-Secret': secret,
                'X-Tenant-Id': str(tenant_id),
            },
        )


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
