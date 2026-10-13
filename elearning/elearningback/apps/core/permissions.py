"""Permissions DRF propres au module E-learning."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.core.services import DroitsService


class EnseignantAffectePermission(BasePermission):
    """Règle 5 : un enseignant ne crée/modifie que pour ses classes et
    matières affectées (vérifiable via `rh.affectations`).

    Les lectures sont toujours autorisées ; le contrôle s'applique aux
    créations et modifications portant un triplet
    (enseignant_id, matiere_id, classe_id). Tant que l'authentification
    gateway/JWT n'est pas en place, l'enseignant est identifié par le
    `enseignant_id` du corps de la requête.
    """
    message = (
        "Cet enseignant n'est pas affecté à cette matière/classe "
        '(rh.affectations).'
    )

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if view.action not in ('create', 'update', 'partial_update'):
            return True

        donnees = request.data if isinstance(request.data, dict) else {}
        enseignant_id = donnees.get('enseignant_id')
        matiere_id = donnees.get('matiere_id')
        classe_id = donnees.get('classe_id')
        if not (enseignant_id and matiere_id and classe_id):
            # Pas de triplet complet (ex. PATCH partiel) : pas de contrôle.
            return True

        return DroitsService.peut_gerer(
            enseignant_id, matiere_id, classe_id, request.tenant_id,
        )
