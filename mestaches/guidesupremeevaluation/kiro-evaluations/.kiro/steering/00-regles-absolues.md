---
inclusion: always
---

# RÈGLES ABSOLUES POUR KIRO — À LIRE AVANT TOUTE ACTION

Source unique de vérité : le « Cahier des charges technique — Microservice Évaluations » (auteur : Mirco Houénangon S.), converti dans ce dépôt. Aucune autre source ne prévaut.

## 1. Fidélité totale
1. Tu implémentes **exactement** ce qui est écrit dans les fichiers de `.kiro/steering/` et `.kiro/specs/`. Tu n'ajoutes aucune fonctionnalité, aucune table, aucune colonne, aucun endpoint, aucune règle métier qui n'y figure pas.
2. Tu ne remplaces aucune technologie imposée (Laravel, PostgreSQL, Redis, RabbitMQ, Docker, GitHub Actions).
3. Quand une information est **absente ou ambiguë**, tu **ne devines pas** : tu t'arrêtes, tu consultes `.kiro/steering/05-points-a-trancher.md`, et tu poses la question à l'humain. Tu peux laisser un commentaire `// TODO(DECISION-xx)` référencé dans ce registre, mais tu n'inventes pas de comportement.
4. Les libellés `DÉCISION DE RÉUNION (11/09/2026)` et `RETOUR DU COMITÉ DE PILOTAGE` sont **obligatoires**. Les libellés `PROPOSITION (hors cahier des charges plateforme initial)` sont des propositions de l'auteur : à implémenter uniquement si la tâche correspondante le dit explicitement.
5. Aucune règle de calcul, barème, coefficient, échelle ou arrondi ne doit être codé en dur dans le moteur de calcul : tout est paramétrable par établissement (`tenant_id`) et par cycle.

## 2. Principes non négociables (reprise littérale de la section 3.2 du cahier des charges)
- Une note n'existe qu'à **un seul endroit** : la table `notes`, référencée par clé étrangère vers l'apprenant et la matière (via l'évaluation). Tout agrégat (moyenne, rang, bulletin) est un **calcul, jamais une copie**.
- Une note ne peut être saisie que par un enseignant **affecté à la matière ET à la classe concernées à la date de la saisie** (jointure sur `rh.affectations` et `scolarite.classes`).
- Aucune moyenne, aucun rang, aucun bulletin n'est stocké comme résultat figé **avant la clôture officielle de la période** : ils sont recalculés à chaque lecture tant que la période est ouverte.
- À la clôture d'une période, un **instantané** du bulletin est figé (archivage et consultation rapide) mais reste **reconstructible à l'identique** à partir des notes sources.
- Toute modification d'une note déjà publiée dans un bulletin clos est tracée (ancienne valeur, nouvelle valeur, auteur, motif).
- Barèmes, coefficients et échelles : paramétrables par établissement et par cycle, jamais en dur.
- Le calcul de moyenne, de rang et de mention est **strictement identique** que la lecture vienne de la web app, du PDF généré ou de l'API interne consommée par un autre microservice → **un seul `CalculService`** consommé par tous.
- Une note issue d'une composition en ligne suit **exactement** les mêmes règles de calcul et de coefficient qu'une note saisie manuellement : la modalité de passation ne crée jamais un second système de notation.

## 3. Règles transversales de la plateforme à respecter
- Toutes les tables : clé primaire interne `id` (bigint, **jamais exposée**) + colonne `uuid` (unique, **seule exposée** en API/URL). Aucune API ne renvoie d'identifiant interne ; aucun identifiant technique interne en URL.
- Base unique, schéma PostgreSQL `evaluations` dont ce microservice est **propriétaire exclusif**. Il ne recopie jamais d'information appartenant à d'autres schémas (identité de l'apprenant, classe, coefficient de matière, affectation enseignant) : il les lit par **jointure SQL directe en lecture** sur `scolarite`, `rh`, `etablissements`.
- Isolation multi-établissements : tout accès est filtré par `tenant_id`.
- Communication asynchrone : RabbitMQ (échange topic). Appels synchrones inter-microservices : uniquement vers E-learning (appel API explicite avec jeton de service).
- Authentification : JWT transmis par la Gateway ; **jamais** d'appel direct au microservice Identité.
- Les mineurs sont le public très majoritaire : protection renforcée des données (voir `04-securite-conformite.md`).

## 4. Ordre de lecture recommandé
1. `01-produit.md` → 2. `02-technique.md` → 3. `03-structure-projet.md` → 4. `04-securite-conformite.md` → 5. `05-points-a-trancher.md` → 6. `.kiro/specs/evaluations-core/` (requirements → design → tasks) → 7. `.kiro/specs/compositions-en-ligne/` (phase 2, **bloquée** tant que le correctif E-learning n'est pas validé avec Roc).
