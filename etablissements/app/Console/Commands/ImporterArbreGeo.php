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
 */
class ImporterArbreGeo extends Command
{
    protected $signature = 'geo:arbre
        {fichier : Fichier CSV (colonnes pays, departement, commune, arrondissement)}
        {--source=manuel : Nom de la source, stocke sur les lignes creees}
        {--separateur=, : Separateur de colonnes (virgule par defaut, utilisez ; si besoin)}';

    protected $description = 'Importe une arborescence pays / departement / commune / arrondissement depuis un CSV.';

    /** @var array<string, array<string, int>> noeuds deja connus : "type:parentId" => [cle de nom => id] */
    private array $connus = [];

    public function handle(): int
    {
        $fichier = (string) $this->argument('fichier');
        if (! is_file($fichier)) {
            $this->error("Fichier introuvable : {$fichier}");

            return self::FAILURE;
        }

        $source = (string) $this->option('source');
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

        $manquantes = array_diff(['pays', 'departement'], $entetes);
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
            DB::transaction(function () use ($poignee, $entetes, $separateur, $paysIds, $source, &$crees, &$existants, &$ignorees, &$numero) {
                while (($ligne = fgetcsv($poignee, 0, $separateur, '"', '\\')) !== false) {
                    $numero++;
                    if ($ligne === [null] || count($ligne) !== count($entetes)) {
                        $ignorees++;

                        continue;
                    }
                    $l = array_combine($entetes, array_map(fn ($v) => trim((string) $v), $ligne));

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
            });
        } catch (RuntimeException $e) {
            $this->error('Import annule (aucune ligne enregistree) : '.$e->getMessage());

            return self::FAILURE;
        } finally {
            fclose($poignee);
        }

        try {
            Cache::increment('geo:version');
        } catch (\Throwable) {
            $this->warn('Cache indisponible : les listes se rafraichiront a expiration du TTL.');
        }

        $this->table(['', 'Crees', 'Deja presents'], [
            ['Departements', $crees['departements'], $existants['departements']],
            ['Communes', $crees['communes'], $existants['communes']],
            ['Arrondissements', $crees['arrondissements'], $existants['arrondissements']],
        ]);
        if ($ignorees) {
            $this->warn("{$ignorees} ligne(s) ignoree(s) (vides, mal formees ou sans departement).");
        }
        $this->info('Termine.');

        return self::SUCCESS;
    }

    /**
     * Retourne [id, cree] du noeud nomme $nom sous le parent donne : l'existant est
     * reutilise (reconnaissance par nom normalise), sinon le noeud est cree.
     *
     * @return array{0: int, 1: bool}
     */
    private function noeud(string $table, string $colonneParent, int $parentId, string $nom, string $source, string $chemin): array
    {
        $cle = "{$table}:{$parentId}";

        if (! isset($this->connus[$cle])) {
            $this->connus[$cle] = [];
            foreach (DB::table($table)->where($colonneParent, $parentId)->get(['id', 'nom']) as $existant) {
                $this->connus[$cle][NormalisationNom::cle($existant->nom)] ??= (int) $existant->id;
            }
        }

        $nomCle = NormalisationNom::cle($nom);
        if (isset($this->connus[$cle][$nomCle])) {
            return [$this->connus[$cle][$nomCle], false];
        }

        $id = (int) DB::table($table)->insertGetId([
            $colonneParent => $parentId,
            'nom' => mb_substr(NormalisationNom::nettoyer($nom), 0, 128),
            'source' => $source,
            'code_externe' => substr(sha1($chemin), 0, 40),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->connus[$cle][$nomCle] = $id;

        return [$id, true];
    }
}
