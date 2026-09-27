# Frontend SIGAPEI — Portails Inscription & Scolarité

Interface web professionnelle, moderne et responsive de la plateforme **SIGAPEI**, réalisée en stricte conformité avec le document de référence de la **Charte Graphique (Version 01 - 2026)**.

Ce module frontend couvre **exclusivement les formulaires et espaces de travail de la plateforme** (aucun site vitrine, conformément aux instructions) :
1. **Espace Candidat & Admission** : Formulaire multi-étapes de candidature, suivi en temps réel par référence, réinscription annuelle sans doublon.
2. **Espace Administration & Scolarité** : Tableau de bord KPIs (direction artistique page 8), instruction des candidatures, gestion des classes avec contrôle bloquant de capacité, mutations d'élèves sans duplication, emplois du temps.
3. **Espace Parent & Élève** : Dossier apprenant, statut du compte utilisateur selon la règle Bénin/France, planning hebdomadaire, consultation des frais de scolarité en **lecture seule pure**.

---

## 1. Respect Strict de la Charte Graphique (`dqonz88y295a3poahkgo.pdf`)

### 1.1. Palette Chromatique Officielle (Pages 5 & 12)

| Rôle | Nom & Code HEX | Utilisation dans l'interface |
|---|---|---|
| **Primaire** | **VERT SIGAPEI** (`#006B3C`) | Structure, navigation principale, en-têtes, boutons d'action principale (`Action principale`), validation réussie |
| **Secondaire / Accent** | **OR SIGAPEI** (`#E9AA20`) | Actions d'engagement, focus, points clés, boutons d'accent (`Action secondaire`), alertes d'attention, statuts en attente |
| **Contraste** | **CRÈME** (`#FFF6DD`) | Logo institutionnel, badges clairs, texte sur fond vert sombre |
| **Impact** | **NOIR** (`#000000`) | Textes d'impact, fond de contraste fort, lisibilité des chiffres clés |

> **Principe directeur de la marque (Page 2)** :  
> *« Le vert domine. L'or signale. Le crème respire. Le noir cadre. »*

### 1.2. Construction du Logo (Pages 3 & 4)
* Carré aux angles fortement arrondis en **Vert SIGAPEI** (`#006B3C`).
* Typographie « SIGAPEI » en capitales en **Crème** (`#FFF6DD`).
* Accent incliné superposé en bas à droite en **Or SIGAPEI** (`#E9AA20`).

### 1.3. Typographie (Page 6)
* Police de caractères recommandée : **Inter** (avec alternative **Poppins** pour les titres).
* Hiérarchie web respectée : H1 (32-40 px), H2 (24-28 px), H3 (18-20 px), Body (14-16 px), Caption (12 px).

### 1.4. Composants UI & Direction Artistique (Pages 7 & 8)
* **Boutons** :
  * *Action principale* : Vert SIGAPEI plein, texte blanc/crème.
  * *Action secondaire* : Or SIGAPEI plein, texte noir contrasté.
  * *Action neutre* : Contour sombre/gris, fond transparent.
* **Badges de statut** :
  * `VALIDÉ` : Vert `#006B3C`
  * `EN ATTENTE` : Or `#E9AA20`
  * `ERREUR / REJETÉ` : Rouge `#B91C1C`
* **Dashboard** :
  * Sidebar verte institutionnelle (`#006B3C`) avec menus actifs en or (`#E9AA20`).
  * Cartes de statistiques blanches à coins arrondis et ombrages doux.
  * Graphique d'évolution à courbe verte (donnée principale) et seuil or (point d'attention).

---

## 2. Règles Métier Implémentées dans les Interfaces

1. **Règle du Programme Pédagogique (Béninois vs Français)** :
   * **Programme Béninois** : aucun compte de connexion élève n'est créé (`utilisateur_id = NULL`), l'élève n'ayant pas le droit de posséder un smartphone en milieu scolaire. L'accès aux notes et planning s'effectue exclusivement sous le compte du parent référent.
   * **Programme Français** : compte élève autonome activé dès le cycle secondaire.
   * **Mutation Béninois $\rightarrow$ Français** : la modale de transfert détecte le changement et prévient automatiquement du provisionnement du compte élève.
