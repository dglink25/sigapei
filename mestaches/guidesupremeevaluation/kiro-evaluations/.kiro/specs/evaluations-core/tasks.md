# Plan d'implémentation — Évaluations (cœur)

Ordre = phases du Tableau 9. Équipes : **Cœur calcul** (phases 1-3), **Bulletins & intégrations** (phases 4-7), **Toutes** (0 et 8). Chaque tâche cite les exigences de `requirements.md`. Ne rien créer qui ne soit pas listé ; bloquer sur les DECISION-xx concernées.

- [ ] **0. Phase 0 — Cadrage (0,5 j, toutes équipes)**
  - [ ] 0.1 Valider les grilles d'évaluation (béninoise sur 20 avec coefficients, française) et leur stockage (DECISION-17) — Exigence 6
  - [ ] 0.2 Valider le contrat d'interface avec E-learning (`POST /quiz`, `POST /quiz/{uuid}/tentatives`, jeton de service, événement RabbitMQ de validation) — voir spec `compositions-en-ligne`
  - [ ] 0.3 Trancher les points du registre `05-points-a-trancher.md` bloquants pour les phases 1-3 (DECISION-04, 11, 13, 15, 16, 18)

- [ ] **1. Phase 1 — Socle (1 j, Cœur calcul)**
  - [ ] 1.1 Initialiser le dépôt `api-evaluations` selon l'arborescence normalisée — Exigence 20
  - [ ] 1.2 Migrations du schéma `evaluations` : `matieres`, `evaluations`, `notes`, `bulletins`, `modele_bulletin`, `contestation_note`, `audit_note`, `surveillance_incident` ; `id` bigint + `uuid` unique ; contraintes et index — Exigence 17, 20
  - [ ] 1.3 Rendre `audit_note` immuable (pas de UPDATE/DELETE applicatif)
  - [ ] 1.4 Seeders : grilles prédéfinies (béninoise, française), modèle de bulletin par défaut
  - [ ] 1.5 Middleware d'authentification JWT (Gateway) + extraction `tenant_id` + filtrage tenant global
  - [ ] 1.6 Endpoint `/health`
  - [ ] 1.7 Dockerfile (2 étapes, `php:8.3-fpm-alpine`, `pdo_pgsql`, `redis`, `amqp`), `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml` (build + tag sha sur `main`) — Exigence 20

