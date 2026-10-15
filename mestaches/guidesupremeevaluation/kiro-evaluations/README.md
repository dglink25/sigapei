# Paquet Kiro — Microservice Évaluations

Conversion fidèle du « Cahier des charges technique — Microservice Évaluations » (Mirco Houénangon S.) en fichiers Kiro.

## Installation
Copier le dossier `.kiro/` à la racine du dépôt `api-evaluations` (ou de l'espace de travail Kiro).

```
.kiro/
├── steering/                       (contexte permanent, inclusion: always)
│   ├── 00-regles-absolues.md       règles de fidélité + principes non négociables
│   ├── 01-produit.md               rôle, objectifs, acteurs, décisions de réunion, grilles
│   ├── 02-technique.md             stack, architecture, RabbitMQ, intégrations, NFR, Docker
│   ├── 03-structure-projet.md      arborescence imposée
│   ├── 04-securite-conformite.md   sécurité, mineurs, cadre APDP/RGPD, interdictions
│   └── 05-points-a-trancher.md     incohérences/lacunes de la source (20 points)
└── specs/
    ├── evaluations-core/           sprint initial (phases 0 à 8)
    │   ├── requirements.md
    │   ├── design.md               modèle de données, API, figures décrites en texte
    │   └── tasks.md
    └── compositions-en-ligne/      phase 2 — BLOQUÉE tant que le correctif E-learning n'est pas validé avec Roc
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Ce qui est fidèle à la source / ce qui est signalé
- Tout le contenu normatif du PDF (règles, normes, sécurité, tableaux, endpoints, NFR, planning) est repris.
- Les 5 figures sont décrites en texte (cas d'utilisation, classes, architecture, relations, Gantt).
- Les contradictions et manques du PDF ne sont **pas tranchés** : ils sont listés dans `steering/05-points-a-trancher.md`.
