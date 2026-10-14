"""Middleware multi-tenant et rôle de démonstration.

Extrait de chaque requête API (`/v1/`) :
- le tenant depuis l'en-tête `X-Tenant-ID` ;
- le rôle depuis l'en-tête `X-Role` — stand-in honnête et documenté du
  futur claim JWT fourni par la gateway (mêmes valeurs que le sélecteur
  de rôle du frontend : enseignant, apprenant, parent, administrateur) ;
- l'apprenant concerné depuis l'en-tête facultatif `X-Apprenant-ID`
  (l'élève lui-même, ou son enfant quand un parent agit pour lui).
"""
import uuid

from django.http import JsonResponse

ROLES_CONNUS = ('enseignant', 'apprenant', 'parent', 'administrateur')


class TenantMiddleware:
    """Rend `request.tenant_id`, `request.role` et `request.apprenant_id`
    disponibles pour les vues et viewsets DRF."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/v1/'):
            brut = request.headers.get('X-Tenant-ID', '').strip()
            if not brut:
                return self._erreur(
                    400,
                    "L'en-tête 'X-Tenant-ID' est requis sur les endpoints "
                    '/v1/.',
                )
            try:
                request.tenant_id = str(uuid.UUID(brut))
            except ValueError:
                return self._erreur(
                    400,
                    "L'en-tête 'X-Tenant-ID' doit être un UUID valide.",
                )

            role = request.headers.get('X-Role', '').strip()
            if role not in ROLES_CONNUS:
                return self._erreur(
                    403,
                    "L'en-tête 'X-Role' est requis sur les endpoints /v1/ "
                    '(valeurs acceptées : enseignant, apprenant, parent, '
                    'administrateur).',
                )
            request.role = role

            apprenant = request.headers.get('X-Apprenant-ID', '').strip()
            if apprenant:
                try:
                    request.apprenant_id = str(uuid.UUID(apprenant))
                except ValueError:
                    return self._erreur(
                        400,
                        "L'en-tête 'X-Apprenant-ID' doit être un UUID "
                        'valide.',
                    )
            else:
                request.apprenant_id = None
        return self.get_response(request)

    @staticmethod
    def _erreur(statut, message):
        return JsonResponse({'detail': message}, status=statut)
