# frontend — Interface Réactive SIGAPEI (Espace Harold)

Interface web de la plateforme **SIGAPEI** — Système Intégré de Gestion Administrative et Pédagogique des Établissements d'Instruction —, développée en **React 18 + Vite 6 + Tailwind CSS 3**.

Elle couvre l'ensemble des **7 rôles métier** définis dans le cahier des charges Harold et consomme directement les microservices `inscription` (port 4003) et `scolarite` (port 4004) via le réseau Docker partagé `sigapei`.

- **Port** : `3000`
- **URL locale** : `http://localhost:3000`
- **Stack** : React 18, Vite 6, Tailwind CSS 3, Chart.js 4
- **Branche de travail** : `feature/harold` (jamais `main`)
- **Périmètre Harold** : microservices `inscription` + `scolarite` + ce frontend uniquement

---

## 1. Démarrage rapide

### 1.1. Avec Docker (recommandé — image de production Nginx)

```bash
cp .env.example .env
# → Ajustez VITE_API_INSCRIPTION_URL et VITE_API_SCOLARITE_URL si nécessaire

# Créer le réseau partagé s'il n'existe pas encore
docker network create sigapei

docker compose up -d --build
```

L'application est disponible sur **http://localhost:3000** servie par **Nginx Alpine** (~25 Mo image finale).

> [!IMPORTANT]
> Le Dockerfile est **multi-stage** : l'étape `builder` (Node 22 Alpine) compile le bundle Vite, l'étape `production` (Nginx Alpine) sert uniquement les fichiers statiques optimisés. La taille finale de l'image est ~25 Mo contre ~400 Mo pour un conteneur Node.

### 1.2. Développement local sans Docker (hot reload Vite)

```bash
npm install
cp .env.example .env
npm run dev
```

Le serveur Vite démarre sur `http://localhost:3000` avec HMR (Hot Module Replacement) activé.

---

## 2. Intégration à l'infrastructure partagée SIGAPEI

Ce frontend fait partie de la plateforme SIGAPEI (12 microservices). Il respecte les règles d'architecture transversales :

1. **Réseau Docker commun (`sigapei`)** : Rejoint le réseau externe partagé où tournent déjà `api-inscription` et `api-scolarite`.
2. **Zéro logique métier dans le frontend** : toutes les règles de gestion (contrôle de capacité, validation de candidature, mutations sans doublon) sont dans les microservices Laravel. Le frontend est une **vue pure** des données.
3. **Données mock en développement** : tant que les APIs ne sont pas câblées, les données de démonstration proviennent de `src/data/initialData.js`. Chaque composant est architecturé pour recevoir ses props de données via `App.jsx` — le remplacement par des appels `fetch` est trivial.

---

## 3. Configuration (.env)

Toute la configuration s'effectue via le fichier `.env` (copie de `.env.example`).

| Variable | Valeur par défaut | Description |
|---|---|---|
| `VITE_API_INSCRIPTION_URL` | `http://api-inscription:4003` | URL du microservice Inscription (réseau Docker interne) |
| `VITE_API_SCOLARITE_URL` | `http://api-scolarite:4004` | URL du microservice Scolarité (réseau Docker interne) |
| `VITE_APP_ENV` | `development` | Environnement courant |
| `VITE_APP_NAME` | `SIGAPEI` | Nom de l'application |

> [!NOTE]
> En développement local sans Docker, remplacez les URLs par `http://localhost:4003` et `http://localhost:4004`.
> Les variables Vite sont préfixées `VITE_` et exposées au bundle client. Ne jamais y mettre de secrets.

---

## 4. Acteurs & Espaces couverts

Le frontend implémente les **7 rôles acteurs** du cahier des charges Harold, chacun avec son espace dédié et ses fonctionnalités propres.

### Crédentiels de démonstration (données mock)

| Rôle | Email | Mot de passe | Espace par défaut |
|---|---|---|---|
| **Administrateur** | `admin@sigapei.bj` | `admin123` | Tableau de bord |
| **Secrétaire** | `secretaire@sigapei.bj` | `sec123` | Instruction Candidatures |
| **Censeur** | `censeur@sigapei.bj` | `cen123` | Matières & Notes |
| **Enseignant** | `enseignant@sigapei.bj` | `ens123` | Mon Emploi du Temps |
| **Comptable** | `comptable@sigapei.bj` | `cpt123` | Tableau de bord Finances |
| **Parent** | `parent@sigapei.bj` | `par123` | Suivi enfant |
| **Candidat / Public** | *(accès sans connexion)* | — | Espace candidature public |

