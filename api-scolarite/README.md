# api-scolarite — Microservice Scolarité — SIGAPEI

Microservice de gestion administrative et pédagogique de la plateforme **SIGAPEI** :
cycles, niveaux, filières et classes, calcul de capacité en temps réel, dossiers apprenants, 
mutations/transferts internes sans duplication, plannings/emplois du temps, et consultation en lecture seule des paiements de scolarité.

- **Port** : `4004`
- **Sonde de santé** : `GET /sante`
- **Préfixe API** : toutes les routes métier sont sous `/v1/...`
- **Catalogue interactif des endpoints (JSON)** : `GET /docs` (public, sans authentification)
- **Documentation complète en Markdown** : [docs/api-documentation.md](file:///c:/Users/PC/Documents/Projets/sigapei/api-scolarite/docs/api-documentation.md)

---

## 1. Règle Spécifique Majeure : Programme Pédagogique

Chaque classe porte la colonne `programme` (`beninois` ou `francais`) :
- **Programme béninois** : l'apprenant ne dispose **d'aucun compte de connexion propre** (`utilisateur_id` reste `NULL`), quel que soit son cycle (primaire ou secondaire) en raison de l'interdiction formelle du téléphone aux élèves durant l'année scolaire. L'accès aux notes, emploi du temps et demandes s'effectue exclusivement via le compte de son parent rattaché (`scolarite.parents_apprenants`).
- **Programme français** : compte optionnel au primaire, compte utilisateur propre et actif par défaut au secondaire.
- **Cycle universitaire** : étudiant autonome titulaire de son compte dans tous les cas.
- **Mutation béninois $\rightarrow$ français** : déclenche automatiquement le besoin de provisionnement du compte élève sans jamais recréer sa fiche apprenant.

---

## 2. Routes de l'API (`/v1`)

| Méthode | Endpoint | Rôle |
|---|---|---|
| `GET` | `/docs` | **Catalogue interactif JSON** de tous les endpoints et leurs formats |
| `GET` | `/sante` | Sonde de santé du microservice |
| `GET` | `/v1/classes` | Liste les classes avec programme et capacité |
| `POST` | `/v1/classes` | Crée une classe, un niveau ou une filière |
| `GET` | `/v1/classes/{uuid}/disponibilite` | Retourne la capacité restante en temps réel (consommé par Inscription) |
| `GET` | `/v1/apprenants/{uuid}` | Dossier complet apprenant (historique, parents, classe actuelle) |
| `POST` | `/v1/apprenants/{uuid}/transfert` | Mutation/transfert vers une autre classe sans duplication du dossier |
| `GET` | `/v1/apprenants/{uuid}/paiements-scolarite` | Vue consolidée en LECTURE SEULE des factures/règlements (jointure Finances) |
| `GET` | `/v1/emplois-du-temps` | Consultation planning cours (filtre classe/enseignant/jour) |
| `POST` | `/v1/emplois-du-temps` | Création / mise à jour d'un créneau de cours |
| `GET` | `/v1/interne/apprenants/{uuid}/classe` | Endpoint interne pour Évaluations, Finances et Vie scolaire |

> [!NOTE]
> Pour le détail des paramètres de requête, corps JSON et formats de retour de chaque route, consultez le [dossier docs](file:///c:/Users/PC/Documents/Projets/sigapei/api-scolarite/docs/api-documentation.md) ou appelez directement `GET http://localhost:4004/docs`.

---

## 3. Architecture & Modèle de Données

Schéma PostgreSQL : `scolarite`
- `scolarite.classes` : `(id, uuid, tenant_id, nom, cycle, niveau, filiere, programme, capacite, statut, created_at, updated_at)`
- `scolarite.apprenants` : `(id, uuid, tenant_id, classe_id, utilisateur_id, candidature_id, matricule, nom, prenom, date_naissance, sexe, statut, created_at, updated_at)`
- `scolarite.historique_classes` : `(id, uuid, tenant_id, apprenant_id, ancienne_classe_id, nouvelle_classe_id, motif, date_transfert, effectue_par_utilisateur_id, created_at, updated_at)`
- `scolarite.emplois_du_temps` : `(id, uuid, tenant_id, classe_id, enseignant_id, matiere_id, creneau, jour, heure_debut, heure_fin, salle, statut, created_at, updated_at)`
- `scolarite.parents_apprenants` : `(id, tenant_id, parent_id, apprenant_id, lien_parente, est_responsable_legal, est_contact_urgence, created_at, updated_at)`

---

## 4. Démarrage Rapide

### Avec Docker
```bash
cp .env.example .env
docker compose up -d --build
```

### Sans Docker (Développement local)
```bash
composer install
cp .env.example .env
php -S 0.0.0.0:4004 -t public
```
