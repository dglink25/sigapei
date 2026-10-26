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
php artisan geo:geonames --manquants     # reprendre seulement les pays encore sans département (après une interruption)
```

Compter plusieurs centaines de Mo à télécharger et du temps pour tous les pays : la commande traite les pays un par un, continue si l'un échoue, et affiche un tableau récapitulatif. Elle est **idempotente** (clé `source` + `geonameid`) : on peut la relancer, y compris sur les seuls pays en échec.

Les fichiers téléchargés restent dans `storage/app/geonames` : pour relancer l'import **sans retélécharger**, ajouter `--sans-telechargement`.

Options utiles :

| Option | Effet |
|---|---|
| `--sans-telechargement` | utilise les fichiers déjà présents dans `storage/app/geonames` |
| `--dossier=chemin` | autre dossier de téléchargement |
| `--nettoyer` (alias `--remplacer`) | supprime ensuite les lignes d'autres sources non utilisées (voir ci-dessous) |
| `--manquants` | ne traite que les pays qui n'ont encore aucun département |
| `--avec-promotion` | importe au niveau 2 les ADM3 sans ADM2 parent (déconseillé) |
| `--noms-bruts` | garde les noms tels que fournis (sinon « Département de l'Atlantique » devient « Atlantique ») |

Sans l'extension PHP `zip`, la commande utilise la commande système `unzip` ; si aucune n'est disponible, installer `php-zip` (ou `unzip`).

### Orthographe des noms

GeoNames fournit souvent des noms **en anglais et sans accents** (« Commune of Ouidah », « Atakora Department », « Kerou », « Kpomasse »). L'import retire le décor administratif français et anglais (« Commune de », « Commune of », « Department »...) mais ne peut pas rétablir les accents ni l'orthographe officielle.

Deux garanties :

- **Un nom corrigé n'est jamais écrasé.** Un nouvel import GeoNames ne remplace un nom que s'il est encore tel que GeoNames l'a fourni. Un nom modifié à la main ou par `geo:arbre --renommer` survit à tous les imports suivants.
- **Les variantes sont reconnues.** La comparaison ignore la casse, les accents, les tirets et les préfixes, et traite `k` et `c` comme équivalents (« Atakora » = « Atacora », « Kouffo » = « Couffo »). Avec `--approximatif`, un écart d'une ou deux lettres est aussi toléré (« Pehonko » / « Péhunco »), de même qu'un nom contenu dans l'autre quand la correspondance est unique (« Dogbo » / « Dogbo Tota »).

### Données déjà présentes (test, import précédent) : fusion, pas de suppression

Si des subdivisions d'une autre source existent déjà pour un pays (données de test, `BeninGeoSeeder`, import précédent), la commande les **reconnaît par leur nom** (insensible à la casse, aux accents, aux tirets et aux préfixes « Département de », « Commune de »...) et les **rattache** aux données GeoNames. Leur identifiant interne ne change pas : les demandes et établissements qui les utilisent restent valides. Rien n'est supprimé.

Le récapitulatif indique pour chaque pays combien de lignes ont été rattachées, et marque d'une `*` les pays qui conservent des lignes d'autres sources (utilisées, ou dont le nom n'a pas été reconnu : par exemple une ligne de test).

Pour supprimer ensuite celles qui ne servent plus à rien :

```bash
php artisan geo:geonames BJ --nettoyer
```

`--nettoyer` supprime les subdivisions **obsolètes** du pays : celles d'autres sources non rapprochées, et celles de GeoNames que l'import courant n'a pas touchées (par exemple des lignes « promues » que vous ne voulez plus avec `--sans-promotion`). Il ne supprime **jamais** une subdivision utilisée par une demande ou un établissement, ni un niveau qui a encore des sous-niveaux. `php artisan geo:vider BJ` supprime à la main toutes les subdivisions d'un pays (mêmes protections : rien n'est supprimé si l'une est utilisée).

> **Requêtes SQL dans la console Neon (ou via un pooler)** : chaque instruction peut s'exécuter sur une connexion différente, donc `SET search_path` est oublié d'une instruction à l'autre et `BEGIN ... COMMIT` n'enveloppe rien. Les requêtes de ce document écrivent donc le schéma explicitement (`etablissements.communes`) et tiennent **en une seule instruction** ; exécutez-les une par une.

Pour voir ce qui reste d'autres sources après un import :

```sql
SELECT 'departement' AS niveau, d.nom, d.source
FROM etablissements.departements d JOIN etablissements.pays p ON p.id = d.pays_id
WHERE p.code_iso = 'BJ' AND (d.source IS NULL OR d.source <> 'geonames')
UNION ALL
SELECT 'commune', c.nom, c.source
FROM etablissements.communes c
JOIN etablissements.departements d ON d.id = c.departement_id
JOIN etablissements.pays p ON p.id = d.pays_id
WHERE p.code_iso = 'BJ' AND (c.source IS NULL OR c.source <> 'geonames')
UNION ALL
SELECT 'arrondissement', a.nom, a.source
FROM etablissements.arrondissements a
JOIN etablissements.communes c ON c.id = a.commune_id
JOIN etablissements.departements d ON d.id = c.departement_id
JOIN etablissements.pays p ON p.id = d.pays_id
WHERE p.code_iso = 'BJ' AND (a.source IS NULL OR a.source <> 'geonames');
```

### Données de test qui bloquent le nettoyage

Une ligne conservée après `--nettoyer` est **utilisée** par une demande ou un établissement (souvent des données de test créées avant l'import). Pour voir lesquels :

```sql
WITH autres_dep AS (SELECT id FROM etablissements.departements WHERE source IS NULL OR source <> 'geonames'),
     autres_com AS (SELECT id FROM etablissements.communes WHERE source IS NULL OR source <> 'geonames'),
     autres_arr AS (SELECT id FROM etablissements.arrondissements WHERE source IS NULL OR source <> 'geonames')