### Matrice des accès par rôle

| Module | Admin | Secrétaire | Censeur | Enseignant | Comptable | Parent | Candidat |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Tableau de bord KPIs | ✅ | — | — | — | — | — | — |
| Instruction Candidatures | ✅ | ✅ | — | — | — | — | — |
| Saisie Guichet (dossier) | ✅ | ✅ | — | — | — | — | — |
| Classes & Capacité | ✅ | — | — | — | — | — | — |
| Dossiers & Mutations | ✅ | ✅ | ✅ | — | — | — | — |
| Emplois du Temps | ✅ | — | ✅ | 👁 | — | 👁 | — |
| Frais de Scolarité | ✅ | ✅ | — | — | ✅ | 👁 | — |
| Matières & Coefficients | ✅ | — | ✅ | — | — | — | — |
| Saisie Notes & Devoirs | ✅ | — | ✅ | ✅ | — | — | — |
| Bulletins Officiels | ✅ | — | ✅ | — | — | 👁 | — |
| Années Scolaires & Rentrée | ✅ | — | — | — | — | — | — |

> ✅ Lecture + Écriture · 👁 Lecture seule · — Non visible

---

## 5. Fonctionnalités principales par espace

### 5.1. Page de Connexion (`LoginPage.jsx`)
- Sélecteur de rôle en 6 cartes cliquables avec icônes métier
- **Pré-remplissage simultané email + mot de passe** au clic sur une carte (gain UX)
- Accès public direct (Candidat / Parent sans compte) sans authentification
- Lien vers la page d'inscription de l'établissement

### 5.2. Inscription Établissement (`RegisterEtablissementPage.jsx`)
- Wizard 4 étapes validées : Infos établissement → Programme pédagogique → Niveaux & filières → Compte fondateur
- Sélection Programme Béninois / Français (règle du cahier des charges)
- Validation de formulaire à chaque étape avant passage suivant

### 5.3. Espace Administrateur
- **Tableau de bord** : KPIs globaux (apprenants actifs, candidatures en attente, taux de remplissage, recouvrements), graphiques Chart.js
- **Candidatures** : liste filtrée statut/classe/recherche, bouton "Saisie Guichet", modals d'examen complet et rejet motivé
- **Classes** : jauges de capacité en temps réel, création de classes
- **Dossiers & Mutations** : mutations sans doublon (`scolarite.historique_classes`)
- **Emplois du Temps** : sélection par classe, ajout de créneaux, vue occupation des salles
- **Frais de Scolarité** : recouvrement en lecture seule
- **Matières & Coefficients** : voir §5.8
- **Années Scolaires** : voir §5.9

### 5.4. Espace Secrétaire
- Accès restreint : Candidatures + Dossiers Apprenants uniquement (Sidebar filtrée)
- Modal "Saisie Guichet" : formulaire complet en 4 sections avec contrôle de capacité en direct

### 5.5. Espace Censeur des Études
- **Emplois du Temps** : création, modification et suppression de créneaux par classe, visualisation de l'occupation des salles
- **Matières & Notes** : gestion des coefficients par filière, feuilles de saisie, conseil de classe

### 5.6. Espace Enseignant (`EnseignantSpace.jsx`)
- **Mon EDT** : emploi du temps personnel de la semaine
- **Mes Classes** : liste des classes avec jauges d'effectif
- **Dossiers Apprenants** : lecture seule des fiches élèves
- **Feuille d'Appel interactive** : saisie Présent / En retard / Absent par séquence, validation par créneau

### 5.7. Espace Comptable (`ComptableSpace.jsx`)
- KPIs de recouvrement (collecté, en attente, en retard)
- Filtres par statut de paiement et par classe
- Export CSV de l'échéancier
- Modal "Échéancier" : détail des 3 tranches annuelles par élève

### 5.8. Espace Parent (`ParentSpace.jsx`)
- Sélecteur de fratrie (plusieurs enfants sur le même compte)
- 4 onglets : Emploi du Temps, Relevé de Notes & Moyennes (avec coefficients), Frais & Tranches, Historique Scolaire

