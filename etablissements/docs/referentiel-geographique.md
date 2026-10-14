# Référentiel géographique mondial et code établissement

## Principe

Le référentiel a **4 niveaux**, identiques pour tous les pays :

| Niveau | Table | Source des données |
|---|---|---|
| Pays | `pays` | `PaysMondeSeeder` : tous les pays et territoires habités du monde |
| 1 - départements / régions / États / provinces | `departements` | GeoNames `ADM1` |
| 2 - communes / comtés / districts | `communes` | GeoNames `ADM2` |
| 3 - arrondissements | `arrondissements` | GeoNames `ADM3`, ou un fichier CSV officiel |

Les niveaux suivent la **profondeur administrative**, pas le nom : selon le pays, le niveau 1 s'appelle région, État ou département. Chaque pays porte donc `libelle_niveau_1/2/3`, que le front affiche comme étiquette des trois listes en cascade.

**Ce dépôt ne contient pas les données des subdivisions** (ce sont des centaines de milliers de lignes, qui changent). Elles se téléchargent depuis GeoNames avec une seule commande, à lancer depuis une machine connectée à internet.

## Ce qui est garanti, et ce qui ne l'est pas

- **Garanti** : la structure, l'import reproductible, et la commande `geo:statistiques` qui dit pays par pays ce qui est présent.
- **Non garanti** : que GeoNames contienne les 3 niveaux pour **tous** les pays. La profondeur dépend des données publiées. Aucun jeu de données ouvert ne fournit une hiérarchie complète à 3 niveaux pour la planète entière.
- **Niveaux au-delà du 3e** (ex. les communes françaises, qui sont `ADM4` dans GeoNames) : non importés.
- Les trous se comblent avec `geo:arbre` et un fichier officiel.

Les listes se valident en conséquence : le **pays** est toujours obligatoire, puis chaque niveau l'est **tant que le référentiel en propose** pour le niveau choisi. Un pays sans subdivision connue n'exige que le pays ; une commune sans arrondissement connu n'exige pas d'arrondissement.

## Mise en route

```bash
php artisan migrate
php artisan db:seed                      # pays du monde (rejouable)
php artisan geo:geonames BJ              # départements, communes et arrondissements du Bénin
php artisan geo:statistiques --pays=BJ   # vérifier le résultat
```

### Tous les pays

```bash
php artisan geo:geonames                 # tous les pays en base
php artisan geo:geonames BJ FR SN CI     # ou une sélection
```

Compter plusieurs centaines de Mo à télécharger et du temps pour tous les pays : la commande traite les pays un par un, continue si l'un échoue, et affiche un tableau récapitulatif. Elle est **idempotente** (clé `source` + `geonameid`) : on peut la relancer, y compris sur les seuls pays en échec.

Options utiles :

| Option | Effet |
|---|---|
| `--sans-telechargement` | utilise les fichiers déjà présents dans `storage/app/geonames` |
| `--dossier=chemin` | autre dossier de téléchargement |
| `--remplacer` | remplace les subdivisions déjà présentes d'une **autre** source (voir ci-dessous) |
| `--noms-bruts` | garde les noms tels que fournis (sinon « Département de l'Atlantique » devient « Atlantique ») |

Sans l'extension PHP `zip`, la commande utilise la commande système `unzip` ; si aucune n'est disponible, installer `php-zip` (ou `unzip`).

### Pays déjà chargé depuis une autre source

On ne mélange jamais deux sources pour un même pays. Si un pays contient déjà des subdivisions d'une autre source (par exemple les 12 départements et 77 communes du Bénin chargés auparavant par `BeninGeoSeeder`), la commande l'ignore et l'indique. Pour les remplacer :

```bash
php artisan geo:geonames BJ --remplacer
```

Les clés étrangères protègent : si une demande ou un établissement utilise déjà une de ces subdivisions, **rien n'est supprimé** et le pays est signalé en erreur. `php artisan geo:vider BJ` supprime à la main les subdivisions d'un pays (mêmes protections).

## Vérifier la complétude

```bash
php artisan geo:statistiques                      # tous les pays
php artisan geo:statistiques --pays=BJ            # un pays
php artisan geo:statistiques --incomplets         # pays sans aucun département
php artisan geo:statistiques --sans-arrondissements   # pays avec communes mais sans arrondissement
```

Pour le Bénin, le découpage officiel compte 12 départements, 77 communes et 546 arrondissements : comparez avec le résultat.

## Combler un trou avec un fichier officiel : `geo:arbre`

Si GeoNames n'a pas tous les arrondissements d'un pays (cas à vérifier avec `geo:statistiques`), importez un fichier de la source officielle (par exemple l'institut national de la statistique, le ministère chargé de la décentralisation, ou un export OpenStreetMap). Format CSV, une ligne par chemin complet :

```csv
pays,departement,commune,arrondissement
BJ,Littoral,Cotonou,1er Arrondissement
BJ,Littoral,Cotonou,2e Arrondissement
```

```bash
php artisan geo:arbre chemin/arrondissements-benin.csv
php artisan geo:arbre chemin/fichier.csv --separateur=";"
php artisan geo:arbre chemin/fichier.csv --source=insae
```

- `pays` est le code ISO2 ; `commune` et `arrondissement` sont facultatifs.
- Chaque nœud est **reconnu par son nom** (insensible à la casse, aux accents, aux tirets et aux préfixes « Département de », « Commune de »...) : s'il existe déjà, il est réutilisé ; sinon il est créé. Le fichier complète donc l'existant **sans doublon**, et peut être relancé sans risque.
- Tout est enregistré dans **une seule transaction** : si une ligne est invalide (pays inconnu...), rien n'est enregistré.
- Nœuds créés : source `manuel` (ou celle donnée par `--source`).
- Attention à l'orthographe : deux écritures très différentes d'une même commune sont considérées comme deux communes distinctes.

## Autre jeu de données : `geo:importer`

`php artisan geo:importer dossier` importe deux niveaux (départements et villes) depuis `states.csv` et `cities.csv` du dépôt libre `dr5hn/countries-states-cities-database` (licence ODbL). **GeoNames (`geo:geonames`) est recommandé** car il fournit aussi le 3e niveau ; ne pas mélanger les deux sources pour un même pays.

## Licences et attribution

- GeoNames : CC BY 4.0 - citer « GeoNames (geonames.org) » dans l'application.
- dr5hn : ODbL - citer la source.

## Listes très peuplées

Les listes de départements, communes et arrondissements acceptent `?q=<texte>` (recherche par nom) et `?limite=<n>` (50 par défaut, 200 au maximum). Sans `q`, la liste complète est retournée et mise en cache ; avec `q`, la réponse n'est pas mise en cache. Pour un niveau très peuplé, le front doit proposer une liste avec autocomplétion plutôt qu'une liste déroulante complète.

## Code établissement (XXXX)

- 4 caractères : lettres majuscules et chiffres, **sans** `I`, `L`, `O`, `0`, `1`. 31 symboles, soit 923 521 codes possibles.
- Unique : vérifié avant écriture **et** garanti par un index unique et une contrainte de format en base.
- Généré à la validation de la demande, avec le slug et le matricule.
- Distinct du `slug` (URL) et du `matricule` (identifiant de connexion du dirigeant, jamais exposé publiquement).
- Route publique sans authentification : `GET /v1/etablissements/code/{code}` (insensible à la casse).
