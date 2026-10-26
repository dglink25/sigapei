# Documentation de l'API - evaluations (Notes, barèmes, bulletins)

Microservice de la plateforme **SIGAPEI** : notes, barèmes, coefficients, moyennes, classements, bulletins et contestations.

- **Port interne** : `4006` (non publié ; accès via la Gateway sur le réseau `sigapei`)
- **Préfixe** : `/v1`
- **Santé** : `GET /health` (et `GET /sante`)
- **Contrat OpenAPI 3 (JSON)** : `GET /docs` - fichier source : [`docs/openapi.json`](openapi.json), importable dans Postman, Insomnia ou Swagger Editor
- **Base** : PostgreSQL (Neon), schéma `evaluations`

---

## 1. Principes communs

### 1.1 En-têtes obligatoires

Toutes les routes `/v1/*` (sauf `/v1/interne/*`) exigent les 4 en-têtes posés par la **Gateway** après validation du JWT :

| En-tête | Contenu | Exemple |
|---|---|---|
| `X-Internal-Secret` | `INTERNAL_API_SECRET` de la plateforme | *(secret partagé)* |
| `X-Tenant-Id` | id numérique de l'établissement (claim `tenantId`) | `12` |
| `X-User-Id` | uuid de l'utilisateur (claim `sub`) | `d9aaa710-fe09-4c69-8e5b-ac4a3355c039` |
| `X-User-Role` | `super_admin`, `administrateur`, `personnel`, `enseignant`, `apprenant`, `parent` | `enseignant` |

Sans `X-Internal-Secret` valide, les autres en-têtes sont ignorés et la requête est refusée (**401**) : un client ne peut pas se déclarer administrateur en ajoutant lui-même `X-User-Role`.

Routes `/v1/interne/*` (appels entre microservices) : `X-Internal-Secret` + `X-Tenant-Id` uniquement.

### 1.2 Format des réponses

Succès :
```json
{ "success": true, "message": "Notes enregistrées.", "data": { } }
```

Liste paginée (`?page=1&par_page=25`, 100 maximum) :
```json
{ "success": true, "message": "Opération réussie.", "data": [ ], "meta": { "page": 1, "par_page": 25, "total": 1, "pages": 1 } }
```

Erreur :
```json
{ "success": false, "message": "Message lisible par l'utilisateur", "error": { "code": "CODE_TECHNIQUE", "details": { "champ": ["…"] } } }
```

- Notes, moyennes et coefficients sont des **chaînes décimales** (`"14.50"`), jamais des nombres flottants. Envoyez-les aussi en chaînes (`"valeur": "14.5"`).
- Identifiants : **uuid uniquement**. Aucun identifiant interne n'est exposé.
- Aucune trace technique dans les erreurs : le détail est uniquement dans les journaux du serveur.

### 1.3 Codes HTTP

| Code | Signification | Codes techniques fréquents |
|---|---|---|
| 200 / 201 | Succès / créé | |
| 202 | Traitement lancé en tâche de fond | (clôture de période) |
| 401 | Contexte Gateway absent ou invalide | `APPEL_NON_AUTORISE`, `TENANT_MANQUANT`, `NON_AUTHENTIFIE` |
| 403 | Rôle ou relation refusés | `ACCES_REFUSE`, `ROLE_INVALIDE` |
| 404 | Introuvable **dans cet établissement** | `RESSOURCE_INTROUVABLE` |
| 409 | Conflit métier | `PERIODE_CLOTUREE`, `NOTE_MODIFIEE_ENTRE_TEMPS`, `SAISIE_VERROUILLEE`, `PARAMETRES_NON_CONFIGURES`, `PERIODE_NON_OUVERTE`, `CONTESTATION_EN_COURS`, `PDF_EN_ATTENTE` |
| 422 | Données invalides (`error.details` par champ) | `DONNEES_INVALIDES` |
| 429 | Trop de requêtes (120/min/utilisateur ; 10/min pour clôture et contestation) | `TROP_DE_REQUETES` |
| 503 | Service amont (Scolarité) muet ou contrat incomplet : **refus par défaut** | `SERVICE_DEPENDANT_INDISPONIBLE` |

### 1.4 Qui voit quoi

