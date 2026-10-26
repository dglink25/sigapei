# api-demandes - Microservice Demandes Administratives - Plateforme SIGAPEI

Guichet unique de demande de documents (apprenants, personnel et enseignants),
permissions d'absence et réclamations - rôles et permissions entièrement paramétrables.

- **Port** : `4007`
- **Préfixe API** : toutes les routes sont sous `/v1/...`
- **Port interne** : non publié sur l'hôte, accès via la Gateway (réseau `sigapei`)
- **Sonde de santé** : `GET /sante`
- **Documentation interactive** : `GET /docs` (Swagger) - désactivée en production sauf `SWAGGER_ENABLED=true`
- **Stack** : NestJS (TypeScript), PostgreSQL (schéma `demandes`), RabbitMQ (notifications).

---

## 1. Principe fondamental

Ce microservice **n'est pas propriétaire des données métier** - il ne recopie jamais le dossier du demandeur. Conformément au README plateforme (règle n°1 : **aucune jointure SQL inter-schémas**), chaque vérification d'éligibilité interroge, au moment du traitement, l'API interne du microservice propriétaire (`X-Internal-Secret`) :
- Scolarité : `GET /v1/interne/apprenants?uuid=…` (dossier actif) pour un demandeur apprenant
- RH : endpoint interne à définir avec Arsène pour un demandeur personnel/enseignant
- Finances : `GET /v1/interne/solde/{apprenant_uuid}` si la règle de blocage sur impayé est activée
- Évaluations : `GET /v1/interne/eligibilite-document/{apprenant_uuid}` pour les bulletins

---

## 2. Démarrage rapide (Docker)

```bash
cp .env.example .env
# Complétez avec les valeurs fournies par le chef de projet

docker compose up -d --build
npm run migration:run
```

### Sans Docker

```bash
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

---

## 3. Configuration (obligatoire)

- `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` - identifiants Neon (chef de projet)
- `DB_SCHEMA=demandes` - ne pas modifier
- `DB_SSL=true` - obligatoire avec Neon
- `REDIS_DB=6`
- `INTERNAL_API_SECRET` - valeur partagée (chef de projet)
- `RABBITMQ_URL` - mêmes valeurs que `identite`

---

## Sécurité

- Garde globale `ContexteGatewayGuard` : les en-têtes `X-Tenant-Id`, `X-User-Id`, `X-User-Role` ne sont acceptés **qu'avec un `X-Internal-Secret` valide** (sinon n'importe quel conteneur du réseau pourrait se déclarer administrateur). Fail closed.
- `/interne/*` : `InternalSecretGuard` (comparaison en temps constant).
- Limitation de débit globale (`ThrottlerGuard`, 120 req/min/IP), `helmet`, CORS en liste blanche explicite, TLS vérifié vers Neon, `synchronize` impossible hors développement local.
- Les permissions métier (qui traite, qui valide) seront résolues dynamiquement depuis la matrice de rôles d'Identité (CDC section 5) - jamais codées en dur.

## 4. Schéma de données (`demandes`)

| Table | Rôle |
|---|---|
| `types_document` | Référentiel des types de documents, catégorie demandeur, règles d'éligibilité |
| `demandes_administratives` | Demande individuelle avec statut et référence au document généré |
| `permissions_absence` | Demande de permission d'absence et sa décision |
| `reclamations` | Fil de réclamation bidirectionnel (utilisateur ↔ établissement) |
| `message_reclamation` | Messages successifs d'un fil de réclamation |

**Note :** La table `role_permissions` (CDC section 5.3) est une extension du schéma `identite` - à coordonner avec Don Diègue avant implémentation.

---

## 5. Endpoints (`/v1`)

| Méthode | Endpoint | Rôle |
|---|---|---|
| `POST` | `/demandes` | Soumet une demande (tout profil), déclenche la vérification d'éligibilité |
| `GET` | `/demandes/{uuid}` | Consulte le statut et l'historique |
| `PUT` | `/demandes/{uuid}/traiter` | Passe en traitement / génère le document |
| `PUT` | `/demandes/{uuid}/rejeter` | Rejette avec motif obligatoire |
| `POST` | `/permissions-absence` | Soumet une demande de permission |
| `PUT` | `/permissions-absence/{uuid}/decision` | Valide ou rejette |
| `POST` | `/reclamations` | Ouvre une réclamation |
| `POST` | `/reclamations/{uuid}/messages` | Ajoute un message au fil |
| `PUT` | `/reclamations/{uuid}/statut` | Met à jour le statut |
| `POST` | `/types-document` | Configure un type de document et ses règles |
| `GET` | `/interne/permission-active/{apprenant_uuid}` | Consommé par Vie scolaire |
| `GET` | `/interne/permissions-role/{role_uuid}` | Consommé par Identité |

---

## 6. RabbitMQ - événements publiés

| Événement | Déclenché quand | Consommateur |
|---|---|---|
| `demandes.statut.change` | Tout changement de statut d'une demande | Communication |
| `demandes.permission.decision` | Décision sur une permission d'absence | Communication |
| `demandes.reclamation.message` | Nouveau message dans un fil | Communication |

---

## 7. Points de coordination obligatoires avant implémentation

- **Don Diègue (Identité)** : extension `role_permissions` (CDC section 5.2) - à valider avant tout développement du Service Permissions
- **Paul (Vie scolaire)** : contrat d'interface de l'endpoint `/interne/permission-active` (CDC section 19.7)
- **Arsène (RH)** : endpoint interne RH pour l'éligibilité des demandeurs personnel (CDC section 19.2 - pas de jointure SQL, règle n°1)
