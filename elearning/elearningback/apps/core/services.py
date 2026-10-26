"""Passerelles vers les autres microservices E-Académique.

Aucune table externe n'est dupliquée dans le schéma `elearning` (règle 4) :
les références croisées se font par UUID, et les vérifications/écritures
externes passent par les services ci-dessous.
"""
import json
import logging
import urllib.request
from datetime import date
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

    Le report passe par l'API interne de Evaluations :
    POST /v1/interne/notes-elearning  (X-Internal-Secret + X-Tenant-Id)

    Le report de note ne duplique rien : le microservice E-learning conserve
    uniquement l'UUID `evaluation_note_id` renvoyé par Evaluations
    (`data.note_uuid` dans la réponse).
    """

    def __init__(self):
        self.base_url = getattr(settings, 'EVALUATIONS_API_URL', None)
        self.internal_secret = getattr(settings, 'INTERNAL_API_SECRET', None)

    def reporter_note(
        self,
        *,
        tenant_id,
        apprenant_id,
        matiere_id,
        enseignant_id,
        source,               # 'devoir' | 'quiz'
        source_uuid,
        activite_uuid,
        activite_libelle,
        valeur,
        note_sur,
        date_report,
        commentaire='',
    ):
        """Crée une note dans evaluations.notes, renvoie son UUID (data.note_uuid)."""
        if not self.base_url:
            raise ServiceExterneNonConfigure(
                "EVALUATIONS_API_URL n'est pas configurée : impossible de "
                "reporter la note vers le microservice Evaluations."
            )
        if not self.internal_secret:
            raise ServiceExterneNonConfigure(
                "INTERNAL_API_SECRET n'est pas configurée : impossible de "
                "appeler l'API interne de Evaluations."
            )

        url = self.base_url.rstrip('/') + '/v1/interne/notes-elearning'
        corps = json.dumps({
            'source': source,
            'source_uuid': str(source_uuid),
            'activite_uuid': str(activite_uuid),
            'activite_libelle': str(activite_libelle)[:120],
            'apprenant_uuid': str(apprenant_id),
            'matiere_uuid': str(matiere_id),
            'enseignant_uuid': str(enseignant_id),
            'valeur': str(valeur),
            'note_sur': str(note_sur),
            'date': date_report.isoformat() if isinstance(date_report, date)
            else str(date_report),
            'commentaire': commentaire,
        }).encode('utf-8')
        requete = urllib.request.Request(
            url, data=corps,
            headers={
                'Content-Type': 'application/json',
                'X-Tenant-ID': str(tenant_id),
                'X-Internal-Secret': self.internal_secret,
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(requete, timeout=10) as reponse:
                donnees = json.loads(reponse.read().decode('utf-8'))
        except urllib.error.HTTPError as erreur:
            detail = erreur.read().decode('utf-8', errors='replace')
            logger.error(
                'Erreur HTTP %s lors du report vers Evaluations : %s',
                erreur.code, detail,
            )
            raise ServiceExterneNonConfigure(
                f"Evaluations a refusé le report (HTTP {erreur.code}) : {detail}"
            )
        except urllib.error.URLError as erreur:
            logger.error('Erreur réseau lors du report vers Evaluations : %s', erreur)
            raise ServiceExterneNonConfigure(
                f"Le microservice Evaluations est injoignable : {erreur}"
            )
        return UUID(donnees['data']['note_uuid'])
