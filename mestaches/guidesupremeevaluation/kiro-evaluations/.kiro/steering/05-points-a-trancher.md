---
inclusion: always
---

# Registre des points à trancher (incohérences et lacunes de la source)

Ces points n'ont **pas** de réponse dans le cahier des charges. Kiro **ne doit pas les décider seul** : il pose la question à l'humain et laisse `TODO(DECISION-xx)`. La colonne « Défaut sûr » indique ce que Kiro peut faire **en attendant** sans trahir la source.

## A. Incohérences internes au document (la source se contredit)
| ID | Constat dans la source | Défaut sûr en attendant |
|---|---|---|
| DECISION-01 | Table d'instantané nommée `bulletin_periode` (§3.2) **et** `bulletins` (§13.1, Tableau 6, Figure 2 classe `Bulletin`) | Utiliser `bulletins` (modèle de données = référence normative) |
| DECISION-02 | Journal de modification nommé `audit_log` (§3.2, §9, Tableau 5) **et** `audit_note` (§13.1, §16, Figure 2 `AuditNote`) | Utiliser `audit_note` |
| DECISION-03 | Endpoint interne écrit `/interne/eligibilitedocument/{apprenant_uuid}` (Tableau 7) **et** `/interne/eligibilite-document` (§17.5) | Utiliser `/interne/eligibilite-document/{apprenant_uuid}` |
| DECISION-04 | Formule de moyenne (§5) : `somme(note × coef évaluation × coef matière) / somme(coefficients)` — le dénominateur « somme(coefficients) » ne précise pas s'il s'agit de `coef évaluation × coef matière` | **Ne pas coder** tant que non tranché ; écrire les tests unitaires avec la formule littérale en commentaire |
| DECISION-05 | Figure 2 : `Evaluation` n'a pas `est_composition_en_ligne`, `quiz_elearning_uuid`, `niveau_surveillance` ; `ModeleBulletin` n'a pas `colonnes_affichees`, `arrondi` ; `Bulletin` n'a pas `pdf_document_id` | Le Tableau 6 (§13.1) est plus complet → il prime ; la Figure 2 est « simplifiée » |
| DECISION-06 | Le Gantt (10 j) exclut les compositions en ligne, mais §21 les liste en livrable et le Tableau 9 totalise 14,5 j-équipe (parallélisme de 2 équipes) | Sprint initial = specs `evaluations-core` ; compositions = spec `compositions-en-ligne` (phase 2) |
| DECISION-07 | Figure 1 : une flèche semble relier Apprenant/Parent à « Programmer une composition en ligne », alors que le Tableau 1 réserve la programmation à Enseignant/Administrateur et fait **passer** la composition à l'apprenant | Suivre le Tableau 1 (apprenant = passe, enseignant/admin = programme) |
| DECISION-08 | Renvoi « voir section 15.6 » pour le report explicite d'une note de quiz (§6.1) : la section 15.6 n'existe pas (la §15 ne contient que le tableau des endpoints) ; c'est la §17.6 qui traite du sujet | Appliquer §10 et §17.6 uniquement |

## B. Lacunes (information absente de la source)
| ID | Lacune | Défaut sûr |
|---|---|---|
| DECISION-09 | Contrôleurs non cités pour : évaluations, périodes, classements, modèles de bulletin, contestations, endpoint interne | Demander la convention de nommage ; sinon un contrôleur par ressource REST |
| DECISION-10 | Aucun endpoint pour : résoudre/traiter une contestation, escalade, clôture par un enseignant de **ses** notes, « publier ses notes à la clôture », lister/configurer coefficients/matières/périodes/grilles, supervision de niveau 3 autre que `GET /compositions/{uuid}/supervision`, consultation des captures niveau 2 | Ne pas créer d'endpoint hors Tableau 7 sans validation |
| DECISION-11 | Types SQL, longueurs, contraintes (NOT NULL, UNIQUE, FK) des colonnes ; énumérations de `type`, `statut`, `periode`, `cycle`, `type_anomalie`, `niveau_preuve` ; présence de `created_at/updated_at` | Colonnes listées au Tableau 6 uniquement + `id`/`uuid` ; types à confirmer |
| DECISION-12 | Corps de requête/réponse détaillés des endpoints, codes HTTP d'erreur, pagination, format d'erreur ; `/health` versionné ou non | Champs minimaux déduits du modèle de données (voir design) ; le reste à confirmer |
| DECISION-13 | Règle de départage des ex æquo au classement ; seuils des mentions ; fonction d'arrondi (valeurs possibles de `arrondi`) ; règle de substitution précise du rattrapage ; règle de compensation universitaire ; calcul ECTS | Ne pas implémenter tant que non tranché (paramétrable par établissement, voir design) |
| DECISION-14 | Table/stockage des **captures webcam niveau 2** (aucune table dans le Tableau 6) ; durée exacte entre captures ; délai d'escalade des contestations (« délai configurable ») ; fréquence/format de la purge | Phase 2 uniquement ; ne rien créer avant validation |
| DECISION-15 | Table des périodes (une « période » est un champ texte `periode` dans `evaluations`/`bulletins`, mais `POST /periodes/{uuid}/cloturer` suppose une ressource avec `uuid`) | Demander : créer une table `periodes` ou référencer une période d'un autre schéma |
| DECISION-16 | Table des **coefficients par matière/niveau** (§5 : « une même matière peut avoir un coefficient différent en 6e et en Terminale ») : seul `matieres.coefficient_defaut` est listé au Tableau 6 | Utiliser `coefficient_defaut` ; table de surcharge par niveau à valider |
| DECISION-17 | Table des **grilles d'évaluation** (« bibliothèque de grilles prédéfinies, extensible par le super administrateur ») : absente du Tableau 6 | À valider avant création |
| DECISION-18 | Schémas `scolarite`, `rh`, `etablissements` : noms exacts des colonnes non fournis | Demander à Harold (Scolarité) et Arsène (RH) |
| DECISION-19 | Routing keys RabbitMQ : seuls `evaluations.bulletin.publie` et `evaluations.composition.anomalie` sont nommés ; événements « clôture de période » et « PDF généré » sans nom | Réutiliser le motif `evaluations.<objet>.<événement>` après validation |
| DECISION-20 | Statut des **PROPOSITIONS** : grille « compétences » (primaire), mode hors-ligne PWA, workflow de contestation (déjà planifié Phase 6), absence d'IA de détection | Contestation : implémenter (planifiée). Grille compétences et hors-ligne PWA : ne pas implémenter sans validation |

## C. Règles de conduite
1. Un point de la section A : appliquer le **défaut sûr** et signaler.
2. Un point de la section B : **s'arrêter** sur la tâche concernée et poser la question ; poursuivre les tâches indépendantes.
3. Toute nouvelle ambiguïté découverte est ajoutée à ce registre avec un nouvel ID `DECISION-nn`.
