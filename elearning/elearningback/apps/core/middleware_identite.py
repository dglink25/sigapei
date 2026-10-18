"""Authentification déléguée au microservice Identite.

Valide le jeton Bearer de chaque requête API (`/v1/`) en appelant
GET `http://localhost:4001/v1/moi` sur le microservice Identite, puis attache
les informations utilisateur à la requête Django :

- `request.utilisateur` — objet utilisateur retourné par Identite
- `request.utilisateur_id` — UUID de l'utilisateur
- `request.role` — rôle (enseignant, apprenant, parent, administrateur)
- `request.tenant_id` — UUID du tenant/établissement

Les en-têtes `X-Tenant-ID` et `X-Role` sont également injectés sur la requête
pour que le `TenantMiddleware` existant n'ait plus besoin d'être alimenté
manuellement par le frontend sur chaque appel.

S'insère dans `MIDDLEWARE` juste avant `apps.core.middleware.TenantMiddleware`
(après `AuthenticationMiddleware` si présent).
"""

import logging
import uuid

import requests
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)

IDENTITE_BASE_URL = getattr(settings, 'IDENTITE_SERVICE_URL', 'http://localhost:4001')
IDENTITE_API_PREFIX = '/v1'


class IdentiteAuthMiddleware:
    """Middleware d'authentification via le microservice Identite."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/v1/'):
            return self.get_response(request)

        auth_header = request.headers.get('Authorization', '').strip()
        if not auth_header.startswith('Bearer '):
            # Pas de token : on laisse passer, TenantMiddleware gérera si besoin
            return self.get_response(request)

        token = auth_header.split(' ', 1)[1]

        try:
            resp = requests.get(
                f'{IDENTITE_BASE_URL}{IDENTITE_API_PREFIX}/moi',
                headers={'Authorization': f'Bearer {token}'},
                timeout=5,
            )
        except requests.RequestException as exc:
            logger.warning('Identite injoignable pour /moi: %s', exc)
            return JsonResponse(
                {'detail': "Service d'authentification injoignable."},
                status=503,
            )

        if resp.status_code == 401:
            return JsonResponse({'detail': 'Jeton invalide ou expiré.'}, status=401)
        if not resp.ok:
            return JsonResponse(
                {'detail': "Erreur lors de la vérification de la session."},
                status=502,
            )

        data = resp.json() or {}
        # La réponse peut être { data: { ... } } ou directe { ... }
        user = data.get('data', data) if isinstance(data, dict) else data

        request.utilisateur = user
        request.utilisateur_id = (
            user.get('id') or user.get('uuid') or user.get('sub')
        )

        tenant_id = user.get('tenant_id') or user.get('etablissement_id')
        if tenant_id:
            try:
                request.tenant_id = str(uuid.UUID(tenant_id))
            except (ValueError, AttributeError):
                request.tenant_id = str(tenant_id)
        else:
            request.tenant_id = None

        request.role = user.get('role') or 'apprenant'

        # Injecte les en-têtes pour que TenantMiddleware (positionné juste après)
        # puisse les lire sans modification du frontend.
        if request.tenant_id:
            request.META['HTTP_X_TENANT_ID'] = str(request.tenant_id)
        if request.role:
            request.META['HTTP_X_ROLE'] = str(request.role)

        return self.get_response(request)