SELECT 'demande' AS type, uuid, statut::text AS statut, created_at
FROM etablissements.demandes_etablissement
WHERE departement_id IN (SELECT id FROM autres_dep)
   OR commune_id IN (SELECT id FROM autres_com)
   OR arrondissement_id IN (SELECT id FROM autres_arr)
UNION ALL
SELECT 'etablissement', uuid, statut::text, created_at
FROM etablissements.etablissements
WHERE departement_id IN (SELECT id FROM autres_dep)
   OR commune_id IN (SELECT id FROM autres_com)
   OR arrondissement_id IN (SELECT id FROM autres_arr);
```

**Si ce sont uniquement des données de test**, cette instruction les supprime (avec leurs documents, cycles et abonnements) de façon atomique : tout ou rien. Ne la lancez jamais si l'une des lignes affichées est une vraie demande ; elle affiche le nombre de lignes supprimées :

```sql
WITH autres_dep AS (SELECT id FROM etablissements.departements WHERE source IS NULL OR source <> 'geonames'),
     autres_com AS (SELECT id FROM etablissements.communes WHERE source IS NULL OR source <> 'geonames'),
     autres_arr AS (SELECT id FROM etablissements.arrondissements WHERE source IS NULL OR source <> 'geonames'),
     etabs AS (
        SELECT id FROM etablissements.etablissements
        WHERE departement_id IN (SELECT id FROM autres_dep)
           OR commune_id IN (SELECT id FROM autres_com)
           OR arrondissement_id IN (SELECT id FROM autres_arr)),
     suppr_demandes AS (
        DELETE FROM etablissements.demandes_etablissement
        WHERE departement_id IN (SELECT id FROM autres_dep)
           OR commune_id IN (SELECT id FROM autres_com)
           OR arrondissement_id IN (SELECT id FROM autres_arr)
           OR etablissement_id IN (SELECT id FROM etabs)
        RETURNING id),
     suppr_etabs AS (
        DELETE FROM etablissements.etablissements WHERE id IN (SELECT id FROM etabs)
        RETURNING id)
SELECT (SELECT count(*) FROM suppr_demandes) AS demandes_supprimees,
       (SELECT count(*) FROM suppr_etabs) AS etablissements_supprimes;
```

Relancer ensuite `php artisan geo:geonames BJ --sans-telechargement --nettoyer` : les lignes devenues inutilisées sont supprimées.

### Lignes sans parent (orphelins)

Dans certains pays, GeoNames publie des ADM3 dont l'ADM2 parent est introuvable, le plus souvent parce que leur code admin2 n'est pas renseigné (Indonésie, Libéria, Nigeria, Maroc, RD Congo, Éthiopie...). Ces lignes sont **ignorées** et comptées dans le récapitulatif (« N sans parent ignorés »), faute de pouvoir les rattacher sans deviner.

`--avec-promotion` les importe au niveau 2 sous leur ADM1 : **déconseillé**, car le niveau 2 mélange alors deux profondeurs (des milliers de sous-districts rangés parmi les districts). Pour ces pays, une source officielle passée à `geo:arbre` est préférable.

### Recette pour un pays dont la structure officielle est connue (exemple : le Bénin)

```bash
# 1. GeoNames, puis suppression des doublons (lignes d'autres sources que plus rien n'utilise).
#    Les noms sont nettoyés au passage ("Commune of Ouidah" devient "Ouidah").
php artisan geo:geonames BJ --sans-telechargement --nettoyer