| Rôle | Accès |
|---|---|
| `administrateur` | Tout son établissement |
| `enseignant` | Ses évaluations ; classes et matières où il est affecté (emploi du temps Scolarité) |
| `apprenant` | Son propre bulletin, ses contestations |
| `parent` | Bulletins de ses enfants rattachés, ses contestations |
| `super_admin`, `personnel` | Aucune note individuelle |

### 1.5 Calcul (rappel)

1. **Moyenne d'une matière** selon `ponderation_types` de l'établissement. Défaut béninois : toutes les interrogations forment **une** note (leur moyenne MI), chaque devoir et chaque composition comptent une note ⇒ `(MI + D1 + D2) / 3`.
2. **Moyenne générale** = Σ(moyenne matière × coefficient matière) / Σ(coefficients).
3. Une épreuve notée sur 10 ou 40 (`note_sur`) est ramenée sur le barème de la grille (20).
4. Arrondi au plus proche à `decimales` (2 par défaut). Rang sur la moyenne affichée ; ex æquo = même rang (1, 2, 2, 4).

---

## 2. Parcours type

1. L'administrateur choisit un barème et configure les règles : `GET /v1/grilles`, puis `PUT /v1/parametres-notation/{cycle}`.
2. Il crée les matières et les périodes : `POST /v1/matieres`, `POST /v1/periodes`.
3. L'enseignant crée ses évaluations et saisit les notes : `POST /v1/evaluations`, `POST /v1/notes`.
4. Tout le monde consulte le bulletin provisoire : `GET /v1/bulletins/apprenant/{uuid}`.
5. L'administrateur clôture la période : `POST /v1/periodes/{uuid}/cloturer`, ce qui archive les bulletins.
6. Après clôture, une correction se fait par `PUT /v1/notes/{uuid}/corriger` et crée une nouvelle version des bulletins concernés.

---

## 3. Endpoints

### 3.1 Barèmes et règles

#### `GET /v1/grilles?cycle=secondaire` - administrateur, enseignant
Barèmes de la plateforme (`origine: plateforme`) et ceux de l'établissement.
```json
{ "success": true, "data": [ {
  "uuid": "31398e42-9cd0-427b-b341-ea8a2275dd6e", "code": "beninois_secondaire",
  "nom": "Programme béninois - Secondaire (sur 20)", "cycle": "secondaire", "programme": "beninois",
  "type_notation": "chiffree", "note_min": "0.00", "note_max": "20.00",
  "avec_coefficients": true, "avec_classement": true, "origine": "plateforme" } ] }
```

#### `POST /v1/grilles` - administrateur
Barème propre à l'établissement. Champs : `code` (a-z, 0-9, _), `nom`, `cycle`, `programme` (`beninois` | `francais` | `autre`), `type_notation` (`chiffree` | `competences`), `note_min`, `note_max`, `avec_coefficients`, `avec_classement`, `niveaux_competence` (obligatoire pour `competences` : `[{"code":"A","libelle":"Acquis"}, …]`), `description`.

#### `GET /v1/parametres-notation/{cycle}` - administrateur, enseignant
Renvoie **409 `PARAMETRES_NON_CONFIGURES`** tant que l'établissement n'a pas configuré le cycle. Aucun calcul n'est possible avant.

#### `PUT /v1/parametres-notation/{cycle}` - administrateur
```json
{
  "grille_uuid": "31398e42-9cd0-427b-b341-ea8a2275dd6e",
  "decimales": 2,
  "note_non_saisie": "exclure",
  "absence_non_justifiee": "zero",
  "regle_rattrapage": "meilleure",
  "classement_actif": true,
  "ponderation_types": {
    "interrogation": { "mode": "bloc", "poids": "1" },
    "composition":   { "mode": "individuel", "poids": "2" }
  },
  "echelle_appreciation": [
    { "min": "0",  "max": "10", "mention": "Insuffisant" },
    { "min": "10", "max": "12", "mention": "Passable" },
    { "min": "12", "max": "14", "mention": "Assez bien" },
    { "min": "14", "max": "16", "mention": "Bien" },
    { "min": "16", "max": "20", "mention": "Très bien" }
  ]
}
```

