# Module RH - Documentation technique

Microservice **Ressources Humaines** (`api-rh`), conformément au cahier des charges
technique **`CDC_Technique_Module_RH_E-Academique.pdf`** (schéma logique `rh`).

- Stack : **Laravel 12 · PHP 8.4 · PostgreSQL (schéma `rh`) · Redis 7 · RabbitMQ**
- Exposition : `https://api-rh.e-academique.com/v1` (via la Gateway)
- Enveloppe de réponse : `{"success", "message", "data"}` ; erreurs
  `{"success": false, "message", "error": {"code", "details"?}}`
- Contrat OpenAPI 3 : [`openapi.json`](openapi.json) (`GET /docs`)

---

## 1. Périmètre couvert

| Tâche | Contenu | État |
|---|---|---|
| **Tâche 1 - Cadrage + socle technique** | Création du microservice (migrations du schéma `rh`, `Modele`/`AppartientAuTenant`/`Contexte`, middlewares `auth.tenant` + `role` + `secret.interne`, enveloppe de réponse, journalisation d'événements RabbitMQ, `Dockerfile` + `docker-compose`, contrat OpenAPI, tests d'API) | ✅ |
| **Tâche 2 - Modèle de données + endpoints CRUD** | **personnel**, **enseignant** (affectations matière ↔ classe) et **rattachement rôle** (`roles_rh`, `role_rh_modules`, `personnel_roles_rh`), avec leurs endpoints de création / consultation / modification / archivage | ✅ |
| Hors périmètre courant | Absences, évaluations du personnel, intervenants externes, charge horaire calculée, tableau de bord RH | ⏳ (autres phases du CDC §16) |
| Présent depuis l'origine | Grades, contrats, congés | ✅ |

---

## 2. Cartographie du cahier des charges

| Réf. CDC | Objet | État | Emplacement |
|---|---|---|---|
| §7.1 | `personnel` | ✅ | `database/migrations/...000002`, `app/Models/Personnel.php` |
| §7.2 | `affectations` | ✅ | `...000004`, `app/Models/Affectation.php` |
| §7.3 | `contrats` | ✅ | `...000003`, `app/Models/Contrat.php` |
| §7.4 | `conges` | ✅ | `...000005`, `app/Models/Conge.php` |
| §7.7 | `roles_rh` | ✅ **Tâche 2** | `...000006`, `app/Models/RoleRh.php` |
| §7.8 | `role_rh_modules` | ✅ **Tâche 2** | `...000007`, `app/Models/RoleRhModule.php` |
| §7.9 | `personnel_roles_rh` | ✅ **Tâche 2** | `...000008`, `app/Models/PersonnelRoleRh.php` |
| §5.7 / §14.5 | Moteur de rôles RH configurables | ✅ **Tâche 2** | `app/Common/Droits/DroitsRh.php`, `RolesRhController`, `PersonnelRolesRhController` |
| §5.1–5.4 / §11 | Endpoints personnel / affectations | ✅ | `routes/api.php` |
| §7.5, §7.6, §7.10, §7.11 | Absences, évaluations, intervenants | ⏳ | hors périmètre courant |
| §10, tableau de bord | Charge horaire, indicateurs RH | ⏳ | hors périmètre courant |

---

## 3. Écarts connus au CDC (à arbitrer)

Le module a été construit en cohérence avec les **règles transverses de la plateforme**
(cab global) qui divergent de certains choix du CDC RH. Points à trancher :

| # | Sujet | CDC RH | Implémentation | Justification |
|---|---|---|---|---|
| 1 | Références inter-schémas | FK `bigint` + **jointures SQL** vers `identite`, `scolarite`, `evaluations` | **UUID externes** (`utilisateur_uuid`, `matiere_uuid`, `classe_uuid`) + API interne `/v1/interne/*` | Règle 1 (pas de jointure inter-schéma) et règle 4 (rôle 4 = UUID externes) du cab global. **C'est aussi ce qu'utilisent déjà E-learning, Évaluations et Vie scolaire.** |
| 2 | Format d'URL | `/{slug}/personnel…` (slug d'établissement) | `/v1/personnel…` + en-tête `X-Tenant-Id` | Cohérent avec tous les autres microservices de la plateforme |
| 3 | Données d'identité | « ne jamais recopier nom/prénom » | `personnel` stocke `nom`, `prenom`, `email`, `telephone` | Nécessaire : Vie scolaire et E-learning lisent l'identité **via** ce service |
| 4 | Compte de connexion | `utilisateur_id` FK **non nul** vers `identite.utilisateurs` | `utilisateur_uuid` (externe, **nullable**) | Pas de FK locale (règle 4) ; le rattachement à un compte est optionnel |
| 5 | Statuts | `actif` / `archivé` | `actif` / `archive` (sans accent) | Codes canoniques sans accent dans toute la plateforme ; le libellé affiché reste « archivé » |

