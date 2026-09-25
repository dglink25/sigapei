# Documentation Technique de l'API — api-scolarite

Microservice de gestion administrative et pédagogique de la plateforme **SIGAPEI**.

- **Port** : `4004`
- **Préfixe API** : `/v1`
- **Sonde de santé** : `GET /sante`
- **Catalogue interactif des endpoints** : `GET /docs` (public, format JSON)

---

## 1. Principes d'Architecture & Sécurité

### 1.1. Cloisonnement Multi-Tenant
Toutes les tables portent une colonne `tenant_id` indexée. L'accès aux données est filtré automatiquement via le scope global Eloquent `TenantScope`. Aucune fuite de données entre établissements n'est possible.

### 1.2. Exposition exclusive des UUIDs
Conformément à la règle de la plateforme, **aucun identifiant interne `id` (bigint auto-incrémenté) n'est exposé** dans les URLs ou dans les réponses API clientes. Seules les colonnes `uuid` (UUIDv4) sont exposées.

### 1.3. Authentification & Headers
Les requêtes vers `/v1/*` exigent :
* Header d'authentification client : `Authorization: Bearer <token_jwt>` (émis par `api-identite`)
* Ou Header inter-services interne : `X-Internal-Secret: <INTERNAL_API_SECRET>` accompagné de `X-Tenant-Id: <id>`

### 1.4. Format standard des réponses JSON

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

## 2. Règle Majeure : Gestion du Compte selon le Programme Pédagogique

Chaque classe est rattachée à un programme pédagogique via la colonne `programme` (`beninois` ou `francais`) :
1. **Programme Béninois** :
   * L'apprenant n'a **aucun compte de connexion propre** (`utilisateur_id = NULL`), quel que soit son cycle (primaire ou secondaire).
   * L'accès aux notes, emplois du temps et demandes se fait exclusivement via le compte du parent rattaché (`scolarite.parents_apprenants`).
   * Règle motivée par la réalité du terrain : interdiction formelle du téléphone aux élèves durant l'année scolaire.
2. **Programme Français** :
   * Compte optionnel au primaire, compte propre et actif par défaut dès le cycle secondaire.
3. **Cycle Universitaire** :
   * L'étudiant est systématiquement titulaire autonome de son compte, quel que soit le programme.
4. **Mutation Béninois $\rightarrow$ Français** :
   * Déclenche automatiquement le provisionnement du compte élève, sans jamais recréer le dossier apprenant.

---

## 3. Endpoints Détaillés