| Champ | Valeurs (défaut) |
|---|---|
| `ponderation_types` | par type : `mode` `bloc` / `individuel`, `poids`. Types non envoyés : défaut béninois |
| `decimales` | 0 à 3 (**2**) |
| `note_non_saisie` | `exclure` (**défaut**) / `zero` |
| `absence_non_justifiee` | `zero` (**défaut**) / `exclure` |
| `regle_rattrapage` | `meilleure` (**défaut**) / `remplacer` / `moyenne` |
| `classement_actif` | **true** / false |
| `echelle_appreciation` | tranches `[min, max[` contiguës couvrant exactement le barème |

Erreur d'échelle (422) :
```json
{ "success": false, "message": "Tranche 2 : elle doit commencer exactement où la précédente se termine (tranches triées et contiguës).",
  "error": { "code": "DONNEES_INVALIDES", "details": { "echelle_appreciation": ["Tranche 2 : …"] } } }
```

#### `POST /v1/modeles-bulletin` - administrateur
Mise en page du bulletin d'un cycle (aucune règle de calcul). Renvoie 201 à la création, 200 à la mise à jour.
```json
{ "cycle": "secondaire",
  "en_tete": { "titre": "Collège Exemple", "sous_titre": "Bulletin trimestriel" },
  "colonnes_affichees": ["matiere", "coefficient", "moyenne", "moyenne_classe", "rang", "appreciation"],
  "mentions_bas_de_page": "Le chef d'établissement" }
```

### 3.2 Matières

| Méthode | Route | Rôles | Corps |
|---|---|---|---|
| `GET` | `/v1/matieres?actives=true` | admin, enseignant | - (paginé) |
| `POST` | `/v1/matieres` | admin | `{"code":"MATH","nom":"Mathématiques","coefficient_defaut":"4"}` |
| `PUT` | `/v1/matieres/{uuid}` | admin | `nom`, `coefficient_defaut`, `active` (tous optionnels) |
| `PUT` | `/v1/matieres/{uuid}/coefficients` | admin | `{"coefficients":[{"cycle":"secondaire","niveau":"Tle","coefficient":"5"}]}` (remplace tout) |

Réponse type :
```json
{ "uuid": "01a1372e-2602-7080-9c18-d25037ea394d", "code": "MATH", "nom": "Mathématiques",
  "coefficient_defaut": "4.00", "active": true,
  "coefficients": [ { "uuid": "01a1372e-2607-…", "cycle": "secondaire", "niveau": "Tle", "coefficient": "5.00" } ] }
```
Le `niveau` doit correspondre exactement au `niveau` de la classe chez Scolarité (`3e`, `Tle`…).

### 3.3 Périodes

#### `POST /v1/periodes` - administrateur
```json
{ "annee_scolaire": "2026-2027", "cycle": "secondaire", "type": "trimestre", "numero": 1,
  "libelle": "1er trimestre", "date_debut": "2026-10-01", "date_fin": "2026-12-20" }
```
Réponse 201 : la période avec `uuid` et `statut: "ouverte"`. Refus 409 si les dates chevauchent une autre période du même cycle.

#### `GET /v1/periodes?annee_scolaire=2026-2027&cycle=secondaire` - tous les rôles de l'établissement (paginé)

#### `POST /v1/periodes/{uuid}/cloturer` - administrateur
Réponse **202** : la clôture tourne en tâche de fond. Elle calcule toutes les classes, archive un bulletin par apprenant, puis passe la période en `cloturee`. C'est tout ou rien : en cas d'échec, la période redevient `ouverte`.
```json
{ "success": true, "message": "Clôture lancée : les bulletins sont en cours d'archivage.",
  "data": { "periode_uuid": "01a1372e-25fd-726e-9ffa-df5004030b6b", "statut": "en_cloture" } }
```
Une deuxième demande renvoie 409 `PERIODE_NON_OUVERTE`.

### 3.4 Évaluations

#### `POST /v1/evaluations` - enseignant affecté, administrateur
```json
{ "periode_uuid": "01a1372e-25fd-726e-9ffa-df5004030b6b",
  "matiere_uuid": "01a1372e-2602-7080-9c18-d25037ea394d",
  "classe_uuid": "c1523a72-7888-410e-87b3-68b2ba072486",
  "type": "interrogation", "libelle": "Interrogation 1",
  "date_evaluation": "2026-10-10", "note_sur": "10" }
```
- `type` : `interrogation`, `devoir_surveille`, `composition`, `examen_officiel`, `evaluation_competence`, `note_elearning`.
- `coefficient` (défaut `1`) : multiplie le poids de l'épreuve.
- `note_sur` (défaut `20`) : barème de l'épreuve.
- `rattrapage_de_uuid` : pour une épreuve de rattrapage.
- `enseignant_uuid` : obligatoire si c'est l'administrateur qui crée l'évaluation.
- La date doit être dans la période, et la période doit être ouverte.

