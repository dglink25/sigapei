---
inclusion: always
---

# Technique — Stack, architecture, intégrations, exigences non fonctionnelles

## 1. Stack imposée (ne pas substituer)
| Élément | Valeur imposée |
|---|---|
| Framework | **Laravel** (PHP) |
| Image Docker de base | `php:8.3-fpm-alpine` |
| Extensions PHP | `pdo_pgsql`, `redis`, `amqp` (client RabbitMQ) |
| Base de données | **PostgreSQL**, base unique de la plateforme, schéma `evaluations` |
| Cache | **Redis** |
| Bus d'événements / broker de files | **RabbitMQ** (mutualisé au niveau plateforme) |
| CI/CD | **GitHub Actions** |
| Documentation API | **OpenAPI/Swagger** |
| Front | Web App / **PWA** (via Passerelle API / Gateway) |
| Stockage PDF | Schéma transverse `documents` (référencé par `uuid`) |

## 2. Architecture interne (Figure 3, décrite)
```
Web App / PWA ──┐
                ├──> Passerelle API (Gateway) ──> Microservice Évaluations (Laravel)
                │
Microservice Évaluations (Laravel) contient :
  ├─ Contrôleurs API : notes, bulletins, modèles, compositions
  ├─ Service Calcul        (moyennes, rangs, mentions)
  ├─ Service Bulletin      (agrégation + instantané)
  ├─ Service Template      (rendu PDF par modèle)
  ├─ Service Contestation
  ├─ Service Composition   (orchestration E-learning + surveillance)
  └─ Queue (jobs PDF asynchrones, publiée sur RabbitMQ)

Dépendances externes du microservice :
  ├─ PostgreSQL — schéma `evaluations` (+ jointures en lecture sur scolarite, rh, etablissements)
  ├─ RabbitMQ   — bus d'événements
  ├─ Scolarité  — jointure SQL directe (classes / apprenants)
  ├─ RH         — jointure SQL directe (affectations)
  ├─ E-learning — appel API (quiz / tentatives)
  └─ Documents (stockage PDF)  ←→  Communication (consomme RabbitMQ)
```
Lecture de la figure : la Web App/PWA et la Gateway convergent vers le microservice ; le microservice repose sur cinq dépendances en bas (PostgreSQL, RabbitMQ, Scolarité, RH, E-learning) ; le stockage Documents est relié au microservice, et Communication consomme les messages RabbitMQ.

## 3. Composants internes (responsabilités exactes)
- **Service Calcul** : moteur **unique** de calcul des moyennes/rangs/mentions, consommé **identiquement** par l'API web, la génération PDF et les endpoints internes.
- **Service Bulletin** : orchestre la clôture de période, l'archivage de l'instantané et la génération du PDF.
- **Service Template** : applique le `modele_bulletin` choisi par l'établissement au rendu PDF (sépare mise en forme et logique de calcul).
- **Service Contestation** : gère le workflow de contestation de note.
- **Service Composition** : orchestre la création d'un quiz E-learning pour une composition officielle, relaie le chronomètre serveur, collecte les incidents de surveillance, déclenche le report automatique de note à la validation.
- **Cache Redis** : mémorise les bulletins déjà calculés pour une **période clôturée** ; **invalidé automatiquement** à toute correction post-publication.
- **Queue asynchrone** : absorbe les pics de génération de PDF en fin de trimestre (broker : RabbitMQ).

## 4. RabbitMQ — bus d'événements asynchrones (retour comité de pilotage)
- RabbitMQ **remplace** le mécanisme d'événement applicatif interne prévu au CDC plateforme pour les notifications asynchrones. Il **ne remplace pas** les jointures SQL directes pour les lectures temps réel (même base unique, aucun appel réseau).
- Évaluations publie sur un **échange RabbitMQ de type `topic`** (exemples de routing keys : `evaluations.bulletin.publie`, `evaluations.composition.anomalie`) au lieu d'appeler directement Communication.
- Communication consomme depuis **sa propre file** → disponibilité de Communication totalement découplée de celle d'Évaluations.
- RabbitMQ sert aussi de **broker pour la file de génération des PDF** de bulletins.
- **Aucune donnée métier** n'est lue depuis RabbitMQ par un autre microservice : RabbitMQ ne transporte que des **événements de déclenchement** (principe « base unique, pas de synchronisation de données »).
- Événements publiés par Évaluations vers Communication : à la clôture d'une période, à la génération du PDF, à la détection d'une anomalie de surveillance.
- Événement reçu par Évaluations : E-learning notifie (RabbitMQ) la **validation finale d'une tentative** → déclenche l'écriture de la note dans `evaluations.notes` côté Évaluations.

