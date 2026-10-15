# Document d'exigences — Compositions en ligne surveillées (PHASE 2 de la roadmap plateforme)

> **BLOQUÉ** tant que (a) le contrat d'interface avec E-learning n'est pas stabilisé et (b) le correctif du CDC E-learning (report de note par appel API et non par écriture directe) n'est pas validé avec **Roc**. Cette spec est **volontairement hors du sprint de 10 jours** (CDC §20, PROPOSITION).
> Origine : **RETOUR DU COMITÉ DE PILOTAGE** — Évaluations doit permettre de programmer des compositions en ligne, les faire passer en temps réel et proposer une surveillance, en faisant appel à **E-learning** et **Communication**.

## Principe (CDC §10.1)
Une composition en ligne est **un quiz E-learning** porteur de l'attribut `type = composition_officielle`, **créé par Évaluations via appel API** vers E-learning. **Aucun second moteur de quiz** n'est implémenté dans Évaluations. E-learning fournit déjà : QCM, vrai/faux, questions ouvertes, chronométrage optionnel, tentatives limitées, correction automatique, correction assistée par IA pour les questions ouvertes.

## Différences quiz ordinaire / composition officielle (Tableau 3)
| Aspect | Quiz e-learning ordinaire | Composition officielle |
|---|---|---|
| Initiative | Enseignant, visée pédagogique/entraînement | Enseignant ou administrateur, dans le cadre d'une période d'évaluation officielle |
| Report de note | Optionnel, décidé au cas par cas | **Automatique dès validation** (évaluation officielle par nature) |
| Surveillance | Aucune (hors périmètre E-learning V1) | Niveaux 1 à 3 disponibles |
| Chronométrage | Optionnel, côté client possible | **Obligatoire**, autorité **exclusivement côté serveur** |

---

## Exigence C1 — Programmation (CDC §10.3, §12)
1. QUAND un enseignant ou administrateur appelle `POST /compositions` (matière, classe, date, heure de début, durée, niveau de surveillance) ALORS le système DOIT : vérifier l'affectation (enseignant) ; créer une `evaluations` avec `est_composition_en_ligne = true`, `quiz_elearning_uuid`, `niveau_surveillance` ; créer le quiz côté E-learning via `POST /quiz` avec `type = composition_officielle` et un **jeton de service**.
2. QUAND la composition est programmée ALORS le système DOIT envoyer une **notification préalable** (événement RabbitMQ → Communication) aux familles/apprenants.
3. TOUTE établissement activant les niveaux 2 ou 3 DOIT avoir communiqué les modalités de surveillance **avant la première composition concernée** (via Communication).

## Exigence C2 — Déroulement en temps réel (CDC §10.3)
1. À l'heure programmée, l'accès DOIT s'ouvrir pour les apprenants de la classe concernée.
2. LE chronomètre DOIT être piloté **exclusivement par l'horloge serveur d'E-learning**, jamais par l'horloge locale ; dérive tolérée **< 1 s** par session.
3. LES réponses DOIVENT être **sauvegardées au fil de l'eau** (auto-save par question) pour ne rien perdre en cas de coupure réseau.
4. À la fin du temps imparti, la **soumission** DOIT être **automatique**.
5. LES QCM et questions à correction automatique DOIVENT être corrigés immédiatement ; les questions ouvertes passent par la correction assistée par IA d'E-learning ; **la note IA n'est jamais définitive sans validation de l'enseignant**.
6. QUAND l'enseignant valide ALORS E-learning DOIT notifier Évaluations par **RabbitMQ**, et Évaluations DOIT écrire la note dans `evaluations.notes` **via le canal normal** (mêmes règles de calcul/coefficient qu'une note manuelle). **Jamais d'écriture directe de E-learning dans `evaluations.notes`.**
7. Disponibilité ≥ **99,9 %** sur la fenêtre de l'examen.
8. Tentative enregistrée côté E-learning (`POST /quiz/{uuid}/tentatives`) ; anomalies journalisées côté Évaluations.

## Exigence C3 — Niveau 1 : Activité (par défaut) (CDC §10.5)
1. LE système DOIT imposer le **plein écran**, détecter la **perte de focus / changement d'onglet**, **bloquer le copier-coller**, utiliser le **chronomètre serveur**.
2. CHAQUE anomalie DOIT être **horodatée et journalisée** via `POST /compositions/{uuid}/incidents` dans `surveillance_incident` (evaluation_id, apprenant_id, type_anomalie, horodatage, niveau_preuve).
3. AUCUNE donnée biométrique ; aucun consentement spécifique requis au-delà du règlement intérieur.

## Exigence C4 — Niveau 2 : Capture périodique (optionnel) (CDC §10.5)
1. QUAND activé ALORS le système DOIT prendre une **photo fixe** de la webcam à intervalles **espacés** (**pas de flux vidéo continu**) — intervalle exact : DECISION-14.
2. LES photos DOIVENT être consultables **uniquement par le personnel habilité** et **uniquement en cas d'anomalie signalée**.
3. LES photos DOIVENT être **chiffrées au repos** et **purgées automatiquement** après un délai configurable (**30 jours par défaut**).
4. L'activation est possible **établissement par établissement**, avec **accord du représentant légal recueilli à l'inscription**, **jamais un simple clic en cours d'examen**.
5. AUCUNE transmission à un service tiers d'analyse automatique.

## Exigence C5 — Niveau 3 : Supervision humaine (optionnel) (CDC §10.5)
1. LE système DOIT fournir à un surveillant humain, via `GET /compositions/{uuid}/supervision`, un tableau de bord **temps réel** : liste des candidats connectés, statut, nombre d'anomalies détectées.
2. **JAMAIS** d'analyse automatique par IA du comportement ou du visage.
3. Supervision humaine uniquement ; **aucune décision automatisée de sanction**.
4. L'administrateur/censeur DOIT pouvoir superviser une composition en direct.

## Exigence C6 — Alternative et information préalable (CDC §10.6)
1. TOUT établissement activant les niveaux 2 ou 3 DOIT proposer une **modalité alternative en présentiel** à tout apprenant/famille ne souhaitant pas être filmé ou photographié.
2. AVANT de démarrer, l'apprenant DOIT voir un **écran d'information** rappelant : règles, durée, **niveau de surveillance actif**, et le **mécanisme de contestation** en cas d'anomalie signalée à tort.
3. L'UI de composition DOIT afficher un **chronomètre visible en permanence** et une **alerte avant la fin du temps imparti** (CDC §11).

## Exigence C7 — Niveaux cumulables et configurables
1. LES trois niveaux sont **cumulables** et **configurables par établissement**. Le niveau 1 est le niveau par défaut.

## Exigence C8 — Conformité légale (CDC §10.4) — voir `steering/04-securite-conformite.md`
Reconnaissance faciale interdite ; base légale contractuelle (règlement intérieur) ; alternative présentielle ; accès restreint au personnel habilité ; proportionnalité. **Aucune détection IA de triche en V1.**

## Exigence C9 — Auditabilité
100 % des incidents de surveillance journalisés ; accès aux données de surveillance restreint aux parents rattachés et au personnel autorisé (mineurs).
