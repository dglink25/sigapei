# Référentiel géographique mondial et code établissement

## Ce qui est livré

| Niveau | Données | Comment |
|---|---|---|
| Pays | Tous les pays et territoires habités du monde (code ISO2/ISO3, nom français, indicatif, continent, libellés des niveaux) | `PaysMondeSeeder` |
| Départements / régions | Bénin : 12 départements. Autres pays : import | `BeninGeoSeeder`, `geo:importer` |
| Communes / villes | Bénin : 77 communes. Autres pays : import | `BeninGeoSeeder`, `geo:importer` |
| Arrondissements / quartiers | Facultatifs, à charger pays par pays depuis une source officielle | voir plus bas |

Les départements et communes du monde entier ne sont **pas** inclus dans le dépôt (ce sont des centaines de milliers de lignes) : ils s'importent depuis un jeu de données public avec `php artisan geo:importer`.

## Mise en route sur une base déjà migrée

```bash
# 1. Migrations additives (n'altèrent aucune migration déjà exécutée)
php artisan migrate

# 2. Pays du monde + départements et communes du Bénin
php artisan db:seed

# 3. (Facultatif) départements et communes du monde entier
php artisan geo:importer chemin/vers/dossier
```

`php artisan db:seed` est rejouable sans risque (upsert). Les 54 pays africains déjà en base sont mis à jour, jamais dupliqués.

## Importer le monde entier

1. Télécharger les fichiers **`states.csv`** et **`cities.csv`** du dépôt libre
   <https://github.com/dr5hn/countries-states-cities-database> (dossier `csv/`, licence ODbL : citer la source) et les placer dans un même dossier.
2. Lancer :

```bash
php artisan geo:importer chemin/vers/dossier                 # tous les pays (sauf le Bénin)
php artisan geo:importer chemin/vers/dossier --pays=FR,SN,CI # seulement ces pays
php artisan geo:importer chemin/vers/dossier --sauf=BJ,TG    # tous sauf ces pays
```

- La commande lit les fichiers en flux : la mémoire reste constante, même sur ~150 000 villes.
- Elle est **idempotente** : chaque ligne est identifiée par `(source, code_externe)`, on peut la relancer pour mettre à jour sans doublon.
- Le Bénin est ignoré par défaut (`--sauf=BJ`) : il est chargé par `BeninGeoSeeder`, pour éviter tout doublon.
- Colonnes lues : `states.csv` → `id, name, country_code` ; `cities.csv` → `id, name, state_id, country_code`. Un autre jeu de données convient s'il fournit les mêmes colonnes. Si une colonne manque, la commande s'arrête avec un message qui liste les colonnes trouvées.
- À la fin, le cache géographique est invalidé automatiquement (numéro de version `geo:version`).

## Arrondissements

Aucun jeu de données mondial ne les fournit de façon fiable. Ils sont **facultatifs** : l'arrondissement n'est exigé que si la commune choisie en possède dans le référentiel. À charger pays par pays depuis une source officielle, dans la table `arrondissements` (`commune_id`, `nom`, `source`, `code_externe`).

## Libellés des niveaux

Chaque pays porte `libelle_niveau_1/2/3` (ex. « Département / Commune / Arrondissement » pour le Bénin, « État / Ville / Quartier » pour les États-Unis). Le front doit afficher ces libellés comme étiquettes des trois listes en cascade. Valeur par défaut pour les autres pays : « Département / Région », « Commune / Ville », « Arrondissement / Quartier ». À ajuster pays par pays dans `PaysMondeSeeder::LIBELLES_SPECIFIQUES`.

## Listes très peuplées

Les listes de départements, communes et arrondissements acceptent `?q=<texte>` (recherche par nom) et `?limite=<n>` (50 par défaut, 200 au maximum). Sans `q`, la liste complète est retournée et mise en cache ; avec `q`, la réponse n'est pas mise en cache. Pour un pays très peuplé, le front doit utiliser une liste avec recherche (autocomplétion) plutôt qu'une liste déroulante complète.

## Code établissement (XXXX)

- 4 caractères : lettres majuscules et chiffres, **sans** `I`, `L`, `O`, `0`, `1` (ambigus à la lecture ou à la dictée). 31 symboles, soit 923 521 codes possibles.
- Unique : vérifié avant écriture **et** garanti par un index unique + une contrainte de format en base.
- Généré à la validation de la demande, avec le slug et le matricule. Les établissements existants reçoivent un code automatiquement via la migration.
- Distinct du `slug` (URL) et du `matricule` (identifiant de connexion du dirigeant, jamais exposé publiquement).
- Route publique, sans authentification : `GET /v1/etablissements/code/{code}` (insensible à la casse).

Pour changer le format (longueur, alphabet) : `CodeEtablissementService` (constantes `ALPHABET` et `LONGUEUR`), puis une **nouvelle** migration qui adapte la contrainte `etablissements_code_format` et la longueur de la colonne.
