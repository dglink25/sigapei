<?php

namespace App\Console\Commands;

use App\Support\NormalisationNom;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use ZipArchive;

/**
 * Telecharge et importe, pays par pays, les trois premiers niveaux administratifs
 * du monde entier depuis GeoNames (https://www.geonames.org, licence CC BY 4.0 :
 * citer la source) :
 *
 *   ADM1 -> departements (regions, etats, provinces...)
 *   ADM2 -> communes     (communes, comtes, districts...)
 *   ADM3 -> arrondissements
 *
 * Les niveaux sont mappes par PROFONDEUR administrative, pas par nom : selon les
 * pays, ADM1 s'appelle region, etat ou departement (libelles dans pays.libelle_niveau_1/2/3).
 * Les niveaux plus profonds (ADM4 et au-dela, ex. les communes francaises) ne sont
 * pas importes. La profondeur disponible depend de GeoNames : la commande affiche
 * pour chaque pays le nombre de lignes par niveau, et `geo:statistiques` permet de
 * verifier ce qui manque. Les trous se comblent avec `geo:arbre` (fichier CSV).
 *
 *   php artisan geo:geonames BJ              # le Benin
 *   php artisan geo:geonames BJ FR SN        # plusieurs pays
 *   php artisan geo:geonames                 # tous les pays en base (long : plusieurs centaines de Mo)
 *   php artisan geo:geonames BJ --remplacer  # remplace des subdivisions d'une autre source
 *
 * Idempotent : chaque ligne est identifiee par (source 'geonames', geonameid).
 */
class ImporterGeoNames extends Command
{
    private const SOURCE = 'geonames';

    private const URL = 'https://download.geonames.org/export/dump/';

    protected $signature = 'geo:geonames
        {pays?* : Codes ISO2 (ex. BJ FR). Par defaut tous les pays en base}
        {--dossier= : Dossier de telechargement (par defaut storage/app/geonames)}
        {--sans-telechargement : Utilise uniquement les fichiers deja presents dans le dossier}
        {--remplacer : Remplace les subdivisions deja presentes d une autre source}
        {--noms-bruts : Conserve les noms tels que fournis, sans retirer les prefixes Departement de, Commune de...}
        {--lot=2000 : Nombre de lignes par requete d insertion}';

    protected $description = 'Telecharge et importe departements, communes et arrondissements depuis GeoNames.';

    public function handle(): int
    {
        $dossier = rtrim((string) ($this->option('dossier') ?: storage_path('app/geonames')), '/\\');
        if (! is_dir($dossier) && ! mkdir($dossier, 0775, true) && ! is_dir($dossier)) {
            $this->error("Impossible de creer le dossier {$dossier}");

            return self::FAILURE;
        }

        $paysIds = DB::table('pays')->pluck('id', 'code_iso')->all();
        if (! $paysIds) {
            $this->error("Aucun pays en base : lancez d'abord php artisan db:seed --class=PaysMondeSeeder");

            return self::FAILURE;
        }

        $demandes = array_values(array_unique(array_map('strtoupper', (array) $this->argument('pays'))));
        $codes = $demandes ?: array_keys($paysIds);
        $inconnus = array_diff($codes, array_keys($paysIds));
        if ($inconnus) {
            $this->error('Codes pays inconnus : '.implode(', ', $inconnus));

            return self::FAILURE;
        }

        $lot = max(100, min((int) $this->option('lot'), 5000));
        $resultats = [];

        foreach ($codes as $i => $iso) {
            $this->line(sprintf('[%d/%d] %s', $i + 1, count($codes), $iso));

            try {
                $resultats[] = $this->traiterPays($iso, (int) $paysIds[$iso], $dossier, $lot);
            } catch (\Throwable $e) {
                $this->warn("  {$iso} : {$e->getMessage()}");
                $resultats[] = [$iso, '-', '-', '-', 'ERREUR'];
            }
        }

        try {
            Cache::increment('geo:version'); // invalide tout le cache geographique
        } catch (\Throwable) {
            $this->warn('Cache indisponible : les listes se rafraichiront a expiration du TTL.');
        }

        $this->newLine();
        $this->table(['Pays', 'Departements', 'Communes', 'Arrondissements', 'Statut'], $resultats);
        $this->line('Donnees : GeoNames (https://www.geonames.org), licence CC BY 4.0.');
        $this->line('Verifiez la couverture avec : php artisan geo:statistiques --incomplets');

        return self::SUCCESS;
    }

