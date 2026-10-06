"""Middleware multi-tenant.

Extrait le tenant de chaque requête API (`/v1/`) depuis l'en-tête
`X-Tenant-ID`. Ce même emplacement pourra être alimenté plus tard par
un claim JWT fourni par la gateway (aucune autre modification requise).
"""
import uuid

from django.http import JsonResponse


class TenantMiddleware:
    """Rend `request.tenant_id` disponible pour les vues et viewsets DRF."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/v1/'):
            brut = request.headers.get('X-Tenant-ID', '').strip()
            if not brut:
                return self._erreur(
                    "L'en-tête 'X-Tenant-ID' est requis sur les endpoints /v1/.",
                )
            try:
                request.tenant_id = str(uuid.UUID(brut))
            except ValueError:
                return self._erreur(
                    "L'en-tête 'X-Tenant-ID' doit être un UUID valide.",
                )
        return self.get_response(request)

    @staticmethod
    def _erreur(message):
        return JsonResponse({'detail': message}, status=400)
