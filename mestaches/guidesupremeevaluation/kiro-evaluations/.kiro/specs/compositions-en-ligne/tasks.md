# Plan d'implémentation — Compositions en ligne surveillées (phase 2)

**Ne démarrer aucune tâche avant** : tâche C0 validée. Les tâches sont déduites des exigences C1-C9 et du design ; la source ne fournit pas de planning détaillé pour ce lot.

- [ ] **C0. Prérequis bloquants**
  - [ ] C0.1 Correctif du CDC E-learning validé avec Roc (report de note par appel API + RabbitMQ, plus d'écriture directe dans `evaluations.notes`)
  - [ ] C0.2 Contrat d'interface E-learning documenté (`POST /quiz`, `POST /quiz/{uuid}/tentatives`, jeton de service, événement de validation)
  - [ ] C0.3 Trancher DECISION-11, 14, 19 (énumérations, stockage des captures, noms d'événements)

- [ ] **C1. Programmation**
  - [ ] C1.1 `ElearningClient` HTTP avec jeton de service — Exigence C1
  - [ ] C1.2 `POST /compositions` : création `evaluations` + quiz E-learning (`type = composition_officielle`) — C1
  - [ ] C1.3 Notification préalable via RabbitMQ → Communication — C1.2, C6

- [ ] **C2. Passation**
  - [ ] C2.1 Ouverture à l'heure programmée ; chrono exclusivement serveur — C2
  - [ ] C2.2 Écran de démarrage (règles, durée, niveau de surveillance actif, mécanisme de contestation) ; chronomètre visible ; alerte avant la fin — C6
  - [ ] C2.3 Consommateur RabbitMQ « validation finale d'une tentative » → écriture dans `notes` par le canal normal — C2.6
  - [ ] C2.4 Report automatique de la note à la validation — C2.6

- [ ] **C3. Surveillance niveau 1**
  - [ ] C3.1 Client : plein écran, détection perte de focus/onglet, blocage copier-coller — C3
  - [ ] C3.2 `POST /compositions/{uuid}/incidents` → `surveillance_incident` ; événement `evaluations.composition.anomalie` — C3

- [ ] **C4. Surveillance niveau 2 (optionnel par établissement)**
  - [ ] C4.1 Capture photo périodique (pas de flux vidéo) — C4
  - [ ] C4.2 Stockage chiffré au repos, accès restreint au personnel habilité sur anomalie ; purge automatique (30 j par défaut, configurable) — C4
  - [ ] C4.3 Vérification que l'accord du représentant légal a été recueilli à l'inscription — C4.4

- [ ] **C5. Surveillance niveau 3 (optionnel)**
  - [ ] C5.1 `GET /compositions/{uuid}/supervision` : candidats connectés, statut, nombre d'anomalies — C5

- [ ] **C6. Alternative présentielle et conformité**
  - [ ] C6.1 Prise en charge de la modalité alternative en présentiel pour niveaux 2 et 3 — C6.1
  - [ ] C6.2 Contrôles : aucune biométrie, aucune IA de détection, aucune sanction automatisée — C8

- [ ] **C7. Tests et recette**
  - [ ] C7.1 Dérive chronomètre < 1 s ; disponibilité 99,9 % — C2
  - [ ] C7.2 Traçabilité 100 % des incidents — C9