- [ ] **2. Phase 2 — Service Calcul + tests unitaires exhaustifs (3 j, Cœur calcul)**
  - [ ] 2.1 `CalculService` : moyenne pondérée (DECISION-04 d'abord), arrondi paramétrable, notes non saisies (exclues ou 0), rattrapage paramétrable — Exigence 5
  - [ ] 2.2 Rang, moyenne de classe, distribution min/max/moyenne par matière, classement désactivable — Exigence 8
  - [ ] 2.3 Mention / échelle d'appréciation depuis `modele_bulletin` (jamais en dur) — Exigence 5, 6
  - [ ] 2.4 Support des cycles primaire/secondaire/universitaire via grille (ECTS/compensation selon DECISION-13) — Exigence 6
  - [ ] 2.5 Tests unitaires de **100 %** des règles de barème, y compris reproductibilité et identité des résultats web/PDF/API interne — Exigence 20
  - [ ] 2.6 Vérification perf : bulletin individuel < 500 ms — Exigence 18

- [ ] **3. Phase 3 — Saisie de notes, vérification d'affectation via RH (2 j, Cœur calcul)**
  - [ ] 3.1 `RhClient` : jointure `rh.affectations` à la date de saisie (DECISION-18) — Exigence 1
  - [ ] 3.2 `ScolariteClient` : jointure `scolarite.classes`/`apprenants` — Exigence 1
  - [ ] 3.3 `POST /evaluations` — Exigence 3
  - [ ] 3.4 `POST /notes` et `GET /notes/classe/{uuid}` — Exigences 1, 2
  - [ ] 3.5 Référentiel matières/coefficients paramétrables — Exigence 4
  - [ ] 3.6 Périodes (DECISION-15) et verrouillage de saisie — Exigence 7, 9.1
  - [ ] 3.7 Interface de saisie façon tableur, sauvegarde auto par cellule, navigation clavier ; vue « notes restant à saisir » avec compte à rebours ; formulaire PWA mobile simplifié — Exigence 19

- [ ] **4. Phase 4 — Modèles de bulletin (2,5 j, Bulletins & intégrations)**
  - [ ] 4.1 `POST /modeles-bulletin` (création/mise à jour par tenant et cycle) — Exigence 10
  - [ ] 4.2 `TemplateService` : rendu PDF paramétrable (en-tête, colonnes, bas de page, échelle, arrondi) sans logique de calcul — Exigence 10
  - [ ] 4.3 Modèle par défaut sobre et académique — Exigence 10.4
  - [ ] 4.4 Interface de configuration des modèles et des grilles — Exigence 6, 10
  - [ ] 4.5 Affichage du choix « notes non saisies » dans le bulletin — Exigence 5.5
  - [ ] 4.6 Bulletin web à mise en page identique au PDF — Exigence 10.5

- [ ] **5. Phase 5 — Clôture de période, PDF asynchrone RabbitMQ (1,5 j, Bulletins & intégrations)**
  - [ ] 5.1 `BulletinService` + `POST /periodes/{uuid}/cloturer` : calcul, instantané `bulletins`, bulletin web immédiat — Exigence 9
  - [ ] 5.2 Job `GenererBulletinPdf` via queue RabbitMQ ; stockage `documents` (uuid) ; < 5 s — Exigence 11
  - [ ] 5.3 `GET /bulletins/apprenant/{uuid}` et `/pdf` (URL signée expirante) — Exigence 11, 15
  - [ ] 5.4 `GET /classements/classe/{uuid}` — Exigence 8
  - [ ] 5.5 Cache Redis des bulletins de périodes clôturées — Exigence 9.7, 18
  - [ ] 5.6 `RabbitMqPublisher` : échange topic, événement à la clôture et au PDF généré (DECISION-19) — Exigence 13
  - [ ] 5.7 Indicateur de progression de notation par classe (admin) — Exigence 19.4

- [ ] **6. Phase 6 — Contestations et corrections tracées (1 j, Bulletins & intégrations)**
  - [ ] 6.1 `PUT /notes/{uuid}/corriger` : motif obligatoire, `audit_note`, invalidation cache, nouvelle version PDF (ancienne archivée) — Exigence 12
  - [ ] 6.2 Service Contestation + `POST /contestations` + statuts + escalade après délai configurable (DECISION-14) — Exigence 14
  - [ ] 6.3 Contrôles d'accès parent/apprenant (dossier propre / enfants rattachés) — Exigence 15

- [ ] **7. Phase 7 — Intégrations : Demandes administratives, E-learning, Communication (1 j, Bulletins & intégrations)**
  - [ ] 7.1 `GET /interne/eligibilite-document/{apprenant_uuid}` — Exigence 16
  - [ ] 7.2 Publication RabbitMQ consommée par Communication (notifications parents/apprenants) — Exigence 13
  - [ ] 7.3 Squelette `ElearningClient` (jeton de service) — **sans activer les compositions** tant que le correctif Roc n'est pas validé

- [ ] **8. Phase 8 — Tests, recette, documentation, déploiement (2 j, toutes équipes)**
  - [ ] 8.1 Tests d'intégration des règles d'accès (enseignant/admin/apprenant/parent/super admin) et du filtrage tenant — Exigence 17
  - [ ] 8.2 Documentation OpenAPI/Swagger — Exigence 20.4
  - [ ] 8.3 Recette des NFR : perf, pic ×10, auditabilité 100 % — Exigence 18
  - [ ] 8.4 Publication de l'image Docker sur fusion `main`, `/health` — Exigence 20.3
