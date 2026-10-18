# api-finances — Microservice Finances — SIGAPEI

Double flux entrant/sortant, abonnement plateforme, hibernation sur impayé.

- **Port** : `4008` (interne, non publié) | **Schéma** : `finances` | **Redis DB** : `5`
- **Préfixe API** : `/v1/...` | **Sonde de santé** : `GET /sante`
- **Stack** : Laravel 12, PHP 8.4, PostgreSQL (Neon), RabbitMQ

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api-finances php artisan migrate
```

## Règle fondamentale

`finances.transactions` est la **seule table** pour tous les flux (ENTRANT/SORTANT). Elle est **immuable** après confirmation. Toute correction est une nouvelle transaction liée à l'originale.

## Schéma `finances`

| Table | Rôle |
|---|---|
| `formules_tarifaires` | Frais de scolarité par classe |
| `factures` | Facturation par apprenant |
| `transactions` | Table unique immuable de tous les flux |
| `abonnements` | Abonnement plateforme (actif/grâce/hibernation) |
| `abonnements_paiements` | Règlements confirmés par webhook |
| `audit_log` | Journal immuable de toutes les décisions |

## Point de coordination obligatoire

Contractualiser avec Don Diègue (Établissements) le contrat d'interface de l'événement `finances.abonnement.hibernation` **avant** d'implémenter le Service Abonnement.

## Sécurité (règles plateforme n°3 et n°5)

| Routes | Protection |
|---|---|
| `/v1/*` métier | `auth.tenant` : en-têtes Gateway `X-Tenant-Id`, `X-User-Id`, `X-User-Role` **acceptés uniquement avec `X-Internal-Secret` valide**, puis `role:...` (Tableau 1) |
| `/v1/webhooks/fedapay` | Signature `X-FEDAPAY-SIGNATURE` (HMAC-SHA256 `t.corps`, fenêtre anti-rejeu 300 s) |
| `/v1/webhooks/kkiapay` | En-tête `x-kkiapay-secret` = secret du tableau de bord KkiaPay |
| `/v1/interne/*` | `X-Internal-Secret` uniquement |

Toute configuration manquante (secret absent ou laissé à `change-me`) refuse la requête (fail closed).
