# api-evaluations — Microservice Évaluations — SIGAPEI

Notes, coefficients, moyennes, classements, bulletins — calcul à la volée, zéro duplication.
Compositions en ligne surveillées (phase 2 — bloquée).

- **Port** : `4006`
- **Préfixe API** : `/v1/...`
- **Sonde de santé** : `GET /health` (la route native `/sante` de Laravel reste exposée)
- **Stack** : Laravel 12, PHP 8.4, PostgreSQL schéma `evaluations`, Redis DB 4, RabbitMQ

---

## 1. Démarrage rapide

```bash
cp .env.example .env
# Renseigner DB_USERNAME, DB_PASSWORD, INTERNAL_API_SECRET (valeurs du chef de projet)

# Avec Docker
docker compose up -d --build
docker compose exec api-evaluations php artisan migrate
docker compose exec api-evaluations php artisan db:seed

# Sans Docker
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve --host=0.0.0.0 --port=4006
```

---

## 2. Sécurité (règles plateforme n°3 et n°5)

- `auth.tenant` : les en-têtes Gateway `X-Tenant-Id`, `X-User-Id` (uuid), `X-User-Role` (liste fermée) ne sont acceptés **qu'avec un `X-Internal-Secret` valide** (32 caractères minimum, comparaison en temps constant). Sans lui, n'importe quel conteneur du réseau pourrait se déclarer administrateur. Fail closed.
- `role:...` : matrice du Tableau 1 ; le contrôle fin (affectation, enfant rattaché, dossier propre) est fait côté service.
- `/v1/interne/*` : `X-Internal-Secret` uniquement.
- Aucune jointure SQL inter-schémas : Scolarité est interrogé via `GET /v1/interne/apprenants?uuid=…`.

## 2 bis. Règle fondamentale

Le bulletin **n'est jamais stocké en double**. Il est calculé à la volée depuis `evaluations.notes` par le `CalculService`. Un instantané est figé à la clôture de période, reconstructible à l'identique.

---

## 3. Schéma `evaluations`

| Table | Rôle |
|---|---|
| `matieres` | Référentiel matières par tenant, coefficient par défaut |
| `evaluations` | Évaluation ponctuelle ou composition en ligne |
| `notes` | **Source unique de tout calcul** |
| `bulletins` | Instantané archivé à la clôture |
| `modele_bulletin` | Mise en page par tenant/cycle |
| `contestation_note` | Contestations parent/apprenant |
| `audit_note` | Journal immuable des corrections |
| `surveillance_incident` | Anomalies de surveillance (phase 2) |

---

## 4. Endpoints `/v1`

| Méthode | Endpoint | Rôle |
|---|---|---|
| `POST` | `/evaluations` | Crée une évaluation |
| `POST` | `/notes` | Saisit une note (vérif. affectation RH) |
| `GET` | `/notes/classe/{uuid}` | Notes d'une classe |
| `PUT` | `/notes/{uuid}/corriger` | Correction tracée, motif obligatoire |
| `POST` | `/periodes/{uuid}/cloturer` | Clôture + calcul + PDF async |
| `GET` | `/bulletins/apprenant/{uuid}` | Bulletin courant ou archivé |
| `GET` | `/bulletins/apprenant/{uuid}/pdf` | URL signée PDF |
| `GET` | `/classements/classe/{uuid}` | Rangs et statistiques |
| `POST` | `/modeles-bulletin` | Modèle PDF par tenant/cycle |
| `POST` | `/contestations` | Ouvre une contestation |
| `POST` | `/compositions` | Programme composition *(phase 2)* |
| `GET` | `/compositions/{uuid}/supervision` | Supervision *(phase 2)* |
| `POST` | `/compositions/{uuid}/incidents` | Incidents surveillance *(phase 2)* |
| `GET` | `/interne/eligibilite-document/{uuid}` | Endpoint interne → Demandes admin |

---

## 5. Points bloquants avant implémentation complète

| ID | Sujet |
|---|---|
| DECISION-04 | Dénominateur exact de la formule de moyenne |
| DECISION-13 | Règle de départage des ex æquo, seuils mentions, arrondi |
| DECISION-15 | Ressource "période" : table dédiée ou champ texte ? |
| DECISION-18 | Noms de colonnes exacts dans `rh.affectations` et `scolarite` |
| C0.1 + C0.2 | Correctif E-learning (Roc) — bloquant pour phase 2 |
