# Documentation Complète de l'API — scolarite

Microservice de gestion administrative et pédagogique de la plateforme **SIGAPEI**.

- **Port** : `4004`
- **Préfixe API** : `/v1`
- **Sonde de santé** : `GET /sante`
- **Catalogue interactif des endpoints (JSON)** : `GET /docs` (public)
- **Base de données** : PostgreSQL managée (Neon), schéma dédié `scolarite`

---

## 1. Principes Transverses & Spécifications Générales

### 1.1. Format Standard des Réponses

Toutes les réponses de l'API sont normalisées :

#### Réponse de Succès (HTTP 200 / 201)
```json
{
  "succes": true,
  "message": "Description de l'opération effectuée",
  "donnees": {
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    ...
  },
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

#### Réponse d'Erreur (HTTP 400, 401, 403, 404, 422, 500)
```json
{
  "succes": false,
  "code_erreur": "ERREUR_TRANSFERT",
  "message": "Transfert impossible : la classe de destination (6ème B) est complète.",
  "details": null,
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

### 1.2. Authentification & Headers Requis

| Contexte d'appel | Headers requis | Description |
|---|---|---|
| **Appel client authentifié** | `Authorization: Bearer <token_jwt>` | Jeton JWT émis par `identite` contenant `sub`, `tenant_id`, et `role` |
| **Appel inter-services** | `X-Internal-Secret: <INTERNAL_API_SECRET>`<br>`X-Tenant-Id: <id>` | Secret partagé de la plateforme pour communication directe sans JWT (ex: `/v1/interne/*`) |

### 1.3. Règles Métier Fondamentales de la Scolarité

1. **Règle du Programme Pédagogique (Béninois vs Français)** :
   * **Programme Béninois** : aucun compte de connexion élève propre (`utilisateur_id = NULL`), quel que soit son cycle (primaire ou secondaire), en raison de l'interdiction stricte du téléphone aux élèves durant l'année scolaire. L'accès à l'espace se fait exclusivement via le compte parent rattaché (`scolarite.parents_apprenants`).
   * **Programme Français** : compte élève activé dès le cycle secondaire.
   * **Cycle Universitaire** : étudiant titulaire autonome de son compte.
2. **Transferts internes sans duplication de dossier** :
   * La mutation met à jour `classe_id` sur la même ligne de la table `scolarite.apprenants`.
   * L'historique complet est archivé dans `scolarite.historique_classes`.
   * En cas de transfert d'une classe béninoise vers une classe française, le système active `compte_apprenant_a_creer: true` pour déclencher le provisionnement sans altérer le dossier élève.
3. **Paiements de scolarité en lecture seule pure** :
   * La consultation interroge `finances.factures` et `finances.transactions` par jointure directe.
   * Aucune écriture financière n'est effectuée côté Scolarité.

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
curl -X GET http://localhost:4004/sante
```

#### Exemple de Réponse (HTTP 200 OK)
```json
{
  "statut": "ok",
  "service": "api-scolarite",
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.2. Catalogue des Endpoints (Swagger / OpenAPI alternatif)
Retourne le catalogue complet des endpoints, paramètres et formats JSON.

* **Méthode** : `GET`
* **Route** : `/docs`
* **Authentification** : Aucune (publique)

#### Exemple de Requête
```bash
curl -X GET http://localhost:4004/docs
```

---

### 2.3. Lister les classes
Retourne les classes de l'établissement avec leur effectif, capacité et programme.

* **Méthode** : `GET`
* **Route** : `/v1/classes`
* **Authentification** : `Authorization: Bearer <token_jwt>`
* **Paramètres de Requête (Query)** :
  * `cycle` (string, optionnel) : `primaire`, `secondaire`, `universitaire`
  * `programme` (string, optionnel) : `beninois`, `francais`
  * `statut` (string, optionnel) : `actif`, `archive`

#### Exemple de Requête
```bash
curl -X GET "http://localhost:4004/v1/classes?programme=beninois" \
  -H "Authorization: Bearer <token_jwt>"
```

#### Exemple de Réponse (HTTP 200 OK)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.4. Créer une classe
Configure une nouvelle classe au sein de l'établissement.

* **Méthode** : `POST`
* **Route** : `/v1/classes`
* **Authentification** : `Authorization: Bearer <token_jwt>` (Admin)

#### Paramètres du Corps (JSON)
| Champ | Type | Requis | Description |
|---|---|---|---|
| `nom` | String | Oui | Intitulé de la classe (max 100) |
| `cycle` | String | Oui | `primaire`, `secondaire`, `universitaire` |
| `niveau` | String | Oui | Niveau académique (ex: `CI`, `6e`, `Terminale`, `L1`) |
| `filiere` | String | Non | Filière ou série (ex: `Scientifique`, `Litteraire`) |
| `programme` | String | Oui | `beninois` ou `francais` |
| `capacite` | Integer | Oui | Capacité maximale d'accueil (ex: 45) |

#### Exemple de Requête
```bash
curl -X POST http://localhost:4004/v1/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_jwt>" \
  -d '{
    "nom": "6ème B (Programme Français)",
    "cycle": "secondaire",
    "niveau": "6e",
    "filiere": null,
    "programme": "francais",
    "capacite": 35
  }'
```

#### Exemple de Réponse (HTTP 201 Created)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.5. Vérifier la capacité en temps réel
Calcul dynamique consommé par le microservice `inscription` avant toute validation d'admission.

* **Méthode** : `GET`
* **Route** : `/v1/classes/{uuid}/disponibilite`
* **Authentification** : `Authorization: Bearer <token_jwt>` ou `X-Internal-Secret`

#### Exemple de Réponse (HTTP 200 OK)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.6. Consulter le dossier complet d'un apprenant
Fournit l'état civil, la classe actuelle, l'historique de tous les transferts passés et les parents rattachés.

* **Méthode** : `GET`
* **Route** : `/v1/apprenants/{uuid}`
* **Authentification** : `Authorization: Bearer <token_jwt>`

#### Exemple de Réponse (HTTP 200 OK)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.7. Effectuer un transfert / mutation interne de classe
Opération atomique sans duplication de dossier :
1. Vérifie la disponibilité de place dans la classe cible (`scolarite.classes`).
2. Met à jour `classe_id` sur la fiche apprenant existante dans `scolarite.apprenants`.
3. Consigne la mutation dans `scolarite.historique_classes`.
4. Détecte le changement de programme : si passage `beninois` $\rightarrow$ `francais`, indique `compte_apprenant_a_creer: true`.
5. Journalise l'opération dans `audit_log` et publie l'événement RabbitMQ `apprenant.transfere`.

* **Méthode** : `POST`
* **Route** : `/v1/apprenants/{uuid}/transfert`
* **Authentification** : `Authorization: Bearer <token_jwt>` (Admin, Personnel)

#### Paramètres du Corps (JSON)
| Champ | Type | Requis | Description |
|---|---|---|---|
| `nouvelle_classe_uuid` | UUID | Oui | UUID de la classe de destination |
| `motif` | String | Non | Motif du changement de classe (max 255) |

#### Exemple de Requête
```bash
curl -X POST http://localhost:4004/v1/apprenants/b2c3d4e5-f6a7-8901-bcde-f12345678901/transfert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_jwt>" \
  -d '{
    "nouvelle_classe_uuid": "9c8b7a6d-5e4f-3210-fedc-ba9876543210",
    "motif": "Passage en section bilingue programme français"
  }'
```

#### Exemple de Réponse (HTTP 200 OK)
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
    "date_transfert": "2026-09-27T10:30:00+01:00",
    "changement_programme": true,
    "compte_apprenant_a_creer": true,
    "message": "Transfert effectue avec succes sans duplication du dossier."
  },
  "horodatage": "2026-09-27T10:30:00+01:00"
}
```

---

### 2.8. Consulter les paiements de scolarité (Lecture Seule Pure)
Interroge en jointure directe `finances.factures` et `finances.transactions` pour exposer la situation financière de l'élève.

* **Méthode** : `GET`
* **Route** : `/v1/apprenants/{uuid}/paiements-scolarite`
* **Authentification** : `Authorization: Bearer <token_jwt>`
* **Garantie** : Strictement aucune écriture financière n'est réalisée.

#### Exemple de Réponse (HTTP 200 OK)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```

---

### 2.9. Emplois du temps
Permet de consulter et configurer les créneaux de cours.

* **Consulter** : `GET /v1/emplois-du-temps?classe_uuid=...&jour=lundi`
* **Créer / Mettre à jour** : `POST /v1/emplois-du-temps`
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

### 2.10. Endpoint Interne (Inter-microservices)
Consommé par `api-evaluations`, `api-finances` et `api-vie-scolaire` pour connaître la classe et le programme d'un apprenant sans passer par une requête SQL directe sur le schéma `scolarite`.

* **Méthode** : `GET`
* **Route** : `/v1/interne/apprenants/{uuid}/classe`
* **Authentification** : `X-Internal-Secret: <INTERNAL_API_SECRET>`

#### Exemple de Réponse (HTTP 200 OK)
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
  "horodatage": "2026-09-27T10:00:00+01:00"
}
```