#### `GET /v1/evaluations?classe_uuid=…&periode_uuid=…&matiere_uuid=…` - paginé (l'enseignant ne voit que les siennes)

#### `POST /v1/evaluations/{uuid}/verrouiller` - enseignant de l'évaluation
L'enseignant ferme sa saisie. Ensuite, seule l'administration peut corriger.

### 3.5 Notes

#### `POST /v1/notes` - enseignant de l'évaluation
Saisie en lot (1 à 200 notes), adaptée à une grille façon tableur avec sauvegarde à chaque cellule.
```json
{ "evaluation_uuid": "01a1372e-261c-73b4-ac4c-ff5964c32c41",
  "notes": [
    { "apprenant_uuid": "d48d11b1-c6d9-4e71-a614-e4bbf5884a99", "statut": "saisie", "valeur": "8" },
    { "apprenant_uuid": "c280e027-a0af-426b-8c04-dad89d6d784d", "statut": "absent_justifie" } ] }
```
Réponse 200 :
```json
{ "data": [ { "uuid": "01a1372e-2636-7241-bf31-b72103b8094e", "evaluation_uuid": "01a1372e-261c-…",
  "apprenant_uuid": "d48d11b1-…", "statut": "saisie", "valeur": "8.00", "version": 1,
  "saisi_le": "2026-10-13T22:32:13+01:00" } ] }
```
- `statut` peut valoir :
  - `saisie` : avec `valeur`, ou `niveau_competence` pour un barème de compétences ;
  - `absent_justifie`, `absent_non_justifie` ou `dispense` : sans valeur.
- **Pour modifier une note existante**, renvoyez la `version` lue. Si quelqu'un l'a modifiée entre-temps :
  ```json
  { "success": false, "message": "Cette note a été modifiée entre-temps. Rechargez la grille avant de la modifier.", "error": { "code": "NOTE_MODIFIEE_ENTRE_TEMPS" } }
  ```
- Les notes sont refusées dans ces cas :
  - période clôturée : 409 `PERIODE_CLOTUREE` ;
  - saisie verrouillée : 409 `SAISIE_VERROUILLEE` ;
  - apprenant absent de la classe, ou note au-delà de `note_sur` : 422 ;
  - enseignant non affecté : 403.
- Chaque modification est inscrite dans un journal que personne ne peut modifier.

#### `GET /v1/notes/classe/{classe_uuid}?periode_uuid=…&matiere_uuid=…` - administrateur, enseignant affecté
`matiere_uuid` est obligatoire pour l'enseignant. La réponse contient les évaluations de la classe et, pour chacune, `saisie_verrouillee` et ses `notes` avec leur `version`.

#### `PUT /v1/notes/{note_uuid}/corriger` - administrateur
```json
{ "statut": "saisie", "valeur": "16", "version": 1, "motif": "Erreur de report constatée sur la copie." }
```
- `motif` : 10 caractères minimum.
- Correction après clôture : chaque bulletin archivé de la classe dont le contenu change (moyenne, rang, moyenne de classe) reçoit une **nouvelle version**. Les anciennes versions restent consultables.

### 3.6 Bulletins et classements

