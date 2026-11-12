# api-paiement - Microservice Paiement (SIGAPEI)

Service **autonome** : son propre schéma PostgreSQL `paiement`, aucune clé étrangère vers un autre service
(les établissements et les utilisateurs sont référencés par `uuid`). Agrégateurs prévus : FedaPay, CinetPay.

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| **0. Fondations** | Schéma de base, grand livre à double entrée, états contrôlés par la base, audit chaîné et cloisonné, isolation par établissement, chiffrement, montants entiers | **Terminée - 72 tests passent** |
| 1. FedaPay – encaissement | Création de transaction, webhook signé, vérification auprès de l'agrégateur, crédit du portefeuille | À faire |
| 2. FedaPay – décaissement | Payout (création puis envoi), « incertain » résolu par interrogation, réserve de fonds | À faire |
| 3. Activation et configuration | Agrégateurs, modes, accords, demandes, comptes de réception, test de validation, préférences | À faire |
| 4. Règlement et retraits | Règlement automatique (immédiat, quotidien, hebdomadaire), avance de trésorerie, retraits | À faire |
| 5. Reçus, notifications | PDF signé, stockage non supprimable, liens protégés, site, e-mail, SMS, WhatsApp | À faire |
| 6. CinetPay | Adaptateur selon sa documentation officielle | À faire (documentation attendue) |

## Installation

```bash
npm install
cp .env.example .env        # renseigner la base, puis générer les clés (voir plus bas)
npm run migration:run       # crée le schéma "paiement" puis applique les migrations
psql -f docs/roles.sql      # rôle applicatif SANS droit de propriétaire (isolation + tables en ajout seul)
npm run start:dev
```

Générer une clé de chiffrement (une pour chaque version, et une pour les empreintes) :
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
**Aucune clé n'est dans le code ni dans le dépôt** : variables d'environnement uniquement.

## Tests

```bash
npm test               # 72 tests ; un PostgreSQL embarqué est démarré automatiquement, rien à installer
npm run test:unit
npm run test:integration
```

## Ce que la base garantit (indépendamment du code applicatif)

- **Grand livre** : écritures immuables, débit = crédit par opération (vérifié à la validation), solde jamais négatif,
  solde modifiable uniquement par une écriture, idempotence par clé, aucun interblocage sous concurrence.
- **États** : chaque objet (encaissement, décaissement, compte de réception, remboursement…) ne peut changer d'état que
  selon les transitions autorisées ; chaque changement est journalisé automatiquement. Un échec de payout est définitif.
- **Audit** : journal en ajout seul, chaîné par empreintes SHA-256 (flux par établissement + flux plateforme), falsification
  ou suppression détectées ; consultation cloisonnée (super admin, administrateur, utilisateur) et isolation PostgreSQL (RLS).
- **Reçus** : numérotation sans trou par établissement et par année, reçus immuables, un seul reçu par opération.
- **Paiements du personnel** : trois personnes désignées au plus, préparateur ≠ approbateur (contrainte de base).
- **Références marchandes** uniques par agrégateur (pas de double paiement) ; montants entiers, une devise par portefeuille.

## Structure (conventions d'Identité)

```
src/
  config/          configuration (variables d'environnement)
  common/          securite/ (chiffrement), etats/ (machines à états), utils/ (montants), filters/, interceptors/
  database/        data-source, contexte d'accès (RLS), migrations/
  livre/           grand livre (portefeuilles, comptes, écritures)
  audit/           journal d'audit chaîné et consultation cloisonnée
  sante/           sonde de disponibilité
docs/roles.sql     rôle applicatif PostgreSQL
test/              unitaires/ et integration/ (PostgreSQL embarqué)
```

## Règles de développement

- Montants : entiers (unités mineures), jamais de nombre à virgule flottante ; aucune conversion entre devises.
- Ne jamais réutiliser une référence marchande ; ne jamais relancer un décaissement « incertain » sans interroger l'agrégateur.
- Toute modification du schéma passe par une migration ; les machines à états du code et de la base doivent rester identiques
  (un test le vérifie).
