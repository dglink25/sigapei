# SIGAPEI

Système d'Information de Gestion Administrative et Pédagogique des Écoles et Institutions.

## Organisation des branches

| Branche | Rôle | Qui peut y écrire |
|---|---|---|
| `main` | Code validé et stable | **Le chef de projet uniquement** |
| `develop` | Intégration : reçoit le travail de tous les développeurs | Fusion automatique (personne ne pousse dessus directement) |
| `feature/prenom` | **Une seule branche par développeur**, pour toute la durée du projet | Son propriétaire |

```
feature/marie ──┐
feature/paul  ──┼──► develop (fusion automatique) ──► test par le chef ──► main
feature/jean  ──┘
```

## Règles

1. **Une seule branche par développeur** : `feature/prenom` (par exemple `feature/marie`). On ne crée jamais de branche par tâche ou par fonctionnalité.
2. **Personne ne pousse sur `main`** à part le chef de projet.
3. **Personne ne pousse directement sur `develop`** : la fusion se fait toute seule après un push sur sa branche.
4. Chaque développeur récupère ses mises à jour **uniquement depuis `main`**.
5. Les branches `feature/prenom` ne sont **jamais supprimées**.

## Pour les développeurs

### Première fois seulement : créer sa branche

```bash
git clone https://github.com/dglink25/sigapei.git
cd sigapei
git checkout -b feature/prenom origin/main
git push -u origin feature/prenom
```

Remplacez `prenom` par votre prénom, en minuscules et sans accent.

### Chaque jour

```bash
git checkout feature/prenom
git pull origin main          # récupérer ce que le chef a validé
# ... travail, puis commits ...
git add .
git commit -m "description claire du changement"
git push                      # la fusion vers develop est automatique
```

Après le push, une demande de fusion vers `develop` est créée et fusionnée automatiquement (onglet **Actes** pour suivre l'exécution).

### En cas de conflit

Si le workflow échoue à cause d'un conflit avec le travail d'un collègue :

```bash
git checkout feature/prenom
git fetch origin
git merge origin/develop
# résoudre les conflits dans les fichiers, puis :
git add .
git commit
git push
```

C'est le seul cas où l'on récupère `develop`.

### Ce qu'il ne faut pas faire

- `git push origin main` : refusé.
- `git push origin develop` : refusé.
- `git push --force` : interdit sur `main` et `develop`.
- Créer une autre branche que `feature/prenom`.

## Pour le chef de projet

### Tester `develop`

```bash
git fetch origin
git checkout develop
git pull origin develop
# ... tests ...
```

### Publier sur `main` (si tout est bon)

```bash
git checkout main
git pull origin main
git merge --ff-only origin/develop
git push origin main
```

### Corriger un problème

Ne jamais corriger sur `develop`. Corriger sur sa propre branche :

```bash
git checkout feature/don-diegue
git merge origin/develop
# ... corrections ...
git push                      # fusion automatique vers develop, puis retest
```

## Configuration GitHub (référence)

- **Règle sur `main`** : demande de fusion obligatoire, mises à jour et suppressions restreintes, push forcé bloqué. Contournement réservé au rôle *Administrateur du dépôt*.
- **Règle sur `develop`** : demande de fusion obligatoire, 0 approbation requise, push forcé et suppression bloqués.
- **Dépôt** : *Allow merge commits* et *Allow auto-merge* activés, *Automatically delete head branches* **désactivé**.
- **Actions** : *Allow GitHub Actions to create and approve pull requests* activé.
- **Collaborateurs** : rôle **Write** pour les développeurs (jamais Admin ni Maintain).
- **Workflow** : `.github/workflows/auto-pr.yml` crée la demande de fusion vers `develop` et la fusionne à chaque push sur `feature/**`.