### 5.9. Matières & Notes (`MatieresNotesView.jsx`)
- **Onglet Matières & Coefficients** : tableau complet des matières par classe (code, groupe disciplinaire, professeur), coefficients modifiables par filière en direct, ajout de nouvelles matières au programme
- **Onglet Saisie des Notes** : saisie du Devoir Surveillé et de l'Examen Trimestriel par matière/élève, calcul instantané de la moyenne avec code couleur
- **Onglet Conseil de Classe & Bulletins** : classement des élèves, mentions du conseil de classe, aperçu complet du Bulletin Scolaire Trimestriel Officiel avec impression

### 5.10. Années Scolaires (`AnneeScolaireView.jsx`)
- Gestion des sessions actives / archivées / en préparation
- Sélecteur d'année académique global dans le Header (toute la plateforme est filtrée)
- Création d'une nouvelle année avec reconduction de la structure pédagogique
- Procédure de clôture et transition de rentrée (passage des élèves admis en classe supérieure sans doublon)

---

## 6. Structure du projet

```
frontend/
├── docker/
│   └── nginx.conf              Configuration Nginx (SPA, gzip, cache, sécurité)
├── public/
│   └── logo-sigapei.png        Logo officiel SIGAPEI (favicon + header)
├── src/
│   ├── assets/
│   │   └── logo-sigapei.png    Copie assets interne (référencée par import JS)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AnneeScolaireView.jsx   Gestion années scolaires & rentrée
│   │   │   ├── ApprenantsView.jsx      Dossiers élèves & mutations sans doublon
│   │   │   ├── CandidaturesView.jsx    Instruction et validation des candidatures
│   │   │   ├── ClassesView.jsx         Classes, filières & contrôle de capacité
│   │   │   ├── DashboardView.jsx       Tableau de bord KPIs + Chart.js
│   │   │   ├── EmploisView.jsx         Emplois du temps & occupation des salles
│   │   │   ├── FinancesView.jsx        Frais de scolarité (lecture seule)
│   │   │   └── MatieresNotesView.jsx   Matières, coefficients, notes & bulletins
│   │   ├── candidat/
│   │   │   └── CandidatSpace.jsx       Espace public candidature
│   │   ├── common/
│   │   │   └── Toast.jsx               Notifications toast (succès / erreur)
│   │   ├── comptable/
│   │   │   └── ComptableSpace.jsx      Tableau de bord comptable & échéanciers
│   │   ├── enseignant/
│   │   │   └── EnseignantSpace.jsx     EDT, classes, dossiers & feuille d'appel
│   │   ├── modals/
│   │   │   ├── CreateCandidatureModal.jsx  Saisie guichet (secrétaire / admin)
│   │   │   ├── CreateClasseModal.jsx       Création d'une classe
│   │   │   ├── ExamineModal.jsx            Examen complet d'un dossier de candidature
│   │   │   ├── MutationModal.jsx           Mutation d'un élève entre classes
│   │   │   └── RejectModal.jsx             Rejet motivé d'une candidature
│   │   ├── parent/
│   │   │   └── ParentSpace.jsx         Suivi enfant (EDT, notes, frais, historique)
│   │   ├── Header.jsx                  Bandeau principal (logo, année scolaire, profil)
│   │   └── Sidebar.jsx                 Navigation filtrée par rôle
│   ├── data/
│   │   └── initialData.js              Données mock de démonstration (classes, candidatures,
│   │                                   apprenants, matières, notes, années scolaires)
│   ├── pages/
│   │   ├── LoginPage.jsx               Connexion multi-rôles avec pré-remplissage
│   │   └── RegisterEtablissementPage.jsx  Wizard d'inscription en 4 étapes
│   ├── App.jsx                         Racine de l'application (auth, routing, état global)
│   ├── index.css                       Styles globaux Tailwind + utilitaires SIGAPEI
│   └── main.jsx                        Point d'entrée React (ReactDOM.createRoot)
├── .env.example                        Variables d'environnement à compléter
├── .gitignore                          Exclusions Git (node_modules, dist, .env)
├── docker-compose.yml                  Orchestration Docker (réseau sigapei partagé)
├── Dockerfile                          Image multi-stage Node 22 → Nginx Alpine
├── index.html                          Shell HTML (favicon, polices Google, point de montage)
├── package.json                        Dépendances npm
├── postcss.config.js                   Configuration PostCSS (requis par Tailwind)
├── tailwind.config.js                  Thème SIGAPEI (couleurs, typographies)
├── vite.config.js                      Configuration Vite (port 3000, hot reload)
└── README.md                           Ce fichier
```

---

## 7. Charte graphique SIGAPEI

