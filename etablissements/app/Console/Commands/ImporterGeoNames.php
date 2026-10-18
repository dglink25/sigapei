<?php

namespace App\Console\Commands;

use App\Support\NormalisationNom;
use Illuminate\Console\Command;
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
 * Les niveaux sont mappes par PROFONDEUR administrative, pas par nom. Les niveaux
 * plus profonds (ADM4 et au-dela, ex. les communes francaises) ne sont pas importes.
 * La profondeur disponible depend de GeoNames : `geo:statistiques` montre ce qui
 * manque, `geo:arbre` permet de le combler avec un fichier officiel.
 *
 * FUSION avec l'existant : si des subdivisions d'une autre source existent deja pour
 * le pays (donnees de test, import precedent...), elles sont RECONNUES par leur nom
 * (sans tenir compte de la casse, des accents, des tirets ni des prefixes
 * "Departement de", "Commune de"...) et rattachees aux donnees GeoNames : leur
 * identifiant interne ne change pas, donc les demandes et etablissements qui les
 * utilisent restent valides. Rien n'est supprime, sauf avec --nettoyer.
 *
 * ORPHELINS : un ADM3 dont l'ADM2 parent est introuvable (souvent parce que son code
 * admin2 n'est pas renseigne dans GeoNames) est IGNORE et compte dans le recapitulatif.
 * Avec --avec-promotion, il est importe au niveau 2 sous son ADM1 ; deconseille, car cela
 * melange deux profondeurs dans le meme niveau (ex. l'Indonesie : des milliers de
 * kecamatan ranges parmi les kabupaten).
 *
 *   php artisan geo:geonames BJ              # le Benin
 *   php artisan geo:geonames BJ FR SN        # plusieurs pays
 *   php artisan geo:geonames                 # tous les pays en base
 *   php artisan geo:geonames --sans-telechargement   # reutilise les fichiers deja telecharges
 *   php artisan geo:geonames --manquants     # seulement les pays qui n'ont encore aucun departement
 *   php artisan geo:geonames BJ --nettoyer   # supprime ensuite les lignes obsoletes inutilisees
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
        {--nettoyer : Supprime ensuite les subdivisions obsoletes (autres sources non rapprochees, ou GeoNames absentes de cet import) si aucune demande ni aucun etablissement ne les utilise}
        {--remplacer : Alias de --nettoyer}
        {--avec-promotion : Importe au niveau 2 les ADM3 dont l ADM2 parent est absent (deconseille : melange les niveaux)}
        {--sans-promotion : Sans effet (comportement par defaut), conserve pour compatibilite}
        {--manquants : Ne traite que les pays qui n ont encore aucun departement}
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

        if ($this->option('manquants')) {
            $avecDepartements = DB::table('departements')->distinct()->pluck('pays_id')->flip()->all();
            $codes = array_values(array_filter($codes, fn ($iso) => ! isset($avecDepartements[$paysIds[$iso]])));

            if (! $codes) {
                $this->info('Tous les pays ont deja au moins un departement.');

                return self::SUCCESS;
            }
            $this->line(count($codes).' pays sans departement : '.implode(' ', $codes));
        }

        $lot = max(100, min((int) $this->option('lot'), 5000));
        $resultats = [];

        foreach ($codes as $i => $iso) {
            $this->line(sprintf('[%d/%d] %s', $i + 1, count($codes), $iso));

            try {
                $resultats[] = $this->traiterPays($iso, (int) $paysIds[$iso], $dossier, $lot);
            } catch (\Throwable $e) {
                $this->warn("  {$iso} : {$e->getMessage()}");
                $resultats[] = [$iso, '-', '-', '-', 'ERREUR : '.mb_substr($e->getMessage(), 0, 60)];
            }
        }

        try {
            Cache::increment('geo:version'); // invalide tout le cache geographique
        } catch (\Throwable) {
            $this->warn('Cache indisponible : les listes se rafraichiront a expiration du TTL.');
        }

        $this->newLine();
        $this->table(['Pays', 'Departements', 'Communes', 'Arrondissements', 'Statut'], $resultats);
        $this->line('* = des subdivisions d\'autres sources sont conservees (utilisees ou non rapprochees) ; --nettoyer supprime celles qui ne sont pas utilisees.');
        $this->line('Donnees : GeoNames (https://www.geonames.org), licence CC BY 4.0.');
        $this->line('Verifiez la couverture avec : php artisan geo:statistiques --incomplets');

        return self::SUCCESS;
    }

    /** @return array{0: string, 1: int|string, 2: int|string, 3: int|string, 4: string} */
    private function traiterPays(string $iso, int $paysId, string $dossier, int $lot): array
    {
        $fichier = $this->preparerFichier($iso, $dossier);
        if ($fichier === null) {
            return [$iso, '-', '-', '-', 'Pas de donnees GeoNames'];
        }

        [$adm1, $adm2, $adm3] = $this->lireNiveaux($fichier);
        if (! $adm1) {
            return [$iso, 0, 0, 0, 'Aucun niveau administratif dans GeoNames'];
        }

        $nettoyerNoms = ! $this->option('noms-bruts');
        $promotion = (bool) $this->option('avec-promotion');
        $nettoyerAutres = (bool) ($this->option('nettoyer') || $this->option('remplacer'));
        $bilan = ['adoptes' => 0, 'promus' => 0, 'orphelins' => 0, 'supprimes' => 0];
        $debut = now()->toDateTimeString(); // les lignes touchees par cet import ont updated_at >= $debut

        [$n1, $n2, $n3] = DB::transaction(function () use ($paysId, $adm1, $adm2, $adm3, $lot, $nettoyerNoms, $promotion, $nettoyerAutres, $debut, &$bilan) {
            // --- Niveau 1 : departements ---
            $noeuds1 = [];
            foreach ($adm1 as $a) {
                $noeuds1[$a['id']] = ['parent' => $paysId, 'nom' => $a['nom']];
            }
            $ids1 = $this->synchroniser('departements', 'pays_id', $noeuds1, [$paysId], $lot, $nettoyerNoms, $bilan);

            // --- Niveau 2 : communes (ADM2 rattaches a leur ADM1, plus les ADM3 promus) ---
            $noeuds2 = [];
            foreach ($adm2 as $a) {
                $parent = isset($adm1[$a['a1']]) ? ($ids1[$adm1[$a['a1']]['id']] ?? null) : null;
                if ($parent === null) {
                    $bilan['orphelins']++;

                    continue;
                }
                $noeuds2[$a['id']] = ['parent' => $parent, 'nom' => $a['nom']];
            }

            $candidats3 = [];
            foreach ($adm3 as $cle => $a) {
                if (isset($adm2[$a['a1'].'|'.$a['a2']])) {
                    $candidats3[$cle] = $a;

                    continue;
                }
                $parent1 = isset($adm1[$a['a1']]) ? ($ids1[$adm1[$a['a1']]['id']] ?? null) : null;
                if ($promotion && $parent1 !== null) {
                    $noeuds2[$a['id']] = ['parent' => $parent1, 'nom' => $a['nom']];
                    $bilan['promus']++;
                } else {
                    $bilan['orphelins']++;
                }
            }
            $ids2 = $this->synchroniser('communes', 'departement_id', $noeuds2, array_values($ids1), $lot, $nettoyerNoms, $bilan);

            // --- Niveau 3 : arrondissements ---
            $noeuds3 = [];
            foreach ($candidats3 as $a) {
                $parent = $ids2[$adm2[$a['a1'].'|'.$a['a2']]['id']] ?? null;
                if ($parent === null) {
                    $bilan['orphelins']++;

                    continue;
                }
                $noeuds3[$a['id']] = ['parent' => $parent, 'nom' => $a['nom']];
            }
            $this->synchroniser('arrondissements', 'commune_id', $noeuds3, array_values($ids2), $lot, $nettoyerNoms, $bilan);

            if ($nettoyerAutres) {
                $bilan['supprimes'] = $this->supprimerObsoletes($paysId, $debut);
            }

            return [count($noeuds1), count($noeuds2), count($noeuds3)];
        });

        $restants = $this->compterAutresSources($paysId);

        $details = array_filter([
            $bilan['adoptes'] ? "{$bilan['adoptes']} rattaches a l'existant" : null,
            $bilan['promus'] ? "{$bilan['promus']} promus au niveau 2" : null,
            $bilan['orphelins'] ? "{$bilan['orphelins']} sans parent ignores" : null,
            $bilan['supprimes'] ? "{$bilan['supprimes']} supprimes" : null,
            $restants ? "{$restants} d'autres sources conserves" : null,
        ]);

        $this->line(sprintf('  %s : %d departements, %d communes, %d arrondissements%s', $iso, $n1, $n2, $n3, $details ? ' ('.implode(', ', $details).')' : ''));

        return [$iso, $n1, $n2, $n3, 'OK'.($restants ? ' *' : '')];
    }

    /**
     * Synchronise un niveau : rattache d'abord les lignes existantes d'une autre
     * source qui portent le meme nom sous le meme parent, puis insere ou met a jour
     * le reste. Retourne la correspondance geonameid -> identifiant interne.
     *
     * @param  array<string|int, array{parent: int, nom: string}>  $noeuds
     * @return array<string|int, int>
     */
    private function synchroniser(string $table, string $colonneParent, array $noeuds, array $parentIds, int $lot, bool $nettoyerNoms, array &$bilan): array
    {
        if (! $noeuds) {
            return [];
        }

        $maintenant = now();

        // 1) Lignes existantes d'une autre source, indexees par parent puis nom normalise.
        $adoptables = [];
        foreach (array_chunk($parentIds, 5000) as $paquet) {
            $existants = DB::table($table)
                ->whereIn($colonneParent, $paquet)
                ->where(fn ($q) => $q->whereNull('source')->orWhere('source', '!=', self::SOURCE))
                ->get(['id', $colonneParent, 'nom']);

            foreach ($existants as $existant) {
                $adoptables[$existant->{$colonneParent}][NormalisationNom::cle($existant->nom)] ??= (int) $existant->id;
            }
        }

        $candidats = []; // geonameid => identifiant de la ligne existante a rattacher
        if ($adoptables) {
            foreach ($noeuds as $geoId => $noeud) {
                $cle = NormalisationNom::cle($noeud['nom']);
                if (isset($adoptables[$noeud['parent']][$cle])) {
                    $candidats[$geoId] = $adoptables[$noeud['parent']][$cle];
                    unset($adoptables[$noeud['parent']][$cle]); // une ligne n'est rattachee qu'une fois
                }
            }
        }

        // Ne rattache pas un geonameid deja present comme ligne GeoNames (contrainte d'unicite).
        if ($candidats) {
            foreach (array_chunk(array_keys($candidats), 2000) as $paquet) {
                $dejaPresents = DB::table($table)
                    ->where('source', self::SOURCE)
                    ->whereIn('code_externe', array_map('strval', $paquet))
                    ->pluck('code_externe');
                foreach ($dejaPresents as $code) {
                    unset($candidats[$code]);
                }
            }
        }

        foreach ($candidats as $geoId => $idExistant) {
            DB::table($table)->where('id', $idExistant)->update([
                'source' => self::SOURCE,
                'code_externe' => (string) $geoId,
                'updated_at' => $maintenant,
            ]);
            $bilan['adoptes']++;
        }

        // 2) Insertion / mise a jour du reste.
        $lignes = [];
        foreach ($noeuds as $geoId => $noeud) {
            if (isset($candidats[$geoId])) {
                continue; // garde le nom deja en base
            }
            $nom = $nettoyerNoms ? NormalisationNom::nettoyer($noeud['nom']) : trim($noeud['nom']);
            $lignes[] = [
                $colonneParent => $noeud['parent'],
                'nom' => mb_substr($nom, 0, 128),
                'source' => self::SOURCE,
                'code_externe' => (string) $geoId,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ];
        }
        foreach (array_chunk($lignes, $lot) as $paquet) {
            DB::table($table)->upsert($paquet, ['source', 'code_externe'], [$colonneParent, 'nom', 'updated_at']);
        }

        // 3) Correspondance geonameid -> identifiant interne (lignes rattachees comprises).
        $ids = [];
        foreach (array_chunk(array_keys($noeuds), 5000) as $paquet) {
            $ids += DB::table($table)
                ->where('source', self::SOURCE)
                ->whereIn('code_externe', array_map('strval', $paquet))
                ->pluck('id', 'code_externe')
                ->all();
        }

        return $ids;
    }

    /**
     * Supprime les subdivisions OBSOLETES du pays : celles d'autres sources non
     * rapprochees, et celles de GeoNames que cet import n'a pas touchees (updated_at
     * anterieur au debut de l'import : elles ne figurent plus dans les donnees, ou ne
     * sont plus importees avec les options choisies). Une ligne n'est supprimee que si
     * plus rien ne l'utilise : ni demande, ni etablissement, ni sous-niveau.
     */
    private function supprimerObsoletes(int $paysId, string $debut): int
    {
        $total = 0;

        $total += DB::delete(<<<'SQL'
DELETE FROM arrondissements a USING communes c, departements d
WHERE a.commune_id = c.id AND c.departement_id = d.id AND d.pays_id = ?
  AND (a.source IS NULL OR a.source <> 'geonames' OR a.updated_at < ?)
  AND NOT EXISTS (SELECT 1 FROM etablissements e WHERE e.arrondissement_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM demandes_etablissement x WHERE x.arrondissement_id = a.id)
SQL, [$paysId, $debut]);

        $total += DB::delete(<<<'SQL'
DELETE FROM communes c USING departements d
WHERE c.departement_id = d.id AND d.pays_id = ?
  AND (c.source IS NULL OR c.source <> 'geonames' OR c.updated_at < ?)
  AND NOT EXISTS (SELECT 1 FROM arrondissements a WHERE a.commune_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM etablissements e WHERE e.commune_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM demandes_etablissement x WHERE x.commune_id = c.id)
SQL, [$paysId, $debut]);

        $total += DB::delete(<<<'SQL'
DELETE FROM departements d
WHERE d.pays_id = ?
  AND (d.source IS NULL OR d.source <> 'geonames' OR d.updated_at < ?)
  AND NOT EXISTS (SELECT 1 FROM communes c WHERE c.departement_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM etablissements e WHERE e.departement_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM demandes_etablissement x WHERE x.departement_id = d.id)
SQL, [$paysId, $debut]);

        return $total;
    }

    /** Nombre de subdivisions du pays qui ne viennent pas de GeoNames. */
    private function compterAutresSources(int $paysId): int
    {
        $ligne = DB::selectOne(<<<'SQL'
SELECT
  (SELECT count(*) FROM departements d WHERE d.pays_id = ? AND (d.source IS NULL OR d.source <> 'geonames'))
+ (SELECT count(*) FROM communes c JOIN departements d ON d.id = c.departement_id WHERE d.pays_id = ? AND (c.source IS NULL OR c.source <> 'geonames'))
+ (SELECT count(*) FROM arrondissements a JOIN communes c ON c.id = a.commune_id JOIN departements d ON d.id = c.departement_id WHERE d.pays_id = ? AND (a.source IS NULL OR a.source <> 'geonames'))
  AS n
SQL, [$paysId, $paysId, $paysId]);

        return (int) $ligne->n;
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
