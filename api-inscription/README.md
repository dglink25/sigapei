# api-inscription — Microservice Inscription (Admissions) — SIGAPEI

Microservice de gestion du parcours d'admission et de réinscription de la plateforme **SIGAPEI** :
constitution des dossiers de candidature, gestion des pièces justificatives (stockage objet S3/MinIO),
évaluation des tests d'admission, validation d'affectation avec contrôle bloquant de capacité, et reconduction
d'une année sur l'autre sans duplication de dossiers.

- **Port** : `4003`
- **Sonde de santé** : `GET /sante`
- **Préfixe API** : toutes les routes métier sont sous `/v1/...`
- **Documentation OpenAPI** : `http://localhost:4003/docs`

---

## 1. Règles d'or de l'Admission

1. **Vérification de capacité bloquante** :
   Aucune candidature ne peut être validée pour une classe ayant atteint son quota. La vérification s'opère par jointure SQL directe en temps réel sur `scolarite.classes` et `scolarite.apprenants`.
2. **Création directe sans duplication** :
   La validation insère immédiatement l'apprenant dans `scolarite.apprenants` avec son lien de traçabilité `candidature_id`. Le dossier de candidature reste l'historique d'admission immuable.
3. **Application de la règle du programme pédagogique** :
   - Si la classe visée suit le **programme béninois** : aucun compte de connexion élève n'est créé (`utilisateur_id = NULL`), le parent rattaché pilote exclusivement l'accès via `scolarite.parents_apprenants`.
   - Si la classe visée suit le **programme français** : compte élève activé dès le secondaire.
4. **Rejet motivé obligatoire** :
   Le rejet d'une candidature impose un motif textuel explicatif obligatoire stocké pour consultation du parent/candidat.
5. **Réinscriptions** :
   Reconduction de la fiche existante sur la nouvelle classe/année scolaire sans duplication.

---

## 2. Routes de l'API (`/v1`)

| Méthode | Endpoint | Rôle |
|---|---|---|
| `POST` | `/v1/candidatures` | Soumet un dossier de candidature (secrétaire ou parent) |
| `GET` | `/v1/candidatures` | Liste les candidatures du tenant (filtrable par statut/classe) |
| `GET` | `/v1/candidatures/{uuid}` | Détail d'une candidature, statut, pièces et tests |
| `POST` | `/v1/candidatures/{uuid}/pieces-justificatives` | Ajoute une pièce justificative (référencée S3/MinIO) |
| `POST` | `/v1/candidatures/{uuid}/tests-admission` | Enregistre le résultat d'un test d'admission |
| `POST` | `/v1/candidatures/{uuid}/valider` | Valide la candidature : vérifie place et génère l'apprenant |
| `POST` | `/v1/candidatures/{uuid}/rejeter` | Rejette la candidature avec un motif obligatoire |
| `POST` | `/v1/reinscriptions` | Reconduit un apprenant existant sur la nouvelle année |

---

## 3. Démarrage rapide

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
php -S 0.0.0.0:4003 -t public
```
