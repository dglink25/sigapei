# api-finances - Microservice Finances - SIGAPEI

Formules tarifaires, facturation des apprenants, règlements à double validation, paiement en ligne (via le
microservice **Paiement**), soldes, relances et rapports de l'établissement.

- **Port** : `4008` (interne, non publié) | **Schéma** : `finances` | **Redis DB** : `5`
- **Préfixe API** : `/v1/...` | **Sonde de santé** : `GET /sante`
- **Documentation** : Swagger UI sur `GET /docs`, OpenAPI 3 brut sur `GET /docs-json` (source : [docs/openapi.json](docs/openapi.json))
- **Stack** : Laravel 12, PHP 8.4, PostgreSQL (Neon), Redis (cache), RabbitMQ (événements), dompdf (PDF)

## Démarrage

```bash
cp .env.example .env                      # renseigner DB_*, INTERNAL_API_SECRET, URLs des services
composer install
php artisan migrate                       # le schéma `finances` doit exister (créé par l'administrateur de la base)
docker compose up -d --build              # API + planificateur (schedule:work)
```

La première migration vérifie que le schéma `finances` existe et s'arrête sinon : aucune table n'est jamais
créée ailleurs (`public` compris).

## Partage des rôles avec Paiement

| Finances (ce service) | Paiement (`paiement/`, port 4010) |
|---|---|
| Ce qu'un apprenant **doit** : formules, factures, échéances, soldes, relances | Mouvements d'**argent réel** : agrégateurs, portefeuilles, grand livre, décaissements |
| Règlements saisis à la main (espèces, virement, chèque) | Encaissements en ligne (mobile money, carte) |
| Demande un encaissement pour une facture, puis relit son état | Exécute l'encaissement et notifie Finances |

Finances ne détient **aucune** clé d'agrégateur et ne reçoit aucun webhook externe.

### Contrat attendu du service Paiement (routes internes, `X-Internal-Secret`)

| Appel | Corps / réponse |
|---|---|
| `POST /v1/interne/encaissements` + en-tête `Idempotency-Key` (uuid du paiement Finances) | `{etablissement_uuid, devise, montant, objet_type: "facture", objet_uuid, libelle, payeur_utilisateur_uuid, url_retour}` → `{uuid, statut, url_paiement, expire_le}` |
| `GET /v1/interne/encaissements/{uuid}` (+ `X-Tenant-Id`) | `{uuid, etablissement_uuid, objet_type, objet_uuid, devise, montant, montant_rembourse, statut, approuve_le}` |
| Notification → `POST {finances}/v1/interne/paiements/notification` | `{encaissement_uuid}` |

États reconnus (machine « encaissement » de Paiement) : `initie`, `en_attente`, `approuve`, `refuse`, `annule`,
`expire`, `disponible`, `rembourse_partiel`, `rembourse`. Sont acquis : `approuve`, `disponible`,
`rembourse_partiel`, `rembourse`.

Finances **ne croit jamais une notification** : il relit l'encaissement, vérifie établissement, facture et montant,
puis enregistre le règlement une seule fois (index unique). Un remboursement fait chez Paiement produit un
règlement négatif du même montant. La commande `finances:synchroniser-paiements` (toutes les 10 minutes) rattrape
une notification perdue. Tant que Paiement n'expose pas ces routes, le paiement en ligne répond 503 ; rien n'est
jamais supposé payé.

## Schéma `finances`

| Table | Rôle |
|---|---|
| `parametres` | Devise, séparation des tâches, paliers de relance, mentions du reçu |
| `permissions_role` | Grille rôle x action de l'établissement |
| `formules_tarifaires` | Frais par année, portée (établissement, cycle, niveau, classe) et échéancier |
| `factures`, `facture_lignes`, `echeances` | Facture figée à l'émission (lignes et échéances immuables en base) |
| `reglements` | Règlements en ligne et manuels ; un règlement décidé est figé ; `montant_regle` et statut tenus par trigger |
| `paiements_en_ligne` | Suivi des encaissements demandés à Paiement |
| `relances` | Une relance par échéance et par palier |
| `compteurs`, `journal_audit` | Numérotation sans trou (FA-2026-000001, RE-2026-000001) ; journal en ajout seul |

## Droits

Aucun intitulé de rôle n'est codé : l'administrateur de l'établissement attribue les actions
(`consulter_finances`, `gerer_tarifs`, `emettre_factures`, `annuler_facture`, `saisir_reglement`,
`valider_reglement`, `consulter_rapports`) à chaque rôle, y compris personnalisé (« comptable », « caissier »).
L'administrateur a tous les droits. Apprenants et parents ne voient que les factures des apprenants auxquels
Scolarité les rattache. Le super administrateur n'accède à aucune donnée d'un établissement.

Séparation des tâches (active par défaut) : un règlement manuel est validé par un autre profil que celui qui l'a
saisi (contrôlé dans le service **et** par une contrainte en base). Sa désactivation est journalisée et publiée
(`finances.separation_taches.desactivee`).

## Sécurité

| Routes | Protection |
|---|---|
| `/v1/*` métier | `Authorization: Bearer <jeton Identité>` vérifié par introspection, ou contexte Gateway accepté uniquement avec `X-Internal-Secret` valide ; accès au module vérifié dans Identité |
| `/v1/documents/*` | Lien relatif signé (5 minutes), établissement inclus dans la signature |
| `/v1/interne/*` | `X-Internal-Secret` uniquement |

Toute dépendance injoignable ou réponse hors contrat donne 503 (jamais un accès ou un paiement supposé).
Adresse de retour d'un paiement : uniquement une origine de `CORS_ORIGINS` (pas de redirection ouverte).

## Routes internes exposées

| Route | Consommateur |
|---|---|
| `GET /v1/interne/solde/{apprenant_uuid}` | Demandes (règle « solde à jour ») |
| `GET /v1/interne/apprenants/paiements?apprenant_uuid=` | Scolarité (vue consolidée) |
| `POST /v1/interne/paiements/notification` | Paiement |

## Événements publiés (échange `sigapei.events`)

`finances.facture.emise`, `finances.facture.annulee`, `finances.paiement.confirme`, `finances.trop_percu`,
`finances.relance.due`, `finances.separation_taches.desactivee`.

## Tâches planifiées

| Commande | Fréquence |
|---|---|
| `finances:synchroniser-paiements` | toutes les 10 minutes |
| `finances:relances` | chaque jour à 08:00 (heure de Porto-Novo) |

## Tests

```bash
php vendor/bin/phpunit    # PostgreSQL de test (voir phpunit.xml) ; Identité, Scolarité et Paiement simulés
```