> Le tableau ci-dessus est le **seul** point ouvert entre le CDC et l'implémentation.
> Tout le reste (modèle, moteur de rôles, isolation multi-tenant, archivage, endpoints)
> est conforme.

---

## 4. Modèle de données - schéma `rh`

| Table | Colonnes principales | Contraintes / index |
|---|---|---|
| `personnel` | `uuid`, `tenant_id`, `utilisateur_uuid`, `matricule`, `nom`, `prenom`, `type_personnel`, `fonction`, `grade_id`, `date_embauche`, `statut`, `actif` | `unique(tenant_id, matricule)` ; index `(tenant_id, type_personnel)` ; `CHECK sexe` |
| `grades` | `code`, `libelle`, `categorie`, `echelon_min/max`, `active` | `unique(tenant_id, code)` ; `CHECK echelon_max >= echelon_min` |
| `contrats` | `personnel_id`, `type_contrat`, `grade_id`, `date_debut`, `date_fin`, `statut` | index partiel : **un seul contrat actif** sans date de fin par personnel |
| `affectations` | `personnel_id`, `matiere_uuid`, `classe_uuid`, `annee_scolaire`, `heures_semaine`, `statut` | index partiel : **une seule affectation active** par (personnel, matière, classe, année) |
| `conges` | `personnel_id`, `type_conge`, `date_debut`, `date_fin`, `jours`, `demandeur_uuid`, `traitee_par_uuid`, `statut` | cycle `en_attente → approuvee/refusee/annulee` |
| **`roles_rh`** | `uuid`, `tenant_id`, `nom`, `description`, `statut` (`actif`/`archive`) | **Tâche 2** - `unique(tenant_id, nom)` |
| **`role_rh_modules`** | `role_rh_id`, `fonction`, `inclus` | **Tâche 2** - `unique(role_rh_id, fonction)` ; `CHECK fonction IN (dossiers, affectations, charges_horaires, conges, evaluations, contrats_intervenants)` |
| **`personnel_roles_rh`** | `personnel_id`, `role_rh_id`, `date_attribution` | **Tâche 2** - `unique(personnel_id, role_rh_id)` |

Règles communes :
- `id` (bigint) **jamais exposé** : toutes les routes et références utilisent `uuid` (`Modele`).
- `tenant_id` indexé ; le trait `AppartientAuTenant` pose un **global scope** : sans contexte, aucune ligne n'est renvoyée (fail closed) ; une écriture chez un autre tenant est refusée.
- **Aucune suppression physique** : archivage / statuts uniquement (`statut`, `actif`, `statut=termine`…).
- Aucune FK locale vers les autres schémas : `matiere_uuid` (`evaluations`), `classe_uuid` (`scolarite`), `utilisateur_uuid` (`identite`) sont des références **externes** (règle 4).

---

## 5. Moteur de rôles RH configurables (§5.7 / §7.7-7.9 / §14.5)

Le fondateur crée des rôles RH à l'intitulé libre (ex. « Chef de département »),
choisit les fonctions du module RH accordées, puis attribue ces rôles aux membres du
personnel. Un membre peut cumuler plusieurs rôles.

### Workflow (CDC §14.5)

```
1. POST /v1/roles-rh                → création du rôle (+ fonctions initiales)
2. PATCH /v1/roles-rh/{uuid}/modules → sélection des fonctions accordées
3. POST /v1/personnel/{uuid}/roles-rh → attribution à un membre du personnel
4. GET  /v1/rh/mes-fonctions         → fonctions visibles par l'utilisateur courant
5. POST /v1/roles-rh/{uuid}/archiver  → archivage (jamais de suppression)
```

### Fonctions accordables (table `role_rh_modules`)

`dossiers` · `affectations` · `charges_horaires` · `conges` · `evaluations` · `contrats_intervenants`

### Croisement d'autorisation (§12)

```php
DroitsRh::fonctionsPourUtilisateur($utilisateurUuid)
// personnel (utilisateur_uuid) → personnel_roles_rh → roles_rh (statut=actif) → role_rh_modules (inclus=true)
```

