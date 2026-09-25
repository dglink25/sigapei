# Documentation Technique de l'API — api-inscription

Microservice d'instruction des candidatures, d'admission et de réinscription de la plateforme **SIGAPEI**.

- **Port** : `4003`
- **Préfixe API** : `/v1`
- **Sonde de santé** : `GET /sante`
- **Catalogue interactif des endpoints** : `GET /docs` (public, format JSON)

---

## 1. Principes d'Architecture & Sécurité

### 1.1. Cloisonnement Multi-Tenant
Toutes les tables portent une colonne `tenant_id` indexée. L'accès aux données est filtré automatiquement via le scope global Eloquent `TenantScope`.

### 1.2. Soumission publique vs Gestion interne
* `POST /v1/candidatures` : Accessible publiquement par un parent ou un candidat n'ayant pas encore de compte utilisateur dans SIGAPEI, en fournissant le header `X-Tenant-Id: <id>` (ou dans le corps de requête).
* Tous les autres endpoints `/v1/*` exigent un jeton d'authentification valide `Authorization: Bearer <token>` ou le secret partagé `X-Internal-Secret`.

### 1.3. Format standard des réponses JSON

**Succès (HTTP 200 / 201) :**
```json
{
  "succes": true,
  "message": "Description de l'opération",
  "donnees": { ... },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

**Erreur (HTTP 400 / 401 / 403 / 404 / 422 / 500) :**
```json
{
  "succes": false,
  "code_erreur": "CODE_ERREUR_METIER",
  "message": "Explication claire de l'erreur",
  "details": null,
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

## 2. Règles Métier Strictes d'Admission

1. **Vérification de capacité bloquante et en temps réel** :
   Aucune candidature ne peut être validée pour une classe ayant atteint sa capacité maximale (`capacite - inscrits <= 0`). La vérification est effectuée directement sur `scolarite.classes` au moment de la transaction.
2. **Création directe sans duplication** :
   La validation de la candidature crée directement la ligne dans `scolarite.apprenants` avec le lien de traçabilité `candidature_id`. Le dossier de candidature reste l'archive historique de la demande d'origine.
3. **Application de la règle du programme pédagogique (Béninois vs Français)** :
   * **Programme Béninois** : aucun compte utilisateur de connexion n'est créé (`utilisateur_id = NULL`), quel que soit le cycle (primaire ou secondaire). L'accès à l'espace se fait exclusivement via le compte parent rattaché (`scolarite.parents_apprenants`).
   * **Programme Français** : compte élève activé dès le cycle secondaire.
4. **Rejet motivé obligatoire** :
   Tout rejet impose un motif textuel explicite obligatoire (min 5 caractères) conservé pour consultation du candidat et du parent.
5. **Réinscriptions sans duplication** :
   La réinscription reconduit la fiche existante sur la nouvelle classe et consigne l'historique sans jamais dupliquer l'apprenant.

---

## 3. Endpoints Détaillés

### 3.1. Sonde de santé
* **Méthode** : `GET`
* **Route** : `/sante`
* **Accès** : Public
* **Réponse 200** :
```json
{
  "statut": "ok",
  "service": "api-inscription",
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.2. Catalogue des endpoints
* **Méthode** : `GET`
* **Route** : `/docs`
* **Accès** : Public
* **Description** : Renvoie la liste complète de tous les endpoints, leurs paramètres, schémas de requêtes et exemples de réponses.

---

### 3.3. Soumettre une candidature
* **Méthode** : `POST`
* **Route** : `/v1/candidatures`
* **Accès** : Public avec `X-Tenant-Id` ou avec Bearer JWT
* **Corps de la requête (JSON)** :
```json
{
  "nom": "Koffi",
  "prenom": "Jean-Luc",
  "date_naissance": "2012-05-14",
  "sexe": "M",
  "email": "candidat.koffi@sigapei.com",
  "telephone": "+22997000001",
  "adresse": "Cotonou, Haie Vive",
  "classe_visee_id": 1,
  "parent_nom": "Koffi",
  "parent_prenom": "Marc",
  "parent_telephone": "+22997000002",
  "parent_email": "parent.koffi@sigapei.com",
  "parent_lien": "pere"
}
```
* **Réponse 201** :
```json
{
  "succes": true,
  "message": "Candidature soumise avec succes",
  "donnees": {
    "uuid": "f7a8b9c0-d1e2-3456-fghi-j78901234567",
    "statut": "soumise",
    "date_soumission": "2026-09-25T10:00:00+01:00"
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.4. Lister les candidatures
* **Méthode** : `GET`
* **Route** : `/v1/candidatures`
* **Query Params** :
  * `statut` (optionnel) : `soumise`, `en_attente`, `validee`, `rejetee`
  * `classe_visee_id` (optionnel) : integer
  * `recherche` (optionnel) : string (nom, prénom, email, téléphone)
* **Réponse 200** :
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
      "date_soumission": "2026-09-25T10:00:00+01:00",
      "nb_pieces": 2,
      "nb_tests": 1
    }
  ],
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.5. Consulter le détail d'une candidature
* **Méthode** : `GET`
* **Route** : `/v1/candidatures/{uuid}`
* **Réponse 200** :
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
    "adresse": "Cotonou, Haie Vive",
    "statut": "soumise",
    "classe_visee_id": 1,
    "date_soumission": "2026-09-25T10:00:00+01:00",
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
        "uuid": "a1b2c3d4-0001-4321-aaaa-111111111111",
        "type": "acte_naissance",
        "nom_original": "acte_naissance.pdf",
        "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/acte_naissance.pdf",
        "statut_validation": "en_attente"
      }
    ],
    "tests_admission": [
      {
        "uuid": "b2c3d4e5-0002-4321-bbbb-222222222222",
        "type_test": "test_ecrit",
        "matiere": "Mathematiques",
        "note": 16.5,
        "note_max": 20.0,
        "resultat": "admis"
      }
    ]
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.6. Valider une candidature (Affectation et admission)
* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/valider`
* **Règles métier appliquées** :
  1. Vérification que le module 'inscription' est actif pour ce tenant.
  2. Vérification bloquante de capacité dans `scolarite.classes`.
  3. Si la classe est de programme `beninois` : création dans `scolarite.apprenants` avec `utilisateur_id = NULL`.
  4. Si parent renseigné : liaison créée dans `scolarite.parents_apprenants`.
  5. Statut candidature passé à `validee`.
  6. Journalisation dans `audit_log`.
* **Réponse 200** :
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
  "horodatage": "2026-09-25T10:15:00+01:00"
}
```
* **Erreurs possibles** :
  * `400 ERREUR_VALIDATION_CANDIDATURE` : Si la classe visée est complète.

