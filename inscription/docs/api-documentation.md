# Documentation Complète de l'API — inscription (Admissions)

Microservice de gestion du parcours d'admission et de réinscription de la plateforme **SIGAPEI**.

- **Port** : `4003`
- **Préfixe API** : `/v1`
- **Sonde de santé** : `GET /sante`
- **Catalogue interactif des endpoints (JSON)** : `GET /docs` (public)
- **Base de données** : PostgreSQL managée (Neon), schéma dédié `inscription`

---

## 1. Principes Transverses & Spécifications Générales

### 1.1. Format Standard des Réponses

Chaque route de l'API répond sous un format JSON normalisé et prévisible :

#### Réponse de Succès (HTTP 200 / 201)
```json
{
  "succes": true,
  "message": "Description de l'opération effectuée",
  "donnees": {
    "uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    ...
  },
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

#### Réponse d'Erreur (HTTP 400, 401, 403, 404, 422, 500)
```json
{
  "succes": false,
  "code_erreur": "ERREUR_VALIDATION_CANDIDATURE",
  "message": "Validation impossible : la classe '6ème A' a atteint sa capacité maximale (45 places).",
  "details": null,
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

### 1.2. Authentification & Headers Requis

| Contexte d'appel | Headers requis | Description |
|---|---|---|
| **Appel client authentifié** | `Authorization: Bearer <token_jwt>` | Jeton JWT émis par `identite`, contenant `sub`, `tenant_id`, et `role` |
| **Soumission publique** | `X-Tenant-Id: <id>` (ou dans le body) | Autorisé pour `POST /v1/candidatures` par les candidats/parents sans compte préalable |
| **Appel inter-services** | `X-Internal-Secret: <INTERNAL_API_SECRET>`<br>`X-Tenant-Id: <id>` | Secret partagé de la plateforme pour communication directe sans JWT |

### 1.3. Règles Métier Fondamentales de l'Admission

1. **Vérification de capacité bloquante** : Aucune candidature ne peut être validée pour une classe ayant atteint son quota. Le système vérifie en temps réel sur `scolarite.classes` que `places_disponibles > 0`.
2. **Création directe sans duplication** : La validation crée directement l'élève dans `scolarite.apprenants` avec le lien de traçabilité `candidature_id`. Le dossier de candidature reste l'historique d'admission d'origine.
3. **Règle du programme pédagogique (Béninois vs Français)** :
   * **Programme Béninois** : `utilisateur_id = NULL` (aucun compte de connexion élève créé, accès 100 % délégué au compte parent via `scolarite.parents_apprenants`).
   * **Programme Français** : compte élève activé dès le cycle secondaire.
   * **Cycle Universitaire** : étudiant autonome avec compte propre systématique.
4. **Rejet obligatoirement motivé** : Tout rejet impose un motif textuel explicite (minimum 5 caractères).
5. **Réinscriptions sans duplication** : Reconduction de la fiche existante sur la nouvelle classe et consignation dans `scolarite.historique_classes`.

---

## 2. Référentiel des Endpoints

---

### 2.1. Sonde de santé
Vérifie la disponibilité du microservice pour la Gateway et les load-balancers.

* **Méthode** : `GET`
* **Route** : `/sante`
* **Authentification** : Aucune (publique)

#### Exemple de Requête
```bash
curl -X GET http://localhost:4003/sante
```

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "statut": "ok",
  "service": "api-inscription",
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.2. Catalogue des Endpoints (Swagger / OpenAPI alternatif)
Retourne le catalogue complet de tous les endpoints au format JSON.

* **Méthode** : `GET`
* **Route** : `/docs`
* **Authentification** : Aucune (publique)

#### Exemple de Requête
```bash
curl -X GET http://localhost:4003/docs
```

---

### 2.3. Soumettre une candidature
Permet à un parent ou une secrétaire de déposer un nouveau dossier d'admission.

* **Méthode** : `POST`
* **Route** : `/v1/candidatures`
* **Authentification** :
  * Public avec header `X-Tenant-Id: <id>` et token CAPTCHA, ou
  * Authentifié avec `Authorization: Bearer <token_jwt>`

#### Paramètres du Corps (JSON)
| Champ | Type | Requis | Description |
|---|---|---|---|
| `nom` | String | Oui | Nom de famille de l'élève (max 100) |
| `prenom` | String | Oui | Prénom(s) de l'élève (max 100) |
| `date_naissance` | Date (Y-m-d) | Oui | Date de naissance |
| `sexe` | String | Non | `M` ou `F` |
| `email` | Email | Non | Adresse e-mail du candidat |
| `telephone` | String | Non | Téléphone international (ex: `+22997000001`) |
| `adresse` | String | Non | Adresse de résidence |
| `classe_visee_id` | Integer | Oui | ID interne de la classe souhaitée (`scolarite.classes`) |
| `parent_nom` | String | Non | Nom du parent ou tuteur |
| `parent_prenom` | String | Non | Prénom du parent |
| `parent_telephone` | String | Non | Téléphone du parent |
| `parent_email` | Email | Non | E-mail du parent |
| `parent_lien` | String | Non | `pere`, `mere`, `tuteur` (défaut: `parent`) |
| `captchaToken` | String | Non | Token de vérification reCAPTCHA v3 / hCaptcha |

#### Exemple de Requête
```bash
curl -X POST http://localhost:4003/v1/candidatures \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "nom": "Koffi",
    "prenom": "Jean-Luc",
    "date_naissance": "2012-05-14",
    "sexe": "M",
    "email": "candidat.koffi@sigapei.com",
    "telephone": "+22997000001",
    "classe_visee_id": 1,
    "parent_nom": "Koffi",
    "parent_prenom": "Marc",
    "parent_telephone": "+22997000002",
    "parent_email": "parent.koffi@sigapei.com",
    "parent_lien": "pere"
  }'
```

#### Exemple de Réponse (HTTP 201 Created)
```json
{
  "succes": true,
  "message": "Candidature soumise avec succes",
  "donnees": {
    "uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    "statut": "soumise",
    "date_soumission": "2026-09-27T10:00:00+01:00"
  },
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.4. Lister les candidatures
Retourne la liste des dossiers de candidature de l'établissement avec filtres multicritères.

* **Méthode** : `GET`
* **Route** : `/v1/candidatures`
* **Authentification** : `Authorization: Bearer <token_jwt>` (Admin, Personnel)
* **Paramètres de Requête (Query)** :
  * `statut` (string, optionnel) : `soumise`, `en_attente`, `validee`, `rejetee`
  * `classe_visee_id` (integer, optionnel) : filtre par classe
  * `recherche` (string, optionnel) : recherche textuelle sur nom, prénom, email, téléphone

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "succes": true,
  "message": "Liste des candidatures recuperee",
  "donnees": [
    {
      "uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
      "nom": "Koffi",
      "prenom": "Jean-Luc",
      "date_naissance": "2012-05-14",
      "classe_visee_id": 1,
      "statut": "soumise",
      "date_soumission": "2026-09-27T10:00:00+01:00",
      "nb_pieces": 2,
      "nb_tests": 1
    }
  ],
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.5. Consulter le détail d'une candidature
Affiche l'ensemble des informations d'un dossier : état civil, coordonnées, pièces justificatives attachées et résultats des tests.

* **Méthode** : `GET`
* **Route** : `/v1/candidatures/{uuid}`
* **Authentification** : `Authorization: Bearer <token_jwt>`

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "succes": true,
  "message": "Detail de la candidature",
  "donnees": {
    "uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    "nom": "Koffi",
    "prenom": "Jean-Luc",
    "date_naissance": "2012-05-14",
    "sexe": "M",
    "email": "candidat.koffi@sigapei.com",
    "telephone": "+22997000001",
    "adresse": "Cotonou",
    "statut": "soumise",
    "classe_visee_id": 1,
    "date_soumission": "2026-09-27T10:00:00+01:00",
    "motif_rejet": null,
    "parent": {
      "nom": "Koffi",
      "prenom": "Marc",
      "telephone": "+22997000002",
      "email": "parent.koffi@sigapei.com",
      "lien": "pere"
    },
    "pieces_justificatives": [
      {
        "uuid": "a1b2c3d4-1111-2222-3333-444444444444",
        "type": "acte_naissance",
        "nom_original": "acte_naissance.pdf",
        "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/acte_naissance.pdf",
        "statut_validation": "en_attente"
      }
    ],
    "tests_admission": [
      {
        "uuid": "b2c3d4e5-5555-6666-7777-888888888888",
        "type_test": "test_ecrit",
        "matiere": "Mathematiques",
        "note": 16.5,
        "note_max": 20.0,
        "resultat": "admis"
      }
    ]
  },
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.6. Valider une candidature (Admission & Affectation)
Opération transactionnelle atomique :
1. Vérifie que le module `inscription` est actif pour ce tenant (`etablissements.etablissement_modules`).
2. Vérifie la capacité restante de la classe dans `scolarite.classes`. Si complète $\rightarrow$ refus immédiat.
3. Applique la règle du programme pédagogique (Béninois $\rightarrow$ `utilisateur_id = NULL` ; Français $\rightarrow$ compte créé/associé).
4. Insère l'élève dans `scolarite.apprenants` avec le lien `candidature_id`.
5. Si un parent est renseigné, crée la liaison dans `scolarite.parents_apprenants`.
6. Passe le statut de la candidature à `validee`.
7. Journalise l'admission dans `audit_log` et publie l'événement RabbitMQ `candidature.validee`.

* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/valider`
* **Authentification** : `Authorization: Bearer <token_jwt>` (Admin, Personnel)

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "succes": true,
  "message": "Candidature validee avec succes",
  "donnees": {
    "candidature_uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    "statut": "validee",
    "apprenant": {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "classe": "6ème A (Programme Béninois)",
      "programme": "beninois",
      "compte_utilisateur_cree": false
    },
    "message": "Candidature validee avec succes et apprenant genere dans la scolarite."
  },
  "horodatage": "2026-09-27T10:15:00+01:00"
}
```

#### Erreurs Possibles
* `400 ERREUR_VALIDATION_CANDIDATURE` : `Validation impossible : la classe visée est complète.` ou `Cette candidature a déjà été validée.`

---

### 2.7. Rejeter une candidature
Rejette un dossier d'admission avec consignation obligatoire du motif.

* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/rejeter`
* **Corps de la requête (JSON)** :
```json
{
  "motif": "Dossier incomplet : moyenne générale inférieure au seuil d'admissibilité fixé par l'établissement."
}
```

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "succes": true,
  "message": "Candidature rejetee",
  "donnees": {
    "candidature_uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    "statut": "rejetee",
    "motif_rejet": "Dossier incomplet : moyenne générale inférieure au seuil d'admissibilité fixé par l'établissement.",
    "message": "Candidature rejetee avec motif enregistre."
  },
  "horodatage": "2026-09-27T10:20:00+01:00"
}
```

---

### 2.8. Ajouter une pièce justificative
Rattache un fichier téléversé sur S3/MinIO à une candidature.

* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/pieces-justificatives`
* **Corps de la requête (JSON)** :
```json
{
  "type": "bulletin",
  "nom_original": "bulletin_cm2_trimestre3.pdf",
  "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/bulletin_t3.pdf",
  "taille_octets": 1048576,
  "mime_type": "application/pdf"
}
```