Implémenté dans `app/Common/Droits/DroitsRh.php`, exposé sur `GET /v1/rh/mes-fonctions`.
À invoquer **en complément** du rôle générique de plateforme (`X-User-Role`), jamais
à la place (§12 : « croise le rôle générique de la plateforme, le ou les rôles RH
personnalisés… et les fonctions accordées »).

---

## 6. Endpoints `/v1`

| Méthode | Endpoint | Rôle(s) |
|---|---|---|
| `GET` / `POST` | `/personnel` | lecture : admin, personnel · création : admin |
| `GET` / `PUT` | `/personnel/{uuid}` | lecture : admin, personnel · écriture : admin |
| `POST` | `/personnel/{uuid}/statut` | admin |
| `GET` | `/personnel/{uuid}/affectations` | admin, personnel |
| `GET` / `POST` | `/personnel/{uuid}/roles-rh` | admin |
| `POST` | `/personnel/{uuid}/roles-rh/{roleUuid}/retirer` | admin |
| `GET` / `POST` | `/grades` · `PUT /grades/{uuid}` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/contrats` · `PUT /contrats/{uuid}` · `POST /contrats/{uuid}/cloturer` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/affectations` · `GET`/`PUT /affectations/{uuid}` · `POST /affectations/{uuid}/cloturer` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/conges` · `GET /conges/{uuid}` · `PUT /conges/{uuid}/traiter` | demande : admin, personnel, enseignant · traitement : admin |
| **`GET` / `POST`** | **`/roles-rh`** | **admin** |
| **`GET` / `PUT`** | **`/roles-rh/{uuid}`** | **admin** |
| **`PATCH`** | **`/roles-rh/{uuid}/modules`** | **admin** |
| **`POST`** | **`/roles-rh/{uuid}/archiver`** | **admin** |
| **`GET`** | **`/rh/mes-fonctions`** | **admin, personnel, enseignant** |
| `GET` | `/interne/personnel`, `/interne/personnel/utilisateur/{uuid}`, `/interne/affectations`, `/interne/affectations/verifier` | `X-Internal-Secret` |

En-têtes obligatoires (posés par la Gateway) : `X-Internal-Secret`, `X-Tenant-Id`,
`X-User-Id`, `X-User-Role`. Les routes `/v1/interne/*` ne s'authentifient que par le
secret, avec `tenant_id` passé en paramètre.

---

## 7. Règles métier transverses

| Règle | Mise en œuvre |
|---|---|
| Pas de suppression physique | `DELETE` non routé (405) ; archivage (`statut=archive`, `actif=false`, `termine`, `annulee`) |
| Isolation multi-tenant (§13) | global scope `AppartientAuTenant` sur chaque modèle ; écriture impossibilité hors contexte |
| Pas d'`id` interne exposé | `Modele` cache `id`/`tenant_id`, `getRouteKeyName() = uuid` |
| Règle 5 (affectations) | `affectations` = source de vérité ; vérification interne `affectations/verifier` |
| Cohérence métier | unicité du matricule, du nom de rôle par tenant, chevauchement de congé, affectation déjà active, personnel inactif |
| Événements | journalisation RabbitMQ (`rh.*.cree`, `rh.role.attribue`…) - voir README §6 |
| Performance (§13) | index sur `(tenant_id, …)` ; `par_page` borné à 100 |

> **Point d'attention** : la séparation des rôles à la validation d'un congé (§12,
> « le validateur ne peut jamais être le demandeur ») n'est **pas encore** appliquée
> sur `PUT /conges/{uuid}/traiter` - hors périmètre des tâches 1-2.

---

## 8. Vérifications

```bash
composer install
php artisan test          # tests d'API sur PostgreSQL (contraintes et index partiels testés pour de vrai)
vendor/bin/pint --test    # style de code
```

Couverture des règles critiques (§15 « jeu de tests ») :

- **isolation multi-tenant** - un rôle RH / un personnel d'un autre tenant reste invisible ;
- **moteur de rôles** - création, sélection des fonctions, attribution, retrait, archivage, rôles plateforme refusés ;
- **règle 5** - vérification d'affectation interne, affectation déjà active, personnel inactif ;
- **pas de suppression physique** - `DELETE` → 405 sur personnel et rôles RH ;
- **contrats internes** - `/interne/*` conforme aux attentes d'Évaluations, Vie scolaire et E-learning ;
- **sécurité** - `/interne/*` sans secret → 403.