2. **Contrôle bloquant de capacité en temps réel** :
   * Chaque classe affiche sa jauge d'effectif et ses places restantes (`capacite - inscrits`).
   * Si une classe est complète (ex: CM2 A à 30/30), la validation d'une candidature vers cette classe est **bloquée et désactivée**.
3. **Rejet de candidature obligatoirement motivé** :
   * La modale de refus exige un motif explicite (minimum 5 caractères) consigné pour consultation du candidat.
4. **Non-duplication de dossier** :
   * Les transferts de classe et réinscriptions modifient la classe sur la fiche élève existante et alimentent l'historique sans jamais dupliquer l'apprenant.
5. **Situation financière en lecture seule pure** :
   * L'espace parent expose les échéances et le solde dû/réglé sans autoriser aucune écriture comptable.

---

## 3. Architecture Technique (React 18 + Vite + Tailwind CSS)

L'application frontend est développée en **React 18** avec **Vite** comme bundler ultra-rapide et **Tailwind CSS** pour l'application stricte de la charte graphique :

```
frontend/
├── index.html                   # Point d'entrée HTML Vite (Google Fonts Inter, Poppins, JetBrains Mono)
├── vite.config.js               # Configuration Vite (port 3000, host: true)
├── tailwind.config.js           # Thème étendu SIGAPEI (vert #006B3C, sidebar #004D2B, or #E9AA20, crème #FFF6DD)
├── postcss.config.js            # Pipeline PostCSS / Tailwind
├── package.json                 # Dépendances (React, ReactDOM, Vite, Chart.js)
├── src/
│   ├── main.jsx                 # Point de montage React (createRoot)
│   ├── index.css                # Directives Tailwind & typographie
│   ├── App.jsx                  # Composant racine orchestrant les 3 espaces et modales
│   ├── data/
│   │   └── initialData.js       # Store de données initiales (classes, candidatures, apprenants, EDT, finances)
│   └── components/
│       ├── Header.jsx           # En-tête officiel SIGAPEI avec logo charte, tenant et sélecteur d'espace
│       ├── Sidebar.jsx          # Sidebar administration w-72 avec icônes SVG inline et pied acteurs
│       ├── admin/
│       │   ├── DashboardView.jsx    # Tableau de bord, 4 KPIs, graphique Chart.js, règles clés
│       │   ├── CandidaturesView.jsx # Instruction des candidatures avec filtres et examen S3
│       │   ├── ClassesView.jsx      # Suivi des jauges de capacité avec blocage en temps réel
│       │   ├── ApprenantsView.jsx   # Dossiers apprenants, règle compte Bénin vs FR, mutations
│       │   ├── EmploisView.jsx      # Emploi du temps géré par le Censeur
│       │   └── FinancesView.jsx     # Vue consolidée en lecture seule connectée au service Finances
│       ├── candidat/
│       │   └── CandidatSpace.jsx    # Stepper 4 étapes, suivi de dossier par UUID, réinscription
│       ├── parent/
│       │   └── ParentSpace.jsx      # Fiche élève, planning hebdo, situation financière, historique
│       ├── modals/
│       │   ├── ExamineModal.jsx     # Examen des pièces S3 MinIO et test d'admission
│       │   ├── RejectModal.jsx      # Rejet motivé obligatoire
│       │   ├── MutationModal.jsx    # Transfert de classe sans duplication avec alerte programme
│       │   └── CreateClasseModal.jsx# Création de nouvelle classe avec cycle et programme
│       └── common/
│           └── Toast.jsx            # Système de notifications flottantes réactives
```

### Lancement en Développement
```bash
cd frontend
npm install
npm run dev
# Serveur disponible sur http://localhost:3000
```

### Compilation pour la Production
```bash
npm run build
# Artefacts générés dans frontend/dist/
```