#### `GET /v1/bulletins/apprenant/{apprenant_uuid}?periode_uuid=…`
Rôles : administrateur, enseignant de la classe, l'apprenant lui-même, ses parents rattachés.
```json
{ "data": {
  "apprenant": { "uuid": "d48d11b1-…", "nom": "ADJO", "prenom": "Awa", "matricule": "M0" },
  "classe": { "uuid": "c1523a72-…", "nom": "3e A", "cycle": "secondaire", "niveau": "3e", "programme": "beninois" },
  "periode": { "uuid": "01a1372e-25fd-…", "libelle": "1er trimestre", "annee_scolaire": "2026-2027" },
  "moyenne": "15.00", "mention": "Bien", "rang": 1, "ex_aequo": false, "effectif": 2, "moyenne_classe": "13.25",
  "matieres": [ {
    "matiere_uuid": "01a1372e-2602-…", "matiere_nom": "Mathématiques", "coefficient": "4.00",
    "moyenne": "15.00", "moyennes_blocs": { "interrogation": "16.00" },
    "moyenne_classe": "13.25", "min_classe": "11.50", "max_classe": "15.00",
    "notes": [
      { "evaluation_uuid": "01a1372e-261c-…", "statut": "saisie", "valeur": "8.00", "note_sur": "10.00", "retenue": true, "valeur_retenue": "16.00" },
      { "evaluation_uuid": "01a1372e-2624-…", "statut": "saisie", "valeur": "14.00", "note_sur": "20.00", "retenue": true, "valeur_retenue": "14.00" } ] } ],
  "regles_appliquees": { "decimales": 2, "politique_note_manquante": "Notes non saisies exclues du calcul", "…": "…" },
  "provisoire": true, "version": null } }
```
Lecture de l'exemple : l'interro vaut 8/10, soit 16/20. La moyenne de maths est (16 + 14) ÷ 2 = 15.

- Période ouverte : `provisoire: true`, le calcul est fait à la volée.
- Période clôturée : `provisoire: false`, avec `version`, `bulletin_uuid`, `motif_version` et la liste `versions` :
  ```json
  "versions": [
    { "bulletin_uuid": "…", "version": 2, "moyenne": "11.50", "rang": 2, "motif_version": "Erreur de report constatée sur la copie.", "pdf_disponible": false },
    { "bulletin_uuid": "…", "version": 1, "moyenne": "11.50", "rang": 2, "motif_version": null, "pdf_disponible": false } ]
  ```

#### `GET /v1/bulletins/apprenant/{apprenant_uuid}/pdf?periode_uuid=…`
Renvoie `document_uuid` (service Documents). **Tant que le service Documents n'existe pas, la réponse est 409 `PDF_EN_ATTENTE`.**

#### `GET /v1/classements/classe/{classe_uuid}?periode_uuid=…` - administrateur, enseignant de la classe
```json
{ "data": {
  "classement_actif": true, "moyenne_classe": "13.25", "effectif_classe": 2,
  "distribution": [ { "matiere_nom": "Mathématiques", "effectif": 2, "min": "11.50", "max": "15.00", "moyenne": "13.25" } ],
  "apprenants": [
    { "apprenant_uuid": "d48d11b1-…", "nom": "ADJO", "prenom": "Awa", "moyenne": "15.00", "rang": 1, "ex_aequo": false, "mention": "Bien" },
    { "apprenant_uuid": "c280e027-…", "nom": "BIO", "prenom": "Koffi", "moyenne": "11.50", "rang": 2, "ex_aequo": false, "mention": "Passable" } ] } }
```
Si le classement est désactivé, `rang` et `ex_aequo` ne sont pas renvoyés.

### 3.7 Contestations

| Méthode | Route | Rôles | Corps |
|---|---|---|---|
| `POST` | `/v1/contestations` | apprenant (sa note), parent (enfant rattaché) | `{"note_uuid":"…","motif":"Une question n'a pas été comptée dans le barème."}` |
| `GET` | `/v1/contestations?statut=ouverte` | admin (toutes), enseignant (ses évaluations), demandeur (les siennes) | - |
| `PUT` | `/v1/contestations/{uuid}/traiter` | enseignant de l'évaluation, admin | `{"statut":"resolue","reponse":"Barème revu : correction demandée à l'administration."}` |

- Statuts : `ouverte` → `en_examen` → `resolue` ou `rejetee`.
- Une réponse est obligatoire pour clore une contestation.
- Une seule contestation peut être en cours par note et par demandeur : 409 `CONTESTATION_EN_COURS`.
- Sans réponse après `delai_escalade_contestation_jours` (7 par défaut), la contestation est escaladée automatiquement (`escaladee_le` est renseigné et un événement est publié).
- Clore une contestation ne modifie jamais la note : la correction passe par `PUT /v1/notes/{uuid}/corriger`.

### 3.8 Interne (Demandes administratives, E-learning)