Le thème est entièrement défini dans `tailwind.config.js` avec les tokens officiels de la charte graphique :

| Token Tailwind | Valeur HEX | Usage |
|---|---|---|
| `sigapei-green` | `#006B3C` | Couleur primaire — Header, boutons CTA |
| `sigapei-sidebar` | `#004D2B` | Fond Sidebar et mini-headers |
| `sigapei-gold` | `#E9AA20` | Couleur accent — badges, icônes actifs, coefficients |
| `sigapei-cream` | `#FFF6DD` | Texte sur fond vert |
| `sigapei-canvas` | `#F8FAFC` | Fond général de l'application |
| `sigapei-black` | `#000000` | Texte principal |

**Typographies** (Google Fonts) :
- `Inter` : corps de texte et UI
- `Poppins` : titres et headings (`font-heading`)
- `JetBrains Mono` : notes, matricules, valeurs numériques (`font-mono`)

---

## 8. État global & Architecture React

L'état de l'application est centralisé dans `App.jsx` et transmis par props aux composants enfants. Pas de librairie d'état externe (Redux, Zustand) — la gestion par props est suffisante pour la taille actuelle du projet.

```
App.jsx
├── currentUser  { role, nom, etablissement }     → Auth (null = non connecté)
├── academicYear  '2026-2027'                      → Année scolaire active (sélecteur Header)
├── classes      []                                → Liste des classes (React state)
├── candidatures []                                → Liste des candidatures
├── apprenants   []                                → Liste des apprenants
└── Modals :
    ├── examineCandidateId
    ├── rejectCandidateId
    ├── mutationApprenantId
    ├── isCreateClasseOpen
    └── isCreateCandidatureOpen
```

**Routing par rôle** (pas de React Router — routage par état) :

```
null (non connecté) → LoginPage ou RegisterEtablissementPage
admin / secretaire / censeur → Layout Sidebar + Header (Admin Layout)
enseignant / comptable / parent / candidat → AppHeader simplifié (espace propre)
```

---

## 9. Scripts npm disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur Vite HMR sur `localhost:3000` |
| `npm run build` | Compile le bundle de production dans `dist/` |
| `npm run preview` | Prévisualise le build de production localement |

---

## 10. Dockerisation — Détails techniques

### Architecture multi-stage

Le Dockerfile utilise **deux étapes** distinctes pour minimiser la taille de l'image finale :

```
Étape 1 — builder (node:22-alpine)
  npm ci
  npm run build → dist/

Étape 2 — production (nginx:stable-alpine)
  COPY dist/ → /usr/share/nginx/html
  nginx -g "daemon off;"
```

**Résultat** : image finale ~25 Mo vs ~400 Mo pour un conteneur Node.js de développement.

### Configuration Nginx (`docker/nginx.conf`)

- **SPA fallback** : `try_files $uri $uri/ /index.html` — toutes les routes React sont gérées côté client.
- **Cache immutable** : les assets Vite (hachés par contenu) sont mis en cache 1 an par le navigateur.
- **Compression gzip** : tous les assets text/JS/CSS sont compressés (~60% de réduction du poids).
- **Headers de sécurité** : `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`.

### Démarrage dans le réseau partagé

```bash
# Réseau partagé (créer une seule fois pour toute la plateforme)
docker network create sigapei

# Frontend seul
docker compose up -d --build

# Vérifier que le conteneur tourne
docker compose ps
docker compose logs -f
```

---

## 11. Règles de développement à respecter (feature/harold)

> [!IMPORTANT]
> Ces règles sont **strictes** et ne souffrent d'aucune exception sur cette branche.

1. **Branche** : travailler **exclusivement sur `feature/harold`**. Ne jamais pousser directement sur `main`.
2. **Périmètre** : seuls les microservices `inscription` (port 4003) et `scolarite` (port 4004) ainsi que ce `frontend/` sont dans le périmètre Harold.
3. **Pas de jointures inter-schémas** : les échanges de données entre microservices se font via `/interne/*` (appels API internes) ou via RabbitMQ. Jamais par requêtes SQL directes entre schémas.
4. **Données mock** : tant que les APIs Laravel ne sont pas prêtes, les données viennent de `src/data/initialData.js`. Chaque composant qui reçoit des données par props est déjà prêt pour le câblage API.
5. **Commits conventionnels** : préfixes `feat(frontend):`, `fix(frontend):`, `style(frontend):`, `docs(frontend):`.
