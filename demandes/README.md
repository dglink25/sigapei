# api-demandes - Microservice Demandes administratives - SIGAPEI

Guichet unique : **demandes de documents** (tout profil : apprenant, parent, enseignant, personnel, rôles personnalisés), **permissions d'absence** et **réclamations** bidirectionnelles. Qui gère quoi est entièrement paramétrable par l'établissement.

- **Port interne** : `4007` (réseau `sigapei`) - **Préfixe** : `/v1` - **Santé** : `GET /sante`
- **Documentation** : Swagger UI sur `GET /docs`, OpenAPI brut sur `GET /docs-json` (même convention qu'Identité)
- **Stack** : NestJS 10 (TypeScript), PostgreSQL schéma `demandes` (SQL paramétré, migrations TypeORM), RabbitMQ, PDF (pdfkit)

---

## 1. Démarrage

1. `npm install` puis `cp .env.example .env` ; renseigner `DB_*` et `INTERNAL_API_SECRET` (valeurs du chef de projet).
2. **Hôte Neon DIRECT** pour les migrations (sans `-pooler` dans `DB_HOST`).
3. Créer le schéma **une seule fois** (une migration ne peut pas le faire) :
   ```bash
   node -e "const {Client}=require('pg');require('dotenv').config();const c=new Client({host:process.env.DB_HOST,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,ssl:{rejectUnauthorized:true}});c.connect().then(()=>c.query('CREATE SCHEMA IF NOT EXISTS demandes')).then(()=>{console.log('schema demandes OK');return c.end()})"
   ```
4. `npm run migration:run`, puis `npm run start:dev` (ou `docker compose up -d --build`).

Tests (PostgreSQL local requis : contraintes et triggers testés pour de vrai, base `sigapei_test`) :

```bash
DB_HOST=127.0.0.1 DB_PASSWORD=... npm test
```

## 2. Sécurité

| Couche | Règle |
|---|---|
| Entrée | Deux voies seulement (règle n°5) : **front** `Authorization: Bearer` vérifié **par Identité** (introspection ; cache 60 s, refus 10 s) ; **Gateway** `X-Tenant-Id`, `X-User-Id`, `X-User-Role` acceptés **uniquement avec `X-Internal-Secret`** (32 car. min., temps constant). Le contexte ne vient jamais d'en-têtes du navigateur. |
| Module | L'utilisateur doit avoir accès au module dans Identité (`/interne/acces` : rôle autorisé **et** service activé pour l'établissement). `super_admin` : aucun accès. |
| Actions | Grille rôle × action propre à l'établissement (`/gouvernance`) : jamais un intitulé de rôle dans le code. Seule règle fixe : l'administrateur peut tout. |
| Relation | Demande pour un apprenant : uniquement soi-même ou un enfant rattaché (Scolarité). Document du personnel : dossier RH du compte. |
| Tenant | `tenant_id` écrit dans chaque requête SQL ; uuid d'établissement converti par Établissements. 404 (pas 403) sur la ressource d'un autre. |
| Base | Historique des demandes, messages de réclamation et journal d'audit **en ajout seul** ; document délivré **figé** ; aucune suppression de demande, permission ou réclamation : **triggers PostgreSQL**. |
| Documents | PDF produit depuis l'instantané figé (empreinte SHA-256 imprimée), téléchargé par **lien signé HMAC valable 5 min** (clé dérivée HKDF du secret interne). |
| Dépendances | Identité, Établissements, Scolarité, RH ou Évaluations muet ⇒ **503**, jamais un accès ou une éligibilité accordés par défaut. |
| Divers | Débit limité par utilisateur (120/min ; 10/min sur les créations ; 30/min/IP sur les PDF), validation stricte (champ inconnu refusé), `helmet`, CORS en liste blanche, aucune trace d'erreur en réponse. |

## 3. Cycle d'une demande de document

`recue` → vérification automatique → `bloquee` (motif affiché, le demandeur règle puis **resoumet**) ou `en_traitement` → `prete` (document généré, téléchargeable) ; `rejetee` (motif obligatoire) ; `annulee` par le demandeur tant que ce n'est pas prêt. Un rôle habilité peut **prioriser** ou accorder une **dérogation** motivée et journalisée. L'éligibilité est revérifiée au moment de la génération. Chaque étape est horodatée (suivi « façon colis »).