    /** @return array{0: string, 1: int|string, 2: int|string, 3: int|string, 4: string} */
    private function traiterPays(string $iso, int $paysId, string $dossier, int $lot): array
    {
        // Subdivisions deja presentes d'une autre source : on ne melange jamais deux sources.
        $autres = DB::table('departements')
            ->where('pays_id', $paysId)
            ->where(fn ($q) => $q->whereNull('source')->orWhere('source', '!=', self::SOURCE))
            ->count();

        if ($autres > 0 && ! $this->option('remplacer')) {
            $this->warn("  {$iso} : {$autres} departement(s) d'une autre source existent deja. Relancez avec --remplacer pour les remplacer.");

            return [$iso, '-', '-', '-', 'IGNORE (autre source)'];
        }

        $fichier = $this->preparerFichier($iso, $dossier);
        if ($fichier === null) {
            return [$iso, '-', '-', '-', 'Pas de donnees GeoNames'];
        }

        [$adm1, $adm2, $adm3] = $this->lireNiveaux($fichier);

        if (! $adm1) {
            return [$iso, 0, 0, 0, 'Aucun niveau administratif dans GeoNames'];
        }

        $maintenant = now();
        $nettoyer = ! $this->option('noms-bruts');
        $orphelins = 0;

        $resume = DB::transaction(function () use ($iso, $paysId, $autres, $adm1, $adm2, $adm3, $lot, $maintenant, $nettoyer, &$orphelins) {
            if ($autres > 0) {
                // Les cles etrangeres des etablissements/demandes protegent : la suppression
                // echoue (et tout est annule) si une subdivision est deja utilisee.
                try {
                    DB::table('departements')
                        ->where('pays_id', $paysId)
                        ->where(fn ($q) => $q->whereNull('source')->orWhere('source', '!=', self::SOURCE))
                        ->delete();
                } catch (QueryException) {
                    throw new RuntimeException('des demandes ou etablissements utilisent deja ces subdivisions : remplacement impossible.');
                }
            }

            // --- Niveau 1 : departements ---
            $lignes = [];
            foreach ($adm1 as $a) {
                $lignes[$a['id']] = $this->ligne(['pays_id' => $paysId], $a['id'], $a['nom'], $maintenant, $nettoyer);
            }
            $this->enregistrer('departements', $lignes, ['pays_id', 'nom', 'updated_at'], $lot);
            $idsDepartements = DB::table('departements')->where('pays_id', $paysId)->where('source', self::SOURCE)->pluck('id', 'code_externe')->all();

            // --- Niveau 2 : communes ---
            $lignes = [];
            foreach ($adm2 as $a) {
                $parent = $adm1[$a['a1']]['id'] ?? null;
                $departementId = $parent !== null ? ($idsDepartements[$parent] ?? null) : null;
                if (! $departementId) {
                    $orphelins++;

                    continue;
                }
                $lignes[$a['id']] = $this->ligne(['departement_id' => $departementId], $a['id'], $a['nom'], $maintenant, $nettoyer);
            }
            $this->enregistrer('communes', $lignes, ['departement_id', 'nom', 'updated_at'], $lot);
            $idsCommunes = DB::table('communes')
                ->whereIn('departement_id', array_values($idsDepartements))
                ->where('source', self::SOURCE)
                ->pluck('id', 'code_externe')
                ->all();

            // --- Niveau 3 : arrondissements ---
            $lignes = [];
            foreach ($adm3 as $a) {
                $parent = $adm2[$a['a1'].'|'.$a['a2']]['id'] ?? null;
                $communeId = $parent !== null ? ($idsCommunes[$parent] ?? null) : null;
                if (! $communeId) {
                    $orphelins++;

                    continue;
                }
                $lignes[$a['id']] = $this->ligne(['commune_id' => $communeId], $a['id'], $a['nom'], $maintenant, $nettoyer);
            }
            $this->enregistrer('arrondissements', $lignes, ['commune_id', 'nom', 'updated_at'], $lot);

            return [count($adm1), count($adm2), count($adm3)];
        });

        $this->line(sprintf('  %s : %d departements, %d communes, %d arrondissements%s',
            $iso, $resume[0], $resume[1], $resume[2],
            $orphelins ? " ({$orphelins} sans parent ignores)" : ''));

        return [$iso, $resume[0], $resume[1], $resume[2], 'OK'];
    }

