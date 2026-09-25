# api-inscription — Microservice Inscription (Admissions) — SIGAPEI

Microservice de gestion du parcours d'admission et de réinscription de la plateforme **SIGAPEI** :
constitution des dossiers de candidature, gestion des pièces justificatives (stockage objet S3/MinIO),
évaluation des tests d'admission, validation d'affectation avec contrôle bloquant de capacité, et reconduction
d'une année sur l'autre sans duplication de dossiers.

- **Port** : `4003`
- **Sonde de santé** : `GET /sante`
- **Préfixe API** : toutes les routes métier sont sous `/v1/...`
- **Catalogue interactif des endpoints (JSON)** : `GET /docs` (public, sans authentification)
- **Documentation complète en Markdown** : [docs/api-documentation.md](file:///c:/Users/PC/Documents/Projets/sigapei/api-inscription/docs/api-documentation.md)

---

## 1. Règles d'or de l'Admission

1. **Vérification de capacité bloquante** :
   Aucune candidature ne peut être validée pour une classe ayant atteint son quota. La vérification s'opère par jointure SQL directe en temps réel sur `scolarite.classes` et `scolarite.apprenants`.
2. **Création directe sans duplication** :
   La validation insère immédiatement l'apprenant dans `scolarite.apprenants` avec son lien de traçabilité `candidature_id`. Le dossier de candidature reste l'historique d'admission immuable.
3. **Application de la règle du programme pédagogique** :
   - Si la classe visée suit le **programme béninois** : aucun compte de connexion élève n'est créé (`utilisateur_id = NULL`), le parent rattaché pilote exclusivement l'accès via `scolarite.parents_apprenants`.
   - Si la classe visée suit le **programme français** : compte élève activé dès le secondaire.
4. **Rejet motivé obligatoire** :
   Le rejet d'une candidature impose un motif textuel explicatif obligatoire stocké pour consultation du parent/candidat.
5. **Réinscriptions sans duplication** :
   Reconduction de la fiche existante sur la nouvelle classe/année scolaire sans duplication de dossier.

---

## 2. Routes de l'API (`/v1`)

| Méthode | Endpoint | Rôle |
|---|---|---|
| `GET` | `/docs` | **Catalogue interactif JSON** de tous les endpoints et leurs formats |
| `GET` | `/sante` | Sonde de santé du microservice |
| `POST` | `/v1/candidatures` | Soumet un dossier de candidature (secrétaire ou parent, accessible publiquement) |
| `GET` | `/v1/candidatures` | Liste les candidatures du tenant (filtrable par statut/classe) |
| `GET` | `/v1/candidatures/{uuid}` | Détail d'une candidature, statut, pièces et tests |
| `POST` | `/v1/candidatures/{uuid}/pieces-justificatives` | Ajoute une pièce justificative (référencée S3/MinIO) |
| `POST` | `/v1/candidatures/{uuid}/tests-admission` | Enregistre le résultat d'un test d'admission |
| `POST` | `/v1/candidatures/{uuid}/valider` | Valide la candidature : vérifie place et génère l'apprenant |
| `POST` | `/v1/candidatures/{uuid}/rejeter` | Rejette la candidature avec un motif obligatoire |
| `POST` | `/v1/reinscriptions` | Reconduit un apprenant existant sur la nouvelle année |

> [!NOTE]
> Pour le détail des paramètres de requête, corps JSON et formats de retour de chaque route, consultez le [dossier docs](file:///c:/Users/PC/Documents/Projets/sigapei/api-inscription/docs/api-documentation.md) ou appelez directement `GET http://localhost:4003/docs`.

---

## 3. Architecture & Modèle de Données

Schéma PostgreSQL : `inscription`
- `inscription.candidatures` : `(id, uuid, tenant_id, nom, prenom, date_naissance, sexe, email, telephone, adresse, classe_visee_id, statut, date_soumission, motif_rejet, parent_nom, parent_prenom, parent_telephone, parent_email, parent_lien, created_at, updated_at)`
- `inscription.pieces_justificatives` : `(id, uuid, tenant_id, candidature_id, type, nom_original, chemin_stockage, taille_octets, mime_type, statut_validation, created_at, updated_at)`
- `inscription.tests_admission` : `(id, uuid, tenant_id, candidature_id, type_test, matiere, note, note_max, resultat, observations, evalue_par_id, date_test, created_at, updated_at)`
- `inscription.reinscriptions` : `(id, uuid, tenant_id, apprenant_id, ancienne_classe_id, nouvelle_classe_id, annee_scolaire, statut, motif_rejet, date_demande, created_at, updated_at)`

---

## 4. Démarrage Rapide

### Avec Docker
```bash
cp .env.example .env
docker compose up -d --build
```

### Sans Docker (Développement local)
```bash
composer install
cp .env.example .env
php -S 0.0.0.0:4003 -t public
```
