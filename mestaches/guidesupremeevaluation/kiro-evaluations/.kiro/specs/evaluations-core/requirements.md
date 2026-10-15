# Document d'exigences — Évaluations (cœur : sprint initial, 10 jours ouvrés)

Périmètre : phases 0 à 8 du planning. Les compositions en ligne surveillées sont dans `../compositions-en-ligne/`.
Format : EARS en français — « QUAND … ALORS le système DOIT … ». Chaque exigence cite sa section source du CDC.
Termes : **tenant** = établissement (`tenant_id`) ; **période** = trimestre/semestre configurable ; **instantané** = ligne figée de `bulletins` à la clôture.

---

## Exigence 1 — Saisie d'une note (CDC §3.2, §12, §15, §17.2)
**User story** : en tant qu'enseignant, je veux saisir/modifier les notes de mes élèves rapidement et de façon vérifiable.
1. QUAND un utilisateur authentifié appelle `POST /notes` ALORS le système DOIT vérifier, par jointure sur `rh.affectations`, que l'enseignant est affecté à la matière ET à la classe de l'évaluation **à la date de la saisie**.
2. QUAND l'affectation n'existe pas à cette date ALORS le système DOIT refuser la saisie et ne rien écrire.
3. QUAND la note est saisie ALORS le système DOIT vérifier, par jointure sur `scolarite.classes` et `scolarite.apprenants`, que l'apprenant appartient à la classe de l'évaluation.
4. QUAND la note est valide ALORS le système DOIT insérer ou mettre à jour **une seule ligne** dans `notes` (apprenant_id, evaluation_id, valeur, saisi_par, date_saisie).
5. LE système DOIT garantir qu'une note n'existe qu'à un seul endroit (table `notes`) ; aucune copie de la valeur dans un autre objet.
6. QUAND la période de l'évaluation est clôturée ALORS le système DOIT refuser la saisie ordinaire (les corrections passent par l'Exigence 12).
7. LE système DOIT enregistrer `saisi_par` (auteur) pour chaque note.

## Exigence 2 — Consultation des notes d'une classe (CDC §15)
1. QUAND un enseignant ou administrateur appelle `GET /notes/classe/{uuid}` pour une matière/période ALORS le système DOIT retourner les notes de la classe, limitées aux couples classe/matière auxquels l'enseignant est affecté (ou à tout le `tenant_id` pour l'administrateur/censeur).
2. LE système DOIT ne renvoyer que des `uuid`.

## Exigence 3 — Création d'évaluations (CDC §6.1, §13, §15)
1. QUAND un utilisateur autorisé appelle `POST /evaluations` ALORS le système DOIT créer une évaluation rattachée à une matière et à une classe avec : `matiere_id`, `classe_id`, `type`, `coefficient`, `date`, `periode`.
2. LE `type` DOIT couvrir : devoir surveillé, composition/examen blanc, examen officiel, évaluation de compétence, composition en ligne surveillée (phase 2).
3. LE système DOIT vérifier que l'enseignant est affecté à la matière et à la classe avant création (même règle que l'Exigence 1.1) — voir DECISION-10.

## Exigence 4 — Référentiel des matières et coefficients (CDC §5, §13)
1. LE système DOIT gérer un référentiel `matieres` par établissement (`tenant_id`, `nom`, `coefficient_defaut`).
2. LE système DOIT permettre qu'une matière ait un coefficient différent selon le cycle/niveau (ex. 6e vs Terminale) — modalité de stockage : DECISION-16.
3. LE coefficient d'une évaluation DOIT être porté par l'évaluation (`evaluations.coefficient`).
4. LES coefficients DOIVENT être paramétrables par un administrateur/censeur du tenant et jamais codés en dur.