#### Exemple de Réponse (HTTP 201 Created)
```json
{
  "succes": true,
  "message": "Piece justificative enregistree avec succes",
  "donnees": {
    "uuid": "c3d4e5f6-0003-4321-cccc-333333333333",
    "type": "bulletin",
    "nom_original": "bulletin_cm2_trimestre3.pdf",
    "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/bulletin_t3.pdf",
    "statut_validation": "en_attente"
  },
  "horodatage": "2026-09-27T10:05:00+01:00"
}
```

---

### 2.9. Enregistrer un test d'admission
Enregistre une note ou évaluation de test pour une candidature.

* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/tests-admission`
* **Corps de la requête (JSON)** :
```json
{
  "type_test": "test_ecrit",
  "matiere": "Français",
  "note": 15.5,
  "note_max": 20.0,
  "resultat": "admis",
  "observations": "Bonne rédaction et orthographe soignée",
  "evalue_par_id": 14,
  "date_test": "2026-09-20"
}
```

#### Exemple de Réponse (HTTP 201 Created)
```json
{
  "succes": true,
  "message": "Resultat du test d'admission enregistre",
  "donnees": {
    "uuid": "d4e5f6a7-0004-4321-dddd-444444444444",
    "type_test": "test_ecrit",
    "matiere": "Français",
    "note": 15.5,
    "note_max": 20.0,
    "resultat": "admis"
  },
  "horodatage": "2026-09-27T10:10:00+01:00"
}
```

---

### 2.10. Réinscrire un apprenant sur la nouvelle année
Reconduit un élève déjà inscrit sans créer de doublon de fiche.

* **Méthode** : `POST`
* **Route** : `/v1/reinscriptions`
* **Corps de la requête (JSON)** :
```json
{
  "apprenant_id": 42,
  "nouvelle_classe_id": 5,
  "annee_scolaire": "2026-2027"
}
```

#### Exemple de Réponse (HTTP 201 Created)
```json
{
  "succes": true,
  "message": "Reinscription validee",
  "donnees": {
    "uuid": "e5f6a7b8-0005-4321-eeee-555555555555",
    "apprenant_id": 42,
    "apprenant_nom": "Koffi Jean-Luc",
    "nouvelle_classe": "5ème A",
    "annee_scolaire": "2026-2027",
    "statut": "validee",
    "message": "Dossier apprenant reconduit avec succes sur la nouvelle annee scolaire."
  },
  "horodatage": "2026-09-27T10:25:00+01:00"
}
```
