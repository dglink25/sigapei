# API RH — documentation

Microservice **Ressources Humaines** de la plateforme SIGAPEI.

- Base : `https://api-rh.e-academique.com/v1`
- Réponses : enveloppe `{"success", "message", "data"}` ; erreurs `{"success": false, "message", "error": {"code", "details"?}}`.
- Aucun `id` interne exposé : tous les identifiants publics sont des `uuid`.
- Contrat OpenAPI 3 : [`openapi.json`](openapi.json), servi sur `GET /docs`.

## Authentification

Les routes publiques passent par la **Gateway**, qui valide le JWT (microservice
Identité) et transmet le contexte dans des en-têtes internes :

| En-tête | Signification |
|---|---|
| `X-Internal-Secret` | secret interne partagé (obligatoire, prouve l'origine plateforme) |
| `X-Tenant-Id` | identifiant numérique de l'établissement |
| `X-User-Id` | uuid de l'utilisateur (claim `sub`) |
| `X-User-Role` | rôle : `super_admin`, `administrateur`, `personnel`, `enseignant`, `apprenant`, `parent` |

Les routes `/v1/interne/*` s'authentifient uniquement par `X-Internal-Secret` et
reçoivent le tenant via le paramètre `tenant_id`.

## Ressources

- **Personnel** : `GET/POST /personnel`, `GET/PUT /personnel/{uuid}`, `POST /personnel/{uuid}/statut`, `GET /personnel/{uuid}/affectations`.
- **Grades** : `GET/POST /grades`, `PUT /grades/{uuid}`.
- **Contrats** : `GET/POST /contrats`, `PUT /contrats/{uuid}`, `POST /contrats/{uuid}/cloturer`.
- **Affectations** (règle 5) : `GET/POST /affectations`, `GET/PUT /affectations/{uuid}`, `POST /affectations/{uuid}/cloturer`.
- **Congés** : `GET/POST /conges`, `GET /conges/{uuid}`, `PUT /conges/{uuid}/traiter`.
- **Rôles RH** : `GET/POST /roles-rh`, `GET/PUT /roles-rh/{uuid}`, `PATCH /roles-rh/{uuid}/modules`, `POST /roles-rh/{uuid}/archiver`.
- **Rattachement rôle** : `GET/POST /personnel/{uuid}/roles-rh`, `POST /personnel/{uuid}/roles-rh/{roleUuid}/retirer`.
- **Moteur de rôles RH** : `GET /rh/mes-fonctions` (fonctions du module accordées à l'utilisateur courant).

### Corps des rôles RH

```jsonc
// POST /roles-rh
{ "nom": "Chef de département", "description": "…", "fonctions": ["dossiers", "conges"] }

// PATCH /roles-rh/{uuid}/modules   — remplace l'ensemble des fonctions accordées
{ "fonctions": ["affectations", "charges_horaires"] }

// POST /personnel/{uuid}/roles-rh
{ "role_rh_uuid": "…", "date_attribution": "2026-10-16" }
```

Fonctions valides : `dossiers`, `affectations`, `charges_horaires`, `conges`,
`evaluations`, `contrats_intervenants`.

## Interne (autres microservices)

| Endpoint | Consommateur | Rôle |
|---|---|---|
| `GET /interne/personnel?tenant_id=&uuid=\|&id=` | Vie scolaire | identité du personnel |
| `GET /interne/personnel/utilisateur/{utilisateur_uuid}?tenant_id=` | Identité / autres | personnel rattaché à un compte |
| `GET /interne/affectations?tenant_id=&enseignant_uuid=&matiere_uuid=&classe_uuid=&annee_scolaire=` | Évaluations / E-learning | affectations actives |
| `GET /interne/affectations/verifier?tenant_id=&enseignant_uuid=&matiere_uuid=&classe_uuid=` | Évaluations (`RhClient`), E-learning (`DroitsService`) | booléen `affecte` |

## Codes d'erreur métier

| Code | HTTP | Signification |
|---|---|---|
| `MATRICULE_DEJA_UTILISE` | 409 | matricule déjà présent pour ce tenant |
| `PERSONNEL_INACTIF` | 409 | affectation refusée pour un membre inactif |
| `AFFECTATION_DEJA_ACTIVE` | 409 | affectation déjà existante pour l'année |
| `AFFECTATION_DEJA_TERMINEE` | 409 | clôture d'une affectation déjà terminée |
| `CONTRAT_ACTIF_EXISTANT` | 409 | un contrat en cours existe déjà |
| `CONTRAT_DEJA_CLOTURE` | 409 | contrat déjà clôturé |
| `TRANSITION_INTERDITE` | 409 | transition de statut de congé impossible |
| `MOTIF_OBLIGATOIRE` | 409 | refus de congé sans motif |
| `CONGE_CHEVAUCHANT` | 409 | période de congé chevauchante |
| `ROLE_DEJA_EXISTANT` | 409 | un rôle RH portant ce nom existe déjà pour ce tenant |
| `ROLE_DEJA_ARCHIVE` | 409 | archivage d'un rôle RH déjà archivé |
| `ROLE_ARCHIVE` | 409 | attribution d'un rôle RH archivé |
| `ROLE_DEJA_ATTRIBUE` | 409 | ce rôle RH est déjà attribué à ce membre |
| `PARAMETRES_INVALIDES` | 422 | paramètre manquant ou mal formé (`/interne`) |