#### `GET /v1/interne/eligibilite-document/{apprenant_uuid}` - `X-Internal-Secret` + `X-Tenant-Id`
```json
{ "data": { "apprenant_uuid": "d48d11b1-…", "eligible": true,
  "bulletins": [ { "bulletin_uuid": "01a1372e-2697-…", "periode_uuid": "01a1372e-25fd-…",
    "periode": "1er trimestre", "annee_scolaire": "2026-2027", "version": 2, "pdf_disponible": false } ] } }
```

---

#### `POST /v1/interne/notes-elearning` - `X-Internal-Secret` + `X-Tenant-Id` (E-learning)

Report de la note d'un devoir noté ou d'une tentative de quiz. La note compte **directement** dans la moyenne.

```json
{
  "source": "quiz",
  "source_uuid": "uuid de la tentative ou de la soumission",
  "activite_uuid": "uuid du quiz ou du devoir",
  "activite_libelle": "Fractions",
  "apprenant_uuid": "...",
  "matiere_uuid": "uuid de la matière d'Évaluations (GET /v1/matieres)",
  "enseignant_uuid": "enseignant qui a noté",
  "valeur": "14",
  "note_sur": "20",
  "date": "2026-10-15",
  "commentaire": "facultatif"
}
```

Réponse `201` (créée) ou `200` (déjà reportée) : `{"success": true, "data": {"note_uuid", "evaluation_uuid", "periode_uuid", "valeur", "note_sur", "version"}}`.

| Règle | Comportement |
|---|---|
| Épreuve | une épreuve `note_elearning` par activité, créée au premier report dans la période **ouverte** qui couvre `date` |
| Rejeu | même valeur ⇒ rien ne change (aucun doublon, même `note_uuid`) |
| Nouvelle valeur | mise à jour, `version` + 1, tracée dans `audit_note`, tant que la période est ouverte |
| Après clôture | `409 PERIODE_CLOTUREE` : seule l'administration corrige (`PUT /v1/notes/{uuid}/corriger`) |
| Barème | l'épreuve garde le `note_sur` du premier report ; un autre barème est ramené dessus |
| Contrôles | apprenant actif, matière d'Évaluations, enseignant affecté (403), valeur entre 0 et `note_sur` (422) |
| Autres 409 | `PERIODE_INTROUVABLE`, `SAISIE_VERROUILLEE`, `ACTIVITE_INCOHERENTE` (activité déjà rattachée à une autre matière/classe), `BAREME_INCOMPATIBLE` (cycle noté par compétences) |

## 4. Événements RabbitMQ publiés

Échange `sigapei.events` (type topic), format `{"pattern": "<clé>", "data": {…}}`. Les événements sont publiés **après validation** de la transaction et ne contiennent que des uuid.

| Clé | Quand | `data` |
|---|---|---|
| `evaluations.bulletin.publie` | Clôture, une fois par classe | `tenant_id`, `periode_uuid`, `classe_uuid`, `apprenants_uuids` |
| `evaluations.periode.cloturee` | Fin de clôture | `tenant_id`, `periode_uuid` |
| `evaluations.bulletin.corrige` | Nouvelles versions après correction | `tenant_id`, `periode_uuid`, `classe_uuid`, `apprenants_uuids` |
| `evaluations.note.corrigee` | Correction administrative | `tenant_id`, `note_uuid`, `apprenant_uuid`, `apres_cloture` |
| `evaluations.contestation.ouverte` | Nouvelle contestation | `tenant_id`, `contestation_uuid`, `enseignant_uuid`, `apprenant_uuid` |
| `evaluations.contestation.traitee` | Changement de statut | `tenant_id`, `contestation_uuid`, `statut`, `demandeur_uuid` |
| `evaluations.contestation.escaladee` | Délai dépassé | `tenant_id`, `contestation_uuid` |

## 5. Dépendances amont

| Service | Endpoint appelé | Champs exigés |
|---|---|---|
| Scolarité | `GET /v1/interne/apprenants?uuid=` et `?classe_uuid=&statut=actif` | `uuid`, `statut`, `classe{uuid,cycle,niveau}`, **`utilisateur_uuid`**, **`parents[].parent_uuid`** |
| Scolarité | `GET /v1/interne/emplois-du-temps?classe_uuid=&enseignant_uuid=` | **`enseignant_uuid`**, **`matiere_uuid`**, `classe_uuid`, `statut` |

Les champs en gras sont demandés à Scolarité. Tant qu'ils manquent, les actions qui en dépendent répondent **503** au lieu d'autoriser au hasard.