    /** Construit une ligne prete pour l'upsert. */
    private function ligne(array $parent, string $geonameId, string $nom, $maintenant, bool $nettoyer): array
    {
        $nom = $nettoyer ? NormalisationNom::nettoyer($nom) : trim($nom);

        return $parent + [
            'nom' => mb_substr($nom, 0, 128),
            'source' => self::SOURCE,
            'code_externe' => $geonameId,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ];
    }

    private function enregistrer(string $table, array $lignes, array $colonnesMaj, int $lot): void
    {
        foreach (array_chunk(array_values($lignes), $lot) as $paquet) {
            DB::table($table)->upsert($paquet, ['source', 'code_externe'], $colonnesMaj);
        }
    }

    /**
     * Lit le fichier GeoNames d'un pays (colonnes separees par des tabulations) et ne
     * retient que les divisions administratives ADM1, ADM2 et ADM3.
     * Colonnes utiles : 0 geonameid, 1 nom, 6 classe, 7 code, 10-12 codes admin1/2/3.
     * Le rattachement au parent se fait par les codes admin (admin1 ; admin1+admin2).
     *
     * @return array{0: array, 1: array, 2: array}
     */
    private function lireNiveaux(string $fichier): array
    {
        $poignee = fopen($fichier, 'r');
        if ($poignee === false) {
            throw new RuntimeException("impossible d'ouvrir {$fichier}");
        }

        $adm1 = $adm2 = $adm3 = [];

        try {
            while (($ligne = fgets($poignee)) !== false) {
                $c = explode("\t", rtrim($ligne, "\r\n"), 14);
                if (count($c) < 13 || $c[6] !== 'A') {
                    continue;
                }

                switch ($c[7]) {
                    case 'ADM1':
                        $adm1[$c[10]] ??= ['id' => $c[0], 'nom' => $c[1]];
                        break;
                    case 'ADM2':
                        $adm2[$c[10].'|'.$c[11]] ??= ['id' => $c[0], 'nom' => $c[1], 'a1' => $c[10]];
                        break;
                    case 'ADM3':
                        $adm3[$c[10].'|'.$c[11].'|'.$c[12]] ??= ['id' => $c[0], 'nom' => $c[1], 'a1' => $c[10], 'a2' => $c[11]];
                        break;
                }
            }
        } finally {
            fclose($poignee);
        }

        return [$adm1, $adm2, $adm3];
    }

    /** Telecharge (sauf --sans-telechargement) puis decompresse le fichier du pays. Retourne le chemin du .txt, ou null. */
    private function preparerFichier(string $iso, string $dossier): ?string
    {
        $txt = "{$dossier}/{$iso}.txt";
        $zip = "{$dossier}/{$iso}.zip";

        if (! $this->option('sans-telechargement')) {
            $this->line("  telechargement de {$iso}.zip ...");
            $reponse = Http::timeout(1800)
                ->withHeaders(['User-Agent' => 'sigapei-etablissements'])
                ->withOptions(['sink' => $zip])
                ->get(self::URL.$iso.'.zip');

            if (! $reponse->successful()) {
                @unlink($zip);
                $this->warn("  {$iso} : fichier GeoNames indisponible (HTTP {$reponse->status()}).");

                return null;
            }

            $this->extraire($zip, $iso, $dossier);
        }

        if (! is_file($txt)) {
            $this->warn("  {$iso} : {$txt} introuvable.");

            return null;
        }

        return $txt;
    }

    private function extraire(string $zip, string $iso, string $dossier): void
    {
        if (class_exists(ZipArchive::class)) {
            $archive = new ZipArchive();
            if ($archive->open($zip) !== true) {
                throw new RuntimeException("archive {$iso}.zip illisible.");
            }
            $archive->extractTo($dossier, "{$iso}.txt");
            $archive->close();

            return;
        }

        // Repli : extension PHP zip absente, on utilise la commande systeme unzip.
        $processus = Process::run(['unzip', '-o', '-d', $dossier, $zip, "{$iso}.txt"]);
        if (! $processus->successful()) {
            throw new RuntimeException("impossible de decompresser {$iso}.zip : installez l'extension PHP zip (ou unzip), puis relancez.");
        }
    }
}