---

### 3.7. Rejeter une candidature
* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/rejeter`
* **Corps de la requête (JSON)** :
```json
{
  "motif": "Dossier incomplet : moyenne générale inférieure au seuil d'admissibilité fixé par l'établissement."
}
```
* **Réponse 200** :
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
  "horodatage": "2026-09-25T10:20:00+01:00"
}
```

---

### 3.8. Ajouter une pièce justificative
* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/pieces-justificatives`
* **Corps de la requête (JSON)** :
```json
{
  "type": "bulletin",
  "nom_original": "bulletin_trimestre3_cm2.pdf",
  "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/bulletin_t3.pdf",
  "taille_octets": 1048576,
  "mime_type": "application/pdf"
}
```
* **Réponse 201** :
```json
{
  "succes": true,
  "message": "Piece justificative enregistree avec succes",
  "donnees": {
    "uuid": "c3d4e5f6-0003-4321-cccc-333333333333",
    "type": "bulletin",
    "nom_original": "bulletin_trimestre3_cm2.pdf",
    "chemin_stockage": "candidatures/tenant_1/f7a8b9c0/bulletin_t3.pdf",
    "statut_validation": "en_attente"
  },
  "horodatage": "2026-09-25T10:05:00+01:00"
}
```

---

### 3.9. Enregistrer un test d'admission
* **Méthode** : `POST`
* **Route** : `/v1/candidatures/{uuid}/tests-admission`
* **Corps de la requête (JSON)** :
```json
{
  "type_test": "test_ecrit",
  "matiere": "Francais",
  "note": 15.0,
  "note_max": 20.0,
  "resultat": "admis",
  "observations": "Bonne maîtrise de la syntaxe et de l'orthographe",
  "evalue_par_id": 14,
  "date_test": "2026-09-20"
}
```
* **Réponse 201** :
```json
{
  "succes": true,
  "message": "Resultat du test d'admission enregistre",
  "donnees": {
    "uuid": "d4e5f6a7-0004-4321-dddd-444444444444",
    "type_test": "test_ecrit",
    "matiere": "Francais",
    "note": 15.0,
    "note_max": 20.0,
    "resultat": "admis"
  },
  "horodatage": "2026-09-25T10:10:00+01:00"
}
```

---

### 3.10. Réinscrire un apprenant sur une nouvelle année
* **Méthode** : `POST`
* **Route** : `/v1/reinscriptions`
* **Corps de la requête (JSON)** :
```json
{
  "apprenant_id": 1,
  "nouvelle_classe_id": 2,
  "annee_scolaire": "2026-2027"
}
```
* **Règles métier appliquées** :
  1. Vérification bloquante de capacité dans la nouvelle classe.
  2. Mise à jour de `classe_id` sur la fiche existante dans `scolarite.apprenants`.
  3. Consignation dans `scolarite.historique_classes`.
  4. Enregistrement dans `inscription.reinscriptions`.
  5. Aucune duplication du dossier de l'apprenant.
* **Réponse 201** :
```json
{
  "succes": true,
  "message": "Reinscription validee",
  "donnees": {
    "uuid": "e5f6a7b8-0005-4321-eeee-555555555555",
    "apprenant_id": 1,
    "apprenant_nom": "Koffi Jean-Luc",
    "nouvelle_classe": "6ème B (Programme Français)",
    "annee_scolaire": "2026-2027",
    "statut": "validee",
    "message": "Dossier apprenant reconduit avec succes sur la nouvelle annee scolaire."
  },
  "horodatage": "2026-09-25T10:25:00+01:00"
}
```
