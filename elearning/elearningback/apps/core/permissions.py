"""Permissions DRF propres au module E-learning.

Le rôle vient de l'en-tête `X-Role` (stand-in du futur claim JWT de la
gateway - voir `apps.core.middleware`) : sur toute route `/v1/`,
`request.role` vaut 'enseignant', 'apprenant', 'parent' ou
'administrateur', et `request.apprenant_id` porte l'UUID de l'élève
concerné quand il est fourni.

Matrice validée :
- lecture des contenus pédagogiques : tous les rôles ;
- écriture (cours, quiz, devoirs, ressources, parcours, étapes,
  leçons, questions, archivage) : enseignant et administrateur ;
- notation, validation de tentative, report de note : enseignant et
  administrateur ;
- dépôt de copie : apprenant et parent ;
- passage de quiz (tentatives) : apprenant uniquement ;
- paramétrage du tenant (PUT /v1/parametres/) : administrateur ;
- apprenant/parent : limité à SES soumissions / tentatives / réponses
  et à sa propre activité.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.core.services import DroitsService

ROLES_ENSEIGNANT_ADMIN = ('enseignant', 'administrateur')
ROLES_APPRENANT_PARENT = ('apprenant', 'parent')


class RolePermission(BasePermission):
    """Base : vérifie `request.role` contre les rôles autorisés.

    `roles_autorises = None` accepte tous les rôles connus (le
    middleware garantit déjà la présence d'un rôle valide).
    """
    roles_autorises = None
    message = 'Action non autorisée pour votre rôle.'

    def has_permission(self, request, view):
        role = getattr(request, 'role', None)
        if role is None:
            return False
        return self.roles_autorises is None or role in self.roles_autorises


class EstEnseignantOuAdmin(RolePermission):
    """Écriture pédagogique, notation, validation, report de note."""
    roles_autorises = ROLES_ENSEIGNANT_ADMIN


class EstApprenantOuParent(RolePermission):
    """Dépôt d'une copie (l'apprenant lui-même ou son parent)."""
    roles_autorises = ROLES_APPRENANT_PARENT


class EstApprenant(RolePermission):
    """Passage de quiz : réservé à l'apprenant (pas au parent)."""
    roles_autorises = ('apprenant',)


class EstAdministrateur(RolePermission):
    """Paramétrage du tenant."""
    roles_autorises = ('administrateur',)


class LectureTousEcritureEnseignant(RolePermission):
    """Lectures (GET/HEAD/OPTIONS) : tous les rôles ; toute écriture -
    y compris les actions personnalisées POST (archiver, leçons,
    questions, étapes…) : enseignant et administrateur."""
    roles_autorises = ROLES_ENSEIGNANT_ADMIN

    def has_permission(self, request, view):
        role = getattr(request, 'role', None)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return role in self.roles_autorises


class ApprenantProprietairePermission(RolePermission):
    """Niveau objet : l'apprenant (ou son parent) n'accède qu'aux
    objets portant son `apprenant_id` (en-tête `X-Apprenant-ID`) ;
    l'enseignant et l'administrateur couvrent tout le tenant.

    Concerne les soumissions, tentatives et réponses : le champ est
    soit directement sur l'objet, soit porté par sa tentative.
    """
    message = "Accès limité aux données de l'apprenant concerné."

    def has_object_permission(self, request, view, obj):
        role = getattr(request, 'role', None)
        if role in ROLES_ENSEIGNANT_ADMIN:
            return True
        apprenant = getattr(request, 'apprenant_id', None)
        if apprenant is None:
            return False
        cible = getattr(obj, 'apprenant_id', None)
        if cible is None:
            cible = obj.tentative.apprenant_id
        return str(cible) == str(apprenant)


def restreindre_aux_apprenants(queryset, request, champ='apprenant_id'):
    """Filtre un queryset selon le rôle : apprenant/parent → uniquement
    ses propres objets (`X-Apprenant-ID`) ; enseignant/administrateur →
    liste non restreinte (les filtres de la requête s'appliquent)."""
    role = getattr(request, 'role', None)
    if role not in ROLES_APPRENANT_PARENT:
        return queryset
    apprenant = getattr(request, 'apprenant_id', None)
    return queryset.filter(**{champ: apprenant or ''})


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
