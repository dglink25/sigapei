<?php

namespace App\Console\Commands;

use App\Support\NormalisationNom;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Importe une arborescence geographique depuis un fichier CSV de chemins complets,
 * pour combler ce qu'aucun jeu de donnees mondial ne fournit (typiquement les
 * arrondissements d'un pays) a partir d'une source officielle.
 *
 * Colonnes (la premiere ligne est l'en-tete, l'ordre n'a pas d'importance) :
 *   pays            code ISO2 du pays (ex. BJ)                           obligatoire
 *   departement     nom du departement / de la region                    obligatoire
 *   commune         nom de la commune                                    facultatif
 *   arrondissement  nom de l'arrondissement                              facultatif
 *
 * Exemple :
 *   pays,departement,commune,arrondissement
 *   BJ,Littoral,Cotonou,1er Arrondissement
 *   BJ,Littoral,Cotonou,2e Arrondissement
 *
 * Chaque noeud est RECONNU par son nom (sans tenir compte de la casse, des accents,
 * des tirets ni des prefixes "Departement de", "Commune de"...) : s'il existe deja
 * (quelle que soit sa source, GeoNames par exemple), il est reutilise ; sinon il est
 * cree. Le fichier vient donc completer l'existant sans jamais creer de doublon, et
 * peut etre relance sans risque. Les noeuds crees portent la source "manuel".
 *
 *   php artisan geo:arbre chemin/arrondissements-benin.csv
 *   php artisan geo:arbre chemin/fichier.csv --source=insae
 *   php artisan geo:arbre chemin/fichier.csv --simuler    # a lancer d'abord : n'enregistre rien
 *
 * Fichier a un autre format (export d'un tableau officiel, par exemple) : indiquez le
 * pays et le nom des colonnes, sans retoucher le fichier :
 *   php artisan geo:arbre adm3.csv --iso=BJ --col-departement=admin1Name_fr \
 *       --col-commune=admin2Name_fr --col-arrondissement=admin3Name_fr
 * (la comparaison des noms de colonnes ignore la casse)
 */
class ImporterArbreGeo extends Command
{
    protected $signature = 'geo:arbre
        {fichier : Fichier CSV (colonnes pays, departement, commune, arrondissement)}
        {--source=manuel : Nom de la source, stocke sur les lignes creees}
        {--separateur=, : Separateur de colonnes (virgule par defaut, utilisez ; si besoin)}
        {--iso= : Code ISO2 du pays quand le fichier n a pas de colonne pays (ex. BJ)}
        {--col-pays=pays : Nom de la colonne du pays}
        {--col-departement=departement : Nom de la colonne du departement}
        {--col-commune=commune : Nom de la colonne de la commune}
        {--col-arrondissement=arrondissement : Nom de la colonne de l arrondissement}
        {--renommer : Quand un lieu existe deja sous une autre orthographe, adopte celle du fichier}
        {--approximatif : Reconnait aussi les noms qui different d une ou deux lettres (ex. Pehonko / Pehunco)}
        {--simuler : Simule l import : affiche ce qui serait cree, sans rien enregistrer}';

    protected $description = 'Importe une arborescence pays / departement / commune / arrondissement depuis un CSV.';

    /** @var array<string, array<string, array{id: int, nom: string}>> noeuds deja connus : "type:parentId" => [cle de nom => [id, nom]] */
    private array $connus = [];

    private bool $renommer = false;

    private bool $approximatif = false;

    /** @var array<int, array{type: string, texte: string}> operations effectuees ou simulees, a afficher */
    private array $journal = [];

    public function handle(): int
    {
        $fichier = (string) $this->argument('fichier');
        if (! is_file($fichier)) {
            $this->error("Fichier introuvable : {$fichier}");

            return self::FAILURE;
        }

        $source = (string) $this->option('source');
        $simuler = (bool) $this->option('simuler');
        $this->renommer = (bool) $this->option('renommer');
        $this->approximatif = (bool) $this->option('approximatif');
        $separateur = (string) $this->option('separateur');
        $paysIds = DB::table('pays')->pluck('id', 'code_iso')->all();

        $poignee = fopen($fichier, 'r');
        $entetes = $poignee ? fgetcsv($poignee, 0, $separateur, '"', '\\') : false;
        if (! $entetes) {
            $this->error('Fichier vide ou illisible.');

            return self::FAILURE;
        }

        $entetes[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $entetes[0]);
        $entetes = array_map(fn ($e) => strtolower(trim((string) $e)), $entetes);

        $isoFixe = strtoupper(trim((string) $this->option('iso')));
        $colPays = strtolower(trim((string) $this->option('col-pays')));
        $colDepartement = strtolower(trim((string) $this->option('col-departement')));
        $colCommune = strtolower(trim((string) $this->option('col-commune')));
        $colArrondissement = strtolower(trim((string) $this->option('col-arrondissement')));

        $manquantes = array_diff(array_filter([$isoFixe === '' ? $colPays : null, $colDepartement]), $entetes);
        if ($manquantes) {
            $this->error('Colonne(s) manquante(s) : '.implode(', ', $manquantes).'. Colonnes trouvees : '.implode(', ', $entetes).'. Essayez --separateur=";".');
            fclose($poignee);

            return self::FAILURE;
        }

        $crees = ['departements' => 0, 'communes' => 0, 'arrondissements' => 0];
        $existants = ['departements' => 0, 'communes' => 0, 'arrondissements' => 0];
        $ignorees = 0;
        $numero = 1;

        try {
            DB::transaction(function () use ($poignee, $entetes, $separateur, $paysIds, $source, $isoFixe, $colPays, $colDepartement, $colCommune, $colArrondissement, $simuler, &$crees, &$existants, &$ignorees, &$numero) {
                while (($ligne = fgetcsv($poignee, 0, $separateur, '"', '\\')) !== false) {
                    $numero++;
                    if ($ligne === [null] || count($ligne) !== count($entetes)) {
                        $ignorees++;

                        continue;
                    }
                    $brut = array_combine($entetes, array_map(fn ($v) => trim((string) $v), $ligne));
                    $l = [
                        'pays' => $isoFixe !== '' ? $isoFixe : ($brut[$colPays] ?? ''),
                        'departement' => $brut[$colDepartement] ?? '',
                        'commune' => $brut[$colCommune] ?? '',
                        'arrondissement' => $brut[$colArrondissement] ?? '',
                    ];

                    $iso = strtoupper($l['pays']);
                    if (! isset($paysIds[$iso])) {
                        throw new RuntimeException("ligne {$numero} : pays '{$l['pays']}' inconnu (code ISO2 attendu, ex. BJ).");
                    }
                    if ($l['departement'] === '') {
                        $ignorees++;

                        continue;
                    }

                    [$departementId, $nouveau] = $this->noeud('departements', 'pays_id', $paysIds[$iso], $l['departement'], $source, "{$iso}|{$l['departement']}");
                    $nouveau ? $crees['departements']++ : $existants['departements']++;

                    if (($l['commune'] ?? '') === '') {
                        continue;
                    }
                    [$communeId, $nouveau] = $this->noeud('communes', 'departement_id', $departementId, $l['commune'], $source, "{$iso}|{$l['departement']}|{$l['commune']}");
                    $nouveau ? $crees['communes']++ : $existants['communes']++;

                    if (($l['arrondissement'] ?? '') === '') {
                        continue;
                    }
                    [, $nouveau] = $this->noeud('arrondissements', 'commune_id', $communeId, $l['arrondissement'], $source, "{$iso}|{$l['departement']}|{$l['commune']}|{$l['arrondissement']}");
                    $nouveau ? $crees['arrondissements']++ : $existants['arrondissements']++;
                }

                // Simulation : on annule la transaction (rien n'est enregistre), le bilan s'affiche quand meme.
                if ($simuler) {
                    throw new SimulationTerminee();
                }
            });
        } catch (SimulationTerminee) {
            // Transaction annulee volontairement : le bilan est affiche plus bas.
        } catch (RuntimeException $e) {
            $this->error('Import annule (aucune ligne enregistree) : '.$e->getMessage());

            return self::FAILURE;
        } finally {
            fclose($poignee);
        }

        if (! $simuler) {
            try {
                Cache::increment('geo:version');
            } catch (\Throwable) {
                $this->warn('Cache indisponible : les listes se rafraichiront a expiration du TTL.');
            }
        }

        if ($simuler) {
            $this->warn('SIMULATION : rien n\'a ete enregistre. Si le nombre d\'arrondissements crees depasse largement ce que vous attendez, les noms du fichier different de ceux deja en base et creeraient des doublons.');
        }

        $this->table([$simuler ? 'Simulation' : '', 'Crees', 'Deja presents'], [
            ['Departements', $crees['departements'], $existants['departements']],
            ['Communes', $crees['communes'], $existants['communes']],
            ['Arrondissements', $crees['arrondissements'], $existants['arrondissements']],
        ]);
        $this->afficherJournal($simuler);

        if ($ignorees) {
            $this->warn("{$ignorees} ligne(s) ignoree(s) (vides, mal formees ou sans departement).");
        }
        $this->info('Termine.');

        return self::SUCCESS;
    }

    /**
     * Retourne [id, cree] du noeud nomme $nom sous le parent donne. L'existant est reutilise
     * (reconnaissance par nom normalise, puis, avec --approximatif, par proximite d'orthographe) ;
     * avec --renommer, il adopte l'orthographe du fichier. Sinon le noeud est cree.
     *
     * @return array{0: int, 1: bool}
     */
    private function noeud(string $table, string $colonneParent, int $parentId, string $nom, string $source, string $chemin): array
    {
        $cle = "{$table}:{$parentId}";

        if (! isset($this->connus[$cle])) {
            $this->connus[$cle] = [];
            // Quand deux lignes soeurs portent le meme nom (doublon : donnee de test, ancien import...),
            // celle de GeoNames est retenue en priorite : c'est elle qui porte les sous-niveaux.
            $existants = DB::table($table)
                ->where($colonneParent, $parentId)
                ->orderByRaw("CASE WHEN source = 'geonames' THEN 0 ELSE 1 END")
                ->orderBy('id')
                ->get(['id', 'nom']);

            foreach ($existants as $existant) {
                $this->connus[$cle][NormalisationNom::cle($existant->nom)] ??= ['id' => (int) $existant->id, 'nom' => $existant->nom];
            }
        }

        $nomPropre = mb_substr(NormalisationNom::nettoyer($nom), 0, 128);
        $nomCle = NormalisationNom::cle($nom);

        $trouve = $this->connus[$cle][$nomCle] ?? null;
        if ($trouve === null && $this->approximatif) {
            $trouve = $this->plusProche($this->connus[$cle], $nomCle);
        }

        if ($trouve !== null) {
            if ($this->renommer && $trouve['nom'] !== $nomPropre) {
                DB::table($table)->where('id', $trouve['id'])->update(['nom' => $nomPropre, 'updated_at' => now()]);
                $this->journal[] = ['type' => 'renomme', 'texte' => "{$trouve['nom']}  ->  {$nomPropre}   ({$chemin})"];
                $this->connus[$cle][$nomCle] = ['id' => $trouve['id'], 'nom' => $nomPropre];
            }

            return [$trouve['id'], false];
        }

        $id = (int) DB::table($table)->insertGetId([
            $colonneParent => $parentId,
            'nom' => $nomPropre,
            'source' => $source,
            'code_externe' => substr(sha1($chemin), 0, 40),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->connus[$cle][$nomCle] = ['id' => $id, 'nom' => $nomPropre];
        $this->journal[] = ['type' => 'cree', 'texte' => $chemin];

        return [$id, true];
    }

    /**
     * Frere le plus proche par l'orthographe (distance de Levenshtein sur les cles de nom), a
     * condition qu'il soit unique et tres proche : 1 lettre d'ecart pour un nom de 5 a 7 lettres,
     * 2 a partir de 8, aucune en dessous (trop risque).
     *
     * @param  array<string, array{id: int, nom: string}>  $freres
     * @return array{id: int, nom: string}|null
     */
    private function plusProche(array $freres, string $cle): ?array
    {
        $meilleur = null;
        $distanceMin = PHP_INT_MAX;
        $egalite = false;

        foreach ($freres as $cleFrere => $frere) {
            $distance = levenshtein($cle, (string) $cleFrere);
            if ($distance < $distanceMin) {
                $distanceMin = $distance;
                $meilleur = $frere;
                $egalite = false;
            } elseif ($distance === $distanceMin) {
                $egalite = true;
            }
        }

        $longueur = strlen($cle);
        $seuil = $longueur >= 8 ? 2 : ($longueur >= 5 ? 1 : 0);

        return ($meilleur !== null && ! $egalite && $distanceMin <= $seuil) ? $meilleur : null;
    }

    /** Affiche le detail des noeuds crees et renommes (tout en simulation, 150 lignes au plus sinon). */
    private function afficherJournal(bool $simuler): void
    {
        $renommes = array_values(array_filter($this->journal, fn ($e) => $e['type'] === 'renomme'));
        $crees = array_values(array_filter($this->journal, fn ($e) => $e['type'] === 'cree'));
        $limite = $simuler ? 300 : 150;

        foreach ([['renomme', 'Noms mis a jour', $renommes], ['cree', $simuler ? 'Noeuds qui seraient crees' : 'Noeuds crees', $crees]] as [, $titre, $lignes]) {
            if (! $lignes) {
                continue;
            }
            $this->newLine();
            $this->line(sprintf('%s (%d) :', $titre, count($lignes)));
            foreach (array_slice($lignes, 0, $limite) as $ligne) {
                $this->line('  '.$ligne['texte']);
            }
            if (count($lignes) > $limite) {
                $this->line(sprintf('  ... et %d autres', count($lignes) - $limite));
            }
        }
    }
}

/** Interrompt volontairement la transaction d'une simulation (voir --simuler). */
class SimulationTerminee extends RuntimeException
{
}