# 2. Orthographe officielle des 12 départements et 77 communes (fichier fourni : docs/donnees/benin-departements-communes.csv)
php artisan geo:arbre docs/donnees/benin-departements-communes.csv --renommer --approximatif --simuler
#    Vérifier le détail affiché : des noms mis à jour, et AUCUN nœud créé (les 77 communes existent déjà).
#    Si le bilan est conforme, relancer sans --simuler.

# 3. Compléter les arrondissements avec le fichier officiel (546 au total, 530 présents via GeoNames)
php artisan geo:arbre arrondissements-benin.csv --iso=BJ --col-departement=... --col-commune=... --col-arrondissement=... --renommer --approximatif --simuler
```

Le fichier `benin-departements-communes.csv` a été établi à la main à partir de la liste des communes du Bénin : **à vérifier contre une source officielle** avant de s'y fier, comme tout fichier fourni.

Si la simulation indique des nœuds **créés** alors que vous attendiez des noms **mis à jour**, c'est que deux orthographes n'ont pas été rapprochées : ne lancez pas l'import réel, corrigez le fichier ou le nom en base d'abord.

## Vérifier la complétude

```bash
php artisan geo:statistiques                      # tous les pays
php artisan geo:statistiques --pays=BJ            # un pays
php artisan geo:statistiques --incomplets         # pays sans aucun département
php artisan geo:statistiques --sans-communes      # pays avec départements mais sans commune
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
- **Autre format de fichier** (export d'un tableau officiel) : indiquez le pays et le nom des colonnes au lieu de retoucher le fichier :
  `php artisan geo:arbre adm3.csv --iso=BJ --col-departement=admin1Name_fr --col-commune=admin2Name_fr --col-arrondissement=admin3Name_fr`
  (casse des noms de colonnes ignorée). Un fichier Excel doit d'abord être enregistré en CSV.
- Chaque nœud est **reconnu par son nom** (insensible à la casse, aux accents, aux tirets et aux préfixes « Département de », « Commune de »...) : s'il existe déjà, il est réutilisé ; sinon il est créé. Le fichier complète donc l'existant **sans doublon**, et peut être relancé sans risque.
- Tout est enregistré dans **une seule transaction** : si une ligne est invalide (pays inconnu...), rien n'est enregistré.
- **Orthographe officielle** : `--renommer` fait adopter l'orthographe du fichier aux lieux déjà présents (qui sont reconnus, jamais dupliqués) ; `--approximatif` reconnaît aussi un écart d'une ou deux lettres. Le détail des noms mis à jour et des nœuds créés est affiché.
- **Simulation** : `--simuler` affiche ce qui serait créé ou reconnu, sans rien enregistrer. À lancer **d'abord** : si le nombre d'arrondissements « créés » dépasse largement ce que vous attendez, les orthographes du fichier diffèrent de celles de la base et créeraient des doublons.
- Nœuds créés : source `manuel` (ou celle donnée par `--source`).
- Attention à l'orthographe : deux écritures très différentes d'une même commune sont considérées comme deux communes distinctes.

## Pourquoi il manque des arrondissements, et que faire

Le 3e niveau est rare dans les données mondiales : beaucoup de pays n'ont tout simplement pas de 3e niveau administratif, ou GeoNames ne le publie pas. Les niveaux 1 et 2 sont en revanche bien couverts. Pour un pays où le 3e niveau existe réellement mais manque (le Bénin, par exemple), la seule voie fiable est un **fichier officiel** passé à `geo:arbre`.

Pistes de sources à examiner (à vérifier : formats et licences évoluent, je ne peux pas les contrôler depuis l'environnement où ce code a été écrit) :

- les jeux de données de limites administratives de l'**OCHA / Humanitarian Data Exchange** (data.humdata.org, « COD-AB »), qui publient souvent les niveaux 1 à 3 avec les noms des parents, pour beaucoup de pays ;
- l'**institut national de la statistique** ou le ministère chargé de la décentralisation du pays ;
- un export **OpenStreetMap** (licence ODbL) pour le pays.

Attention aux licences : certaines bases de limites administratives très répandues (par exemple GADM) sont réservées à un usage non commercial et ne conviennent pas à une plateforme payante sans autorisation.

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