### 3.1. Sonde de santé
* **Méthode** : `GET`
* **Route** : `/sante`
* **Accès** : Public (sans authentification)
* **Réponse 200** :
```json
{
  "statut": "ok",
  "service": "api-scolarite",
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.2. Catalogue des endpoints
* **Méthode** : `GET`
* **Route** : `/docs`
* **Accès** : Public (sans authentification)
* **Description** : Renvoie la liste complète de tous les endpoints, leurs paramètres, schémas de requêtes et exemples de réponses.

---

### 3.3. Lister les classes
* **Méthode** : `GET`
* **Route** : `/v1/classes`
* **Query Params** :
  * `cycle` (optionnel) : `primaire`, `secondaire`, `universitaire`
  * `programme` (optionnel) : `beninois`, `francais`
  * `statut` (optionnel) : `actif`, `archive`
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Liste des classes recuperee avec succes",
  "donnees": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "nom": "6ème A (Programme Béninois)",
      "cycle": "secondaire",
      "niveau": "6e",
      "filiere": null,
      "programme": "beninois",
      "capacite": 45,
      "inscrits_count": 40,
      "places_disponibles": 5,
      "est_complete": false,
      "statut": "actif"
    }
  ],
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.4. Créer une classe
* **Méthode** : `POST`
* **Route** : `/v1/classes`
* **Corps de la requête (JSON)** :
```json
{
  "nom": "6ème B (Programme Français)",
  "cycle": "secondaire",
  "niveau": "6e",
  "filiere": null,
  "programme": "francais",
  "capacite": 35
}
```
* **Réponse 201** :
```json
{
  "succes": true,
  "message": "Classe creee avec succes",
  "donnees": {
    "uuid": "9c8b7a6d-5e4f-3210-fedc-ba9876543210",
    "nom": "6ème B (Programme Français)",
    "cycle": "secondaire",
    "niveau": "6e",
    "filiere": null,
    "programme": "francais",
    "capacite": 35,
    "statut": "actif"
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```
* **Erreurs possibles** :
  * `422 DONNEES_INVALIDES` : Champs manquants ou programme différent de `beninois`/`francais`.

---

### 3.5. Vérifier la disponibilité de place en temps réel
* **Méthode** : `GET`
* **Route** : `/v1/classes/{uuid}/disponibilite`
* **Description** : Calcul dynamique et bloquant consommé par `api-inscription`.
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Disponibilite calculee",
  "donnees": {
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "nom": "6ème A (Programme Béninois)",
    "cycle": "secondaire",
    "niveau": "6e",
    "programme": "beninois",
    "capacite_totale": 45,
    "inscrits_actuels": 40,
    "places_disponibles": 5,
    "est_complete": false
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.6. Consulter le dossier complet d'un apprenant
* **Méthode** : `GET`
* **Route** : `/v1/apprenants/{uuid}`
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Dossier apprenant recupere",
  "donnees": {
    "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "matricule": "MAT-XY987654",
    "nom": "Koffi",
    "prenom": "Jean-Luc",
    "date_naissance": "2012-05-14",
    "sexe": "M",
    "statut": "actif",
    "classe": {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "nom": "6ème A (Programme Béninois)",
      "cycle": "secondaire",
      "niveau": "6e",
      "programme": "beninois"
    },
    "compte_utilisateur_actif": false,
    "historique_classes": [
      {
        "uuid": "7f8e9d0c-1b2a-3456-7890-abcdef123456",
        "ancienne_classe": "CM2 A",
        "nouvelle_classe": "6ème A",
        "date_transfert": "2026-09-01T08:00:00+01:00",
        "motif": "Admission initiale"
      }
    ],
    "parents": [
      {
        "parent_id": 4,
        "lien_parente": "pere",
        "est_responsable_legal": true,
        "est_contact_urgence": true
      }
    ]
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.7. Effectuer un transfert / mutation interne de classe
* **Méthode** : `POST`
* **Route** : `/v1/apprenants/{uuid}/transfert`
* **Corps de la requête (JSON)** :
```json
{
  "nouvelle_classe_uuid": "9c8b7a6d-5e4f-3210-fedc-ba9876543210",
  "motif": "Changement de filière et passage au programme français"
}
```
* **Règles métier appliquées** :
  1. Vérification bloquante de la capacité de la classe cible.
  2. Conservation stricte de la même ligne dans `scolarite.apprenants` (pas de duplication de dossier).
  3. Journalisation de l'ancienne et de la nouvelle classe dans `scolarite.historique_classes`.
  4. Détection du changement de programme : si `beninois` $\rightarrow$ `francais`, `compte_apprenant_a_creer: true`.
  5. Journalisation dans `audit_log`.
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Transfert effectue avec succes",
  "donnees": {
    "apprenant_uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "nom": "Koffi",
    "prenom": "Jean-Luc",
    "ancienne_classe": {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "nom": "6ème A (Programme Béninois)",
      "programme": "beninois"
    },
    "nouvelle_classe": {
      "uuid": "9c8b7a6d-5e4f-3210-fedc-ba9876543210",
      "nom": "6ème B (Programme Français)",
      "programme": "francais"
    },
    "date_transfert": "2026-09-25T10:30:00+01:00",
    "changement_programme": true,
    "compte_apprenant_a_creer": true,
    "message": "Transfert effectue avec succes sans duplication du dossier."
  },
  "horodatage": "2026-09-25T10:30:00+01:00"
}
```

---

### 3.8. Consulter les paiements de scolarité (Lecture seule pure)
* **Méthode** : `GET`
* **Route** : `/v1/apprenants/{uuid}/paiements-scolarite`
* **Description** : Jointure SQL directe sur `finances.factures` et `finances.transactions`. Aucune écriture n'est effectuée côté Scolarité.
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Situation des paiements de scolarite recuperee",
  "donnees": {
    "apprenant": {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "nom": "Koffi",
      "prenom": "Jean-Luc",
      "classe": "6ème A (Programme Béninois)"
    },
    "situation_financiere": {
      "total_du": 180000.0,
      "total_regle": 120000.0,
      "solde_restant": 60000.0,
      "statut_global": "EN_RETARD",
      "nombre_factures": 3,
      "factures": [
        {
          "id": 101,
          "montant": 60000.0,
          "echeance": "2026-09-15",
          "statut": "payee"
        },
        {
          "id": 102,
          "montant": 60000.0,
          "echeance": "2026-10-15",
          "statut": "payee"
        },
        {
          "id": 103,
          "montant": 60000.0,
          "echeance": "2026-11-15",
          "statut": "en_attente"
        }
      ]
    }
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```

---

### 3.9. Emplois du temps
* **Consulter** : `GET /v1/emplois-du-temps?classe_uuid=...&jour=lundi`
* **Créer/Modifier un créneau** : `POST /v1/emplois-du-temps`
```json
{
  "classe_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "enseignant_id": 12,
  "matiere_id": 3,
  "creneau": "Lundi 08h-10h",
  "jour": "lundi",
  "heure_debut": "08:00",
  "heure_fin": "10:00",
  "salle": "Salle 102"
}
```

---

### 3.10. Endpoint Interne (Inter-microservices)
* **Méthode** : `GET`
* **Route** : `/v1/interne/apprenants/{uuid}/classe`
* **Protection** : `X-Internal-Secret: <INTERNAL_API_SECRET>`
* **Consommé par** : `api-evaluations`, `api-finances`, `api-vie-scolaire`.
* **Réponse 200** :
```json
{
  "succes": true,
  "message": "Informations apprenant",
  "donnees": {
    "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "nom": "Koffi",
    "prenom": "Jean-Luc",
    "statut": "actif",
    "classe_nom": "6ème A (Programme Béninois)",
    "cycle": "secondaire",
    "programme": "beninois"
  },
  "horodatage": "2026-09-25T10:00:00+01:00"
}
```