## 5. Relations avec les autres microservices (Figure 4 + section 17)
```
Scolarité  --(jointure SQL directe, lecture)--> Évaluations
RH         --(jointure SQL directe, lecture)--> Évaluations
Identité   --(JWT via Gateway)---------------> Évaluations
Évaluations --(jointure SQL directe, lecture)--> Demandes administratives
Évaluations --(RabbitMQ, événement)----------> Communication
Évaluations --(appel API explicite)----------> E-learning (création/gestion de quiz)
```
| Microservice | Responsable | Nature | Communication exacte |
|---|---|---|---|
| Scolarité | Harold | Amont **critique** | Jointure SQL directe en lecture sur `scolarite.classes` et `scolarite.apprenants` : valider qu'un apprenant appartient à la classe pour laquelle une note est saisie |
| Ressources Humaines | Arsène | Amont **critique** | Jointure SQL directe en lecture sur `rh.affectations`. **Vérification de sécurité la plus importante du module** : avant toute saisie de note, le `CalculService`/couche de saisie confirme que l'enseignant authentifié est affecté à la matière et à la classe |
| Identité | Don Diègue | Transversale | JWT transmis par la Gateway, **jamais** d'appel direct à Identité |
| Communication | Don Diègue | Aval | Événement RabbitMQ (clôture période, PDF généré, anomalie de surveillance) |
| Demandes administratives | — | Aval | Jointure SQL directe en lecture, exposée via endpoint interne `/interne/eligibilite-document` |
| E-learning | Roc | Appel API | Appel API explicite authentifié par **jeton de service** : `POST /quiz`, `POST /quiz/{uuid}/tentatives` ; retour par RabbitMQ à la validation finale |
| Établissements | — | Amont légère | Jointure SQL directe en lecture sur `etablissements.etablissements` pour déterminer la grille d'évaluation par défaut à proposer à la configuration |

### Point de coordination E-learning (BLOQUANT pour la phase composition, pas pour le sprint initial)
Le CDC E-learning rédigé par Roc décrit le report de note comme une **écriture directe** dans `evaluations.notes` (« même base, pas de synchronisation différée »). Cela **contredit l'isolation totale** actée en réunion. Règle pour Kiro : **Évaluations n'autorise jamais une écriture directe de E-learning dans `evaluations.notes`**. Le report de note ET la création de quiz passent par appel API explicite + événement RabbitMQ. Le correctif doit être validé avec Roc avant le démarrage de l'intégration des compositions en ligne.

## 6. Exigences non fonctionnelles (Tableau 8)
| Exigence | Cible / seuil |
|---|---|
| Temps de calcul d'un bulletin individuel | **< 500 ms** en conditions normales |
| Temps de génération d'un PDF de bulletin | **< 5 s**, en file asynchrone (RabbitMQ) |
| Disponibilité en période de publication de bulletins | **≥ 99,5 %** |
| Disponibilité pendant une composition en ligne | **≥ 99,9 %** sur la fenêtre de l'examen |
| Précision du chronomètre serveur | dérive tolérée **< 1 seconde** sur une session |
| Scalabilité | absorption d'un **pic ×10** sur la consultation de bulletins |
| Auditabilité | **100 %** des corrections de notes et incidents de surveillance journalisés |
| Protection des mineurs | accès notes/bulletins/données de surveillance restreint aux parents rattachés et au personnel autorisé |

## 7. Dockerisation (retour comité de pilotage)
- Image de base `php:8.3-fpm-alpine` avec extensions `pdo_pgsql`, `redis`, `amqp`.
- **Dockerfile en deux étapes** : (1) build Composer, (2) image d'exécution allégée.
- `docker-compose.yml` local : orchestre `api-evaluations` (**port interne uniquement**), avec dépendance vers PostgreSQL et Redis **partagés** ; RabbitMQ **mutualisé** au niveau plateforme.
- Variables d'environnement injectées via **GitHub Actions Secrets** en production, **jamais commitées** (`.env.example` fourni sans secrets).
- **Healthcheck HTTP `/health`** consommé par l'orchestrateur.
- Build et publication de l'image sur **chaque fusion vers `main`**, avec **tag versionné = sha du commit**.

## 8. Tests
- `tests/Unit/` : moteur de calcul — **priorité absolue**.
- Moteur de calcul testé unitairement à **100 % des règles de barème**.
- Tests unitaires exhaustifs = Phase 2 du planning (3 jours).

## 9. Livrables attendus (section 21)
1. Dépôt Git dédié `api-evaluations`, pipeline CI/CD GitHub Actions, image Docker publiée à chaque fusion sur `main`.
2. Schéma `evaluations` détaillé : migrations, contraintes, index.
3. Moteur de calcul unique testé à 100 % des règles de barème.
4. API REST documentée (OpenAPI/Swagger).
5. Interface de configuration des modèles de bulletin et des grilles d'évaluation.
6. Interface de saisie enseignant et de suivi de progression.
7. Moteur de génération PDF paramétrable.
8. Module de contestation et de correction tracée.
9. Module de programmation et de supervision des compositions en ligne avec les trois niveaux de surveillance (**phase 2**).
10. Documentation technique du contrat d'interface avec E-learning, **une fois le correctif validé avec Roc**.
