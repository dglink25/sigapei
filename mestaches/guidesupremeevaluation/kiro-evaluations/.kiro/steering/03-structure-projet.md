---
inclusion: always
---

# Structure du projet — dépôt `api-evaluations`

Arborescence **normalisée** imposée (section 19). Ne pas la réorganiser.

```
api-evaluations/
├── app/
│   ├── Http/Controllers/        NotesController, BulletinsController, CompositionsController
│   ├── Services/
│   │   ├── CalculService.php        moteur unique moyenne/rang/mention
│   │   ├── BulletinService.php
│   │   ├── TemplateService.php
│   │   └── CompositionService.php   orchestration E-learning + surveillance
│   ├── Jobs/GenererBulletinPdf.php  job asynchrone (queue RabbitMQ)
│   └── Integrations/
│       ├── ScolariteClient.php, RhClient.php, ElearningClient.php
│       └── RabbitMqPublisher.php
├── database/migrations/ + seeders/
├── tests/Unit/                  (moteur de calcul — priorité absolue)
├── docker/Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
├── .env.example
└── composer.json
```

## Règles de structure
1. Les contrôleurs cités sont **minimaux** : `NotesController`, `BulletinsController`, `CompositionsController`. Les endpoints qui n'ont pas de contrôleur cité (évaluations, périodes, classements, modèles de bulletin, contestations, endpoint interne) → voir `05-points-a-trancher.md` (DECISION-09) avant de créer de nouveaux contrôleurs. Un `ContestationService` est nommé dans l'architecture (Service Contestation) mais n'a pas de fichier listé : à créer dans `app/Services/` en suivant la même convention de nommage.
2. Les **clients d'intégration** (`ScolariteClient`, `RhClient`, `ElearningClient`) sont les seuls points d'accès aux autres microservices/schémas ; `RabbitMqPublisher` est le seul point de publication d'événements.
3. `ScolariteClient` et `RhClient` encapsulent des **jointures SQL directes en lecture** (même base), pas des appels HTTP. `ElearningClient` est le seul client **HTTP** (appel API explicite, jeton de service).
4. Aucune logique de calcul en dehors de `CalculService`. Les contrôleurs, `BulletinService`, `TemplateService` et les endpoints internes **appellent** `CalculService`.
5. `TemplateService` ne contient **aucune** logique de calcul (séparation mise en forme / calcul).
6. Les jobs asynchrones (PDF) passent par la queue publiée sur **RabbitMQ**.
7. Migrations : une par table du schéma `evaluations`, avec contraintes et index (livrable obligatoire).
8. Seeders : bibliothèque de grilles prédéfinies (béninoise, française), modèle de bulletin par défaut.

## Conventions API
- Base : `https://api-evaluations.e-academique.com/v1`.
- Les endpoints ne renvoient **que des `uuid`**, jamais d'identifiant interne.
- Toutes les tables : `id` (bigint, jamais exposé) + `uuid` (unique, seul exposé).
- Endpoint de santé : `GET /health` (non versionné par défaut — voir point à trancher DECISION-12).

## Fichiers CI/CD
- `.github/workflows/ci.yml` : tests, build de l'image, publication à chaque fusion sur `main`, tag = sha du commit ; secrets via GitHub Actions Secrets.
- `docker/Dockerfile` : deux étapes (build Composer puis image d'exécution allégée).
- `.env.example` : variables sans valeurs secrètes.
