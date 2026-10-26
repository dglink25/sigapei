"""Middleware multi-tenant et rôle de démonstration.

Extrait de chaque requête API (`/v1/`) :
- le tenant depuis l'en-tête `X-Tenant-ID` ;
- le rôle depuis l'en-tête `X-Role` - stand-in honnête et documenté du
  futur claim JWT fourni par la gateway (mêmes valeurs que le sélecteur
  de rôle du frontend : enseignant, apprenant, parent, administrateur) ;
- l'apprenant concerné depuis l'en-tête facultatif `X-Apprenant-ID`
  (l'élève lui-même, ou son enfant quand un parent agit pour lui).
"""
import uuid

from django.http import JsonResponse

ROLES_CONNUS = ('enseignant', 'apprenant', 'parent', 'administrateur', 'super_admin')

# Routes publiques : ne exigent ni X-Tenant-ID ni X-Role.
ROUTES_PUBLIQUES = ('/documentation/',)

# Roles dispenses d'en-tete X-Tenant-ID (pas d'attachement a un etablissement
# specifique : super_admin voit l'ensemble de la plateforme).
ROLES_SANS_TENANT = ('super_admin',)


class TenantMiddleware:
    """Rend `request.tenant_id`, `request.role` et `request.apprenant_id`
    disponibles pour les vues et viewsets DRF."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/v1/'):
            return self.get_response(request)

        # Routes publiques : pas de tenant ni de role requis.
        if request.path in ROUTES_PUBLIQUES:
            return self.get_response(request)

        role = request.headers.get('X-Role', '').strip()
        if role not in ROLES_CONNUS:
            return self._erreur(
                403,
                "L'en-tête 'X-Role' est requis sur les endpoints /v1/ "
                '(valeurs acceptées : enseignant, apprenant, parent, '
                'administrateur, super_admin).',
            )
        request.role = role

        # super_admin n'est attache a aucun etablissement specifique :
        # il n'a pas besoin d'en-tete X-Tenant-ID.
        if role not in ROLES_SANS_TENANT:
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
        else:
            request.tenant_id = None

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