| Catégorie du type | Vérifications possibles (cochées par l'établissement) |
|---|---|
| `apprenant` | `dossier_actif` (Scolarité), `bulletins_publies` (Évaluations), `solde_a_jour` (Finances : aucune échéance passée impayée) |
| `personnel` | `contrat_actif` (RH) |
| `tout_profil` | aucune - traitement manuel (le gestionnaire peut saisir le texte du document) |

## 4. Schéma `demandes`

| Table | Rôle |
|---|---|
| `types_document` | Types par établissement : catégorie, règles, modèle du PDF (en-tête, titre, corps avec variables, mentions, signataire, lieu) |
| `demandes_administratives` | Demande, statut, motifs, priorité, dérogation, document figé + empreinte |
| `demande_etapes` | Chronologie de la demande (ajout seul) |
| `permissions_absence` | Permission d'absence et décision |
| `reclamations`, `message_reclamation` | Fils de réclamation, accusés de lecture (messages en ajout seul) |
| `permissions_role` | Grille rôle × action (+ périmètre par catégorie de réclamation) |
| `journal_audit` | Dérogations, rejets, décisions, changements de permissions (ajout seul) |
| `compteurs` | Références sans trou par établissement et par année (`DA-2026-000042`, `RC-2026-000007`) |

## 5. Endpoints `/v1`

| Méthode | Endpoint | Qui |
|---|---|---|
| `GET` | `/types-document` (`?tous=1`) | tout utilisateur (actifs) ; gestionnaire `configurer_types` (tous) |
| `POST` / `PATCH` | `/types-document`, `/types-document/{uuid}` | `configurer_types` |
| `POST` | `/types-document/initialiser` | `configurer_types` - ajoute les 6 types standards absents |
| `POST` | `/demandes` | tout profil |
| `GET` | `/demandes/mes-demandes` | le demandeur |
| `GET` | `/demandes` (`statut`, `type_document_uuid`, `recherche`, `tri`, `page`) | `consulter_demandes` |
| `GET` | `/demandes/{uuid}`, `/demandes/{uuid}/document` | demandeur ou `consulter_demandes` |
| `POST` | `/demandes/{uuid}/resoumettre`, `/demandes/{uuid}/annuler` | le demandeur |
| `PUT` | `/demandes/{uuid}/traiter`, `/rejeter`, `/priorite` | `traiter_demande` |
| `PUT` | `/demandes/{uuid}/derogation` | `accorder_derogation` |
| `GET` | `/documents/{uuid}?t=&e=&s=` | lien signé uniquement - le PDF |
| `POST` / `GET` | `/permissions-absence`, `/permissions-absence/mes-demandes` | parent ou apprenant |
| `GET` / `PUT` | `/permissions-absence`, `/permissions-absence/{uuid}/decision` | `valider_permission_absence` |
| `POST` | `/permissions-absence/{uuid}/annuler` | le demandeur |
| `POST` / `GET` | `/reclamations`, `/reclamations/mes-reclamations`, `/reclamations/{uuid}`, `/reclamations/{uuid}/messages` | tout profil (son fil) |
| `GET` / `POST` / `PUT` | `/reclamations`, `/reclamations/vers-usager`, `/reclamations/{uuid}/statut` | `repondre_reclamation` (sur ses catégories) |
| `GET` | `/gouvernance/mes-actions` | tout utilisateur (adapter l'interface) |
| `GET` / `PUT` | `/gouvernance/permissions`, `/gouvernance/permissions/{role_code}` | administrateur |
| `GET` | `/statistiques` | `consulter_statistiques` |
| `GET` | `/interne/permission-active/{apprenant_uuid}?date=` | Vie scolaire (`X-Internal-Secret` + `X-Tenant-Id`) |
| `GET` | `/interne/permissions-role/{role_code}` | Identité (`X-Internal-Secret` + `X-Tenant-Id`) |

Réponses : `{success, message?, data}` ; listes : `data.elements` + `data.pagination` ; erreurs : `{success: false, message, error: {code, details?}}`.

## 6. Événements RabbitMQ (échange `sigapei.events`, après validation de la transaction)

`demandes.statut.change` · `demandes.permission.soumise` · `demandes.permission.decision` · `demandes.reclamation.ouverte` · `demandes.reclamation.message` · `demandes.reclamation.statut` - chacun porte `tenant_id` et, quand il existe, `destinataire_uuid` (Communication).

## 7. Contrats attendus des autres microservices

| Service | Besoin |
|---|---|
| **Identité** | `GET /v1/interne/introspection?token=` et `GET /v1/interne/acces?utilisateurUuid=&serviceCode=` (existent) ; le module doit figurer au catalogue sous le code `demandes` (`IDENTITE_CODE_SERVICE`). Granularité action par action : à terme `role_permissions` transversal (CDC §5.2), la grille locale en est le repli. |
| **Établissements** | `GET /v1/interne/etablissements?uuid=` doit renvoyer **`id`** (comme pour Scolarité). |
| **Scolarité** | `GET /v1/interne/apprenants?uuid=` avec `utilisateur_uuid`, `parents[].parent_uuid`, `nom`, `prenom`, `matricule`, `date_naissance`, `classe.nom`. Et, pour la vue multi-enfants du front, un filtre `?parent_uuid=`. |
| **RH** | `GET /v1/interne/personnel/utilisateur/{utilisateur_uuid}` (existe). |
| **Évaluations** | `GET /v1/interne/eligibilite-document/{apprenant_uuid}` (existe). |
| **Vie scolaire** (Paul) | consommer `GET /v1/interne/permission-active/{apprenant_uuid}?date=` → `{permissionnaire, permission: {uuid, date_debut, date_fin}}`. |
| **Finances** | `GET /v1/interne/solde/{apprenant_uuid}` (existe) : règle `solde_a_jour`. |
