---
inclusion: always
---

# Produit — Microservice Évaluations

## 1. Rôle dans la plateforme
Le microservice **Évaluations** est le cœur pédagogique de la plateforme (domaine : `api-evaluations.e-academique.com`). Il porte tout ce qui concerne la mesure et la restitution de la performance de l'apprenant :
- saisie des notes ;
- calcul des moyennes, coefficients et classements ;
- génération des bulletins (PDF et web) ;
- organisation de compositions en ligne surveillées (lot phase 2).

Il est propriétaire exclusif du schéma `evaluations`. Il ne recopie jamais les informations dont il a besoin ; il les consulte par jointure directe auprès des schémas `scolarite` et `rh` (et `etablissements`).

Le **bulletin n'est jamais une donnée stockée en double** : il est calculé à la volée à partir de la table `notes` au moment de la consultation ou de la génération du PDF → aucune incohérence possible entre un bulletin affiché et les notes enregistrées. (Exception encadrée : l'instantané figé à la clôture de période, voir spec core.)

## 2. Objectifs
1. Saisie de notes rapide, fiable et vérifiable (affectation contrôlée).
2. Moyennes, coefficients et classements strictement reproductibles et auditables.
3. Modèle de bulletin propre à chaque établissement (mise en page, mentions, barème d'appréciation) sans développement spécifique.
4. Logique de notation adaptée au cycle (primaire, secondaire, universitaire) et au programme (béninois ou français) **sans dupliquer le moteur de calcul**.
5. Intégrité et traçabilité de toute note, de sa saisie à sa publication dans un bulletin.
6. Programmer et faire passer une composition officielle intégralement en ligne, avec une surveillance proportionnée et légalement défendable (phase 2).
7. Notifier automatiquement parents et apprenants dès qu'un résultat est disponible.
8. Absorber sans dégradation les pics de consultation de fin de période (publication des bulletins) : pic ×10.

## 3. Périmètre
**Dans le périmètre** : règles de notation par cycle/programme, coefficients et moyennes, modèles de bulletins personnalisables, classements, compositions en ligne surveillées, contestations, modèle de données, architecture, endpoints API, sécurité, relations avec les autres microservices.

**Hors périmètre (ne pas implémenter ici)** :
- l'affectation d'un enseignant à une classe/matière → microservice **Ressources Humaines** (Arsène) ;
- la structure des classes et l'emploi du temps → microservice **Scolarité** (Harold) ;
- le moteur de quiz lui-même → microservice **E-learning** (Roc), réutilisé par appel API ;
- l'authentification → microservice **Identité** (Don Diègue), via JWT de la Gateway ;
- l'envoi effectif des notifications → microservice **Communication** (Don Diègue), via RabbitMQ.
Évaluations **consulte ou orchestre** ces éléments, il ne les redéfinit pas.

## 4. Acteurs et droits (Tableau 1 — matrice acteur × action)
| Acteur | Actions possibles | Restriction principale |
|---|---|---|
| Enseignant | Saisir/modifier une note de ses matières ; programmer une composition en ligne ; consulter ses classes ; publier ses notes à la clôture | Uniquement sur ses classes/matières affectées (vérifié via `rh.affectations`) |
| Censeur / Administrateur | Consulter toutes les notes de l'établissement ; forcer une correction tracée ; configurer coefficients et modèles de bulletin ; superviser une composition en direct | Limité à son `tenant_id` |
| Apprenant | Consulter ses notes, ses bulletins, son classement ; passer une composition en ligne programmée | Lecture seule, son propre dossier uniquement |
| Parent | Consulter les notes/bulletins de chacun de ses enfants rattachés | Lecture seule, dossiers de ses enfants uniquement |
| Super Administrateur | Statistiques consolidées **anonymisées** (aucune note individuelle) | Pas d'accès à une note individuelle hors contexte de support |
| Gateway (acteur technique) | Vérifier statut du tenant et JWT | — |
| Autres microservices (acteur technique) | Vérifier l'éligibilité via les notes (Demandes administratives) | Lecture via endpoint interne uniquement |

## 5. Décisions de réunion (11/09/2026) — OBLIGATOIRES
1. Support de **modèles (templates) de bulletins personnalisables**, propres à chaque établissement.
2. **Adaptation des profils apprenants** aux spécificités du **programme béninois** et du **programme français** pour le secondaire, traitée par des **grilles d'évaluation paramétrables** et non par un développement spécifique par pays.
3. **Isolation totale du module E-learning** (pas d'écriture directe entre schémas).

## 6. Retours du comité de pilotage (relecture des CDC) — OBLIGATOIRES
1. Évaluations permet de **programmer des compositions en ligne**, de les faire passer **en temps réel** et de proposer une **surveillance**, en faisant appel aux microservices **E-learning** et **Communication**.
2. Utilisation de **RabbitMQ** pour l'interconnexion avec les autres microservices.
3. Chaque microservice est **dockerisé**.

## 7. Grilles d'évaluation et logique par cycle (Tableau 2)
| Cycle | Logique de notation | Spécificités |
|---|---|---|
| Primaire | Notes **ou** niveaux de compétence selon la grille choisie par l'établissement | Bulletin souvent orienté « appréciations » ; classement optionnel |
| Secondaire | Notation chiffrée **sur 20**, coefficients par matière, moyenne pondérée, classement | Devoirs / compositions / examens ; compositions en ligne surveillées possibles |
| Universitaire | Système de crédits/ECTS possible **en complément** de la note chiffrée | Session de rattrapage, compensation entre matières, mention de diplôme |

- Programme béninois (secondaire) : notation chiffrée sur 20 avec coefficients par matière.
- Programme français : notation équivalente, avec livrets de compétences complémentaires en primaire.
- Chaque établissement choisit, à la configuration, un **programme de référence** parmi une **bibliothèque de grilles prédéfinies**, **extensible par le Super Administrateur**.
- **PROPOSITION** (non validée en réunion) : grille « compétences » sans note chiffrée pour le premier cycle du primaire, déjà anticipée par la structure de données.

## 8. Typologie des évaluations
1. Devoir surveillé (contrôle continu)
2. Composition / examen blanc
3. Examen officiel (blanc institutionnel ou national)
4. Évaluation de compétence (primaire, sans note chiffrée)
5. Composition en ligne surveillée (nouvelle modalité, phase 2)
6. Note issue d'un devoir ou d'un quiz e-learning (report explicite — voir `compositions-en-ligne` et 15.6 du CDC, voir points à trancher)

## 9. Périodes
Une **période** (trimestre ou semestre, configurable par établissement) borne la fenêtre de saisie et de calcul. Le passage d'une période à une autre déclenche le calcul et l'archivage de l'instantané du bulletin, mais **ne bloque pas** la consultation historique des périodes précédentes.

## 10. Positionnement (état de l'art — contexte, non implémentable)
Concurrents : Pronote, EcoleDirecte (France, non adaptés Afrique de l'Ouest), KiboERP, Novacole, EvalScol Africa, Academia Helm (Afrique de l'Ouest, aucune n'documente de composition en ligne surveillée intégrée au carnet de notes officiel). Valeur ajoutée visée :
- un seul moteur de calcul moyennes/rangs partagé entre note de classe et composition en ligne, **sans double saisie** ;
- composition en ligne qui **réutilise** le moteur de quiz E-learning ;
- surveillance conçue pour rester légalement défendable dans le cadre béninois (pas de proctoring occidental plaqué) ;
- grilles d'évaluation paramétrables (béninoise, française, compétences primaire).