## Exigence 5 — Calcul de la moyenne (CDC §5, §3.2)
1. LE système DOIT calculer la moyenne d'un apprenant sur une période selon : `somme(note × coefficient de l'évaluation × coefficient de la matière) / somme(coefficients)` — dénominateur exact : DECISION-04.
2. LE calcul DOIT être **strictement identique** quel que soit le point d'accès (web app, PDF, API interne d'un autre microservice) : un seul `CalculService`.
3. LE calcul DOIT être strictement reproductible et auditable.
4. LE mode d'arrondi DOIT être paramétrable par établissement (`modele_bulletin.arrondi`) et appliqué de façon cohérente sur tout le bulletin.
5. QUAND des notes ne sont pas saisies au moment du calcul ALORS le système DOIT, selon le choix de l'établissement, les **exclure** du calcul ou les **compter comme 0** ; ce choix DOIT être visible et documenté dans le bulletin généré.
6. QUAND il y a rattrapage ALORS la règle de substitution DOIT être celle paramétrée par l'établissement (DECISION-13).
7. QUAND la période est ouverte ALORS le système DOIT recalculer moyenne, rang et bulletin **à chaque lecture** (aucun résultat figé).
8. LE calcul d'un bulletin individuel DOIT durer **< 500 ms** en conditions normales.
9. LES notes issues de compositions en ligne DOIVENT être traitées par les mêmes règles et le même `CalculService`.

## Exigence 6 — Grilles d'évaluation par cycle et programme (CDC §4.2, décision de réunion 11/09/2026)
1. LE système DOIT proposer une **bibliothèque de grilles prédéfinies** (au minimum : béninoise secondaire sur 20 avec coefficients ; française) dont l'établissement choisit un **programme de référence** à la configuration.
2. LE super administrateur DOIT pouvoir étendre la bibliothèque (DECISION-17 pour le stockage).
3. LE moteur de calcul NE DOIT PAS coder en dur les règles par pays : elles découlent de la grille choisie.
4. LORSQUE le cycle est **primaire** ALORS la grille DOIT permettre notes ou niveaux de compétence ; classement optionnel.
5. LORSQUE le cycle est **secondaire** ALORS notation chiffrée sur 20, coefficients par matière, moyenne pondérée, classement.
6. LORSQUE le cycle est **universitaire** ALORS le système DOIT permettre crédits/ECTS en complément de la note chiffrée, session de rattrapage, compensation entre matières, mention de diplôme (règles exactes : DECISION-13).
7. QUAND un établissement est configuré ALORS le système DOIT lire `etablissements.etablissements` pour déterminer la grille par défaut à proposer.
8. (PROPOSITION non validée — DECISION-20) grille « compétences » sans note chiffrée pour le premier cycle du primaire.

## Exigence 7 — Périodes (CDC §6.2)
1. LE système DOIT gérer des périodes (trimestre ou semestre) configurables par établissement.
2. UNE période DOIT borner la fenêtre de saisie et de calcul.
3. QUAND on passe d'une période à une autre ALORS le système DOIT déclencher le calcul et l'archivage de l'instantané, **sans bloquer** la consultation historique des périodes précédentes.

## Exigence 8 — Classements et statistiques (CDC §7)
1. QUAND `GET /classements/classe/{uuid}` est appelé ALORS le système DOIT retourner le rang de chaque apprenant, calculé sur **la même moyenne pondérée que le bulletin**.
2. LE système DOIT fournir la moyenne de classe (affichée en regard de la moyenne de l'apprenant sur le bulletin).
3. LE système DOIT fournir la distribution des notes par matière (min/max/moyenne), consultable par l'enseignant et l'administrateur.
4. UN établissement DOIT pouvoir **désactiver le classement** ; dans ce cas aucun rang n'est exposé.
5. LE super administrateur DOIT n'accéder qu'à des statistiques consolidées anonymisées.

## Exigence 9 — Clôture de période et instantané (CDC §3.2, §8.1, §12, §15)
1. QUAND l'enseignant clôture la saisie de ses notes pour la période ALORS le système DOIT verrouiller sa saisie.
2. QUAND `POST /periodes/{uuid}/cloturer` est appelé (enseignant ou administrateur) à la date de clôture générale ALORS le système DOIT agréger toutes les notes de la classe et produire, pour chaque apprenant, une **moyenne, un rang et une mention**.
3. QUAND la clôture est effectuée ALORS le système DOIT figer l'**instantané** dans `bulletins` (apprenant_id, periode, moyenne, rang, mention, statut, pdf_document_id).
4. L'instantané DOIT rester **reconstructible à l'identique** depuis les notes sources.
5. LE bulletin DOIT être disponible en **consultation web immédiatement** après la clôture.
6. LE système DOIT publier un événement RabbitMQ à la clôture (Exigence 13).
7. LE cache Redis DOIT mémoriser les bulletins déjà calculés pour une période clôturée.

## Exigence 10 — Modèles de bulletin personnalisables (CDC §4.1, décision de réunion 11/09/2026)
1. LE système DOIT gérer `modele_bulletin` par `tenant_id` et par `cycle`, contenant : en-tête (logo, nom d'établissement), colonnes affichées, mentions de bas de page, échelle d'appréciation, arrondi.
2. UN établissement DOIT pouvoir définir un modèle par cycle (ex. « primaire », « secondaire ») via `POST /modeles-bulletin` (création ou mise à jour).
3. LE rendu PDF DOIT être produit par un moteur de templates qui consomme le modèle et les données calculées, **sans mélanger mise en forme et logique de calcul**.
4. UN **modèle par défaut**, sobre et académique, DOIT être fourni nativement à tout nouvel établissement n'ayant pas configuré le sien.
5. LE bulletin consultable en ligne DOIT avoir une **mise en page identique** au PDF téléchargeable.

## Exigence 11 — Génération et distribution du PDF (CDC §8.1, §8.2, §14, §18)
1. QUAND un bulletin est clôturé ALORS le système DOIT générer le PDF **de façon asynchrone** (job `GenererBulletinPdf` via RabbitMQ) en appliquant le modèle de l'établissement.
2. LA génération d'un PDF DOIT durer **< 5 s** en file asynchrone.
3. LE PDF DOIT être stocké dans le schéma transverse `documents`, référencé par `uuid` (`pdf_document_id`), **jamais dupliqué**.
4. QUAND `GET /bulletins/apprenant/{uuid}/pdf` est appelé ALORS le système DOIT retourner une **URL signée et expirante**.
5. QUAND `GET /bulletins/apprenant/{uuid}` est appelé ALORS le système DOIT retourner le bulletin courant (calculé à la volée) ou archivé.

## Exigence 12 — Corrections après clôture et audit (CDC §3.2, §9, §12, §15, §16)
1. QUAND `PUT /notes/{uuid}/corriger` est appelé ALORS un **motif est obligatoire** ; sans motif le système DOIT refuser.
2. QUAND une note déjà publiée dans un bulletin clos est modifiée ALORS le système DOIT insérer une ligne **immuable** dans `audit_note` (note_id, auteur_id, valeur_avant, valeur_apres, motif, date).
3. LES corrections post-clôture DOIVENT être réservées à l'administrateur/censeur (« forcer une correction tracée ») — voir DECISION-10 si l'enseignant peut aussi corriger.
4. QUAND un PDF avait déjà été généré ALORS le système DOIT produire une **nouvelle version** ; l'**ancienne reste consultable** en archive.
5. QUAND une note est corrigée après publication ALORS le système DOIT **invalider automatiquement** le cache Redis du bulletin concerné.
6. LA table `audit_note` DOIT être immuable (aucune modification/suppression applicative).

## Exigence 13 — Événements asynchrones RabbitMQ (CDC §14.2, §17.4)
1. LE système DOIT publier sur un échange RabbitMQ de type **topic** (jamais d'appel direct à Communication).
2. LORS de la clôture d'une période, de la génération du PDF, et (phase 2) d'une anomalie de surveillance ALORS le système DOIT publier un événement (ex. `evaluations.bulletin.publie`, `evaluations.composition.anomalie` — autres noms : DECISION-19).
3. LES messages DOIVENT être des **événements de déclenchement uniquement** (aucune donnée métier à lire par un autre microservice).
4. UNE notification DOIT parvenir au parent et à l'apprenant dès que le bulletin est disponible (via Communication, qui consomme sa propre file).
5. L'indisponibilité de Communication NE DOIT PAS affecter Évaluations.

## Exigence 14 — Contestation d'une note (CDC §9 — PROPOSITION planifiée en Phase 6)
1. QUAND un parent ou apprenant appelle `POST /contestations` pour une note qui lui semble erronée ALORS le système DOIT créer une entrée `contestation_note` (note_id, demandeur_id, statut, motif, date_ouverture) avec le statut **ouverte**.
2. LES statuts DOIVENT être : ouverte / en examen / résolue / rejetée.
3. LA contestation DOIT être adressée à l'enseignant concerné ; **en l'absence de réponse sous un délai configurable** ELLE DOIT être escaladée à l'administrateur/censeur (délai : DECISION-14).
4. LE demandeur DOIT n'accéder qu'aux notes de son propre dossier (apprenant) ou de ses enfants rattachés (parent).

## Exigence 15 — Consultation par l'apprenant et le parent (CDC §3.1, §12)
1. L'apprenant DOIT consulter en **lecture seule** ses notes, bulletins et classement.
2. LE parent DOIT consulter en **lecture seule** ceux de chacun de ses enfants rattachés.
3. QUAND un bulletin est consulté ALORS aucune écriture ne DOIT avoir lieu.
4. LA contestation DOIT être accessible depuis la consultation (relation « extend »).

## Exigence 16 — Endpoint interne d'éligibilité (CDC §15, §17.5)
1. LE système DOIT exposer `GET /interne/eligibilite-document/{apprenant_uuid}` (DECISION-03) indiquant la **disponibilité des bulletins** pour une demande administrative.
2. CET endpoint DOIT utiliser le même `CalculService` / les mêmes règles que le reste du module.
3. SEUL un microservice autorisé (appel interne) DOIT y accéder.

## Exigence 17 — Sécurité, accès, multi-tenant (CDC §16, §3.2)
1. TOUTES les requêtes DOIVENT être filtrées par `tenant_id` extrait du JWT fourni par la Gateway.
2. AUCUN identifiant interne ne DOIT apparaître en URL/réponse (uniquement `uuid`).
3. LES règles de `steering/04-securite-conformite.md` s'appliquent intégralement.

## Exigence 18 — Performance, disponibilité, scalabilité (CDC §18)
1. Calcul d'un bulletin < 500 ms ; PDF < 5 s ; disponibilité ≥ 99,5 % en période de publication ; absorption d'un pic ×10 sur la consultation de bulletins (cache Redis + queue asynchrone).
2. 100 % des corrections de notes journalisées.

## Exigence 19 — Interface utilisateur (CDC §11)
1. L'interface de saisie enseignant DOIT être **façon tableur** (grille classe × élèves), avec navigation clavier et **sauvegarde automatique à chaque cellule**.
2. LE tableau de bord enseignant DOIT afficher « notes restant à saisir » avec compte à rebours avant la date de clôture.
3. SUR mobile (PWA) LE formulaire de saisie DOIT être simplifié et optimisé pour la saisie rapide en salle de classe.
4. L'administrateur DOIT disposer d'un indicateur visuel de progression de notation par classe.
5. LE bulletin en ligne DOIT être identique visuellement au PDF.
6. (PROPOSITION non validée — DECISION-20) mode hors-ligne partiel via service worker avec synchronisation au retour du réseau.

## Exigence 20 — Qualité, tests, livraison (CDC §19, §21)
1. LE moteur de calcul DOIT être testé unitairement à **100 % des règles de barème**.
2. LE dépôt DOIT respecter l'arborescence de `steering/03-structure-projet.md`.
3. L'image Docker DOIT être construite et publiée à chaque fusion sur `main` (tag = sha), `/health` exposé.
4. L'API DOIT être documentée en OpenAPI/Swagger.
