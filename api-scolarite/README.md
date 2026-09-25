# api-scolarite — Microservice Scolarite — SIGAPEI

Microservice de gestion administrative et pedagogique de la plateforme **SIGAPEI** :
cycles, niveaux, filieres et classes, capacite en temps reel, dossiers apprenants, 
mutations/transferts internes sans duplication, emplois du temps, et consultation en lecture seule des paiements de scolarite.

- **Port** : `4004`
- **Sonde de sante** : `GET /sante`
- **Prefixe API** : toutes les routes metier sont sous `/v1/...`
- **Documentation OpenAPI** : `http://localhost:4004/docs`

---

## 1. Regle specifique majeure : Programme Pedagogique

Chaque classe porte la colonne `programme` (`beninois` ou `francais`) :
- **Programme beninois** : l'apprenant ne dispose **pas de compte de connexion propre** (`utilisateur_id` reste `NULL`), quel que soit son cycle (primaire ou secondaire) en raison de l'interdiction des telephones aux eleves durant l'annee scolaire. L'acces a son espace s'effectue exclusivement via le compte de son parent rattaché (`scolarite.parents_apprenants`).
- **Programme francais** : compte optionnel au primaire, compte utilisateur propre et actif par defaut au secondaire.
- **Cycle universitaire** : etudiant autonome titulaire de son compte dans tous les cas.
- **Mutation beninois -> francais** : declenche le provisionnement du compte de l'eleve sans jamais recreer sa fiche apprenant.

---

## 2. Routes de l'API (`/v1`)

| Methode | Endpoint | Role |
|---|---|---|
| `GET` | `/v1/classes` | Liste les classes avec programme et capacite |
| `POST` | `/v1/classes` | Cree une classe, un niveau ou une filiere |
| `GET` | `/v1/classes/{uuid}/disponibilite` | Retourne la capacite restante en temps reel (consomme par Inscription) |
| `GET` | `/v1/apprenants/{uuid}` | Dossier complet apprenant (historique, parents, classe actuelle) |
| `POST` | `/v1/apprenants/{uuid}/transfert` | Mutation/transfert vers une autre classe sans duplication du dossier |
| `GET` | `/v1/apprenants/{uuid}/paiements-scolarite` | Vue consolidee en LECTURE SEULE des factures/reglements (jointure Finances) |
| `GET` | `/v1/emplois-du-temps` | Consultation planning cours (filtre classe/enseignant/jour) |
| `POST` | `/v1/emplois-du-temps` | Creation / mise a jour d'un creneau de cours |
| `GET` | `/v1/interne/apprenants/{uuid}/classe` | Endpoint interne pour Evaluations, Finances et Vie scolaire |

---

## 3. Demarrage rapide

### Avec Docker
```bash
cp .env.example .env
docker compose up -d --build
```

### Sans Docker (Local)
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php -S 0.0.0.0:4004 -t public
```
