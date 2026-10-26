<?php

namespace App\Console\Commands;

use Generator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Import massif des departements (regions, etats, provinces...) et des communes
 * (villes) du monde entier depuis deux fichiers CSV.
 *
 * Format attendu : celui du jeu de donnees libre "countries-states-cities-database"
 * (https://github.com/dr5hn/countries-states-cities-database, licence ODbL : citer la
 * source). Seuls deux fichiers sont lus, avec ces colonnes (l'ordre n'a pas d'importance) :
 *   - states.csv : id, name, country_code   (code ISO2 du pays)
 *   - cities.csv : id, name, state_id, country_code
 * Tout autre jeu de donnees convient s'il fournit les memes colonnes.
 *
 *   php artisan geo:importer chemin/vers/dossier
 *   php artisan geo:importer chemin/vers/dossier --pays=FR,SN,CI
 *   php artisan geo:importer chemin/vers/dossier --sauf=BJ,TG
 *
 * Idempotent : chaque ligne est identifiee par (source, code_externe), donc relancer la
 * commande met a jour sans creer de doublon. Les pays doivent deja exister
 * (php artisan db:seed --class=PaysMondeSeeder). Le Benin est ignore par defaut
 * (--sauf=BJ) car il est charge par BeninGeoSeeder. Les arrondissements ne font pas
 * partie de ce jeu de donnees : ils se chargent pays par pays depuis une source officielle.
 */
class ImporterReferentielGeo extends Command
{
    protected $signature = 'geo:importer
        {dossier : Dossier contenant states.csv et cities.csv}
        {--source=dr5hn : Nom de la source, stocke avec chaque ligne pour les imports idempotents}
        {--pays= : Codes ISO2 a importer, separes par des virgules (par defaut tous les pays)}
        {--sauf=BJ : Codes ISO2 a ignorer, separes par des virgules}
        {--lot=2000 : Nombre de lignes par requete d insertion}';

    protected $description = 'Importe les departements et communes du monde depuis states.csv et cities.csv.';

    public function handle(): int
    {
        $dossier = rtrim((string) $this->argument('dossier'), '/\\');
        $fichierStates = $dossier.'/states.csv';
        $fichierCities = $dossier.'/cities.csv';

        foreach ([$fichierStates, $fichierCities] as $fichier) {
            if (! is_file($fichier)) {
                $this->error("Fichier introuvable : {$fichier}");

                return self::FAILURE;
            }
        }

        $source = (string) $this->option('source');
        $lot = max(100, min((int) $this->option('lot'), 5000));
        $inclus = $this->codes($this->option('pays'));
        $exclus = $this->codes($this->option('sauf'));

        $paysIds = DB::table('pays')->pluck('id', 'code_iso')->all();
        if (! $paysIds) {
            $this->error("Aucun pays en base : lancez d'abord php artisan db:seed --class=PaysMondeSeeder");

            return self::FAILURE;
        }

        $this->info('Source : '.$source.($exclus ? ' | ignorés : '.implode(',', $exclus) : '').($inclus ? ' | limité à : '.implode(',', $inclus) : ''));

        try {
            // --- 1) Departements ---
            $this->line('Import des départements / régions...');
            [$nbDepartements, $ignoresD] = $this->importer(
                $fichierStates,
                ['id', 'name', 'country_code'],
                'departements',
                ['pays_id', 'nom', 'updated_at'],
                $lot,
                function (array $ligne) use ($paysIds, $inclus, $exclus, $source) {
                    $iso = strtoupper(trim($ligne['country_code']));
                    if (! $this->retenu($iso, $inclus, $exclus, $paysIds)) {
                        return false;
                    }

                    return ['pays_id' => $paysIds[$iso], 'nom' => $ligne['name'], 'code_externe' => (string) $ligne['id']];
                },
                $source
            );

            // Correspondance identifiant d'origine -> identifiant interne, pour rattacher les communes.
            $idsDepartements = DB::table('departements')->where('source', $source)->pluck('id', 'code_externe')->all();

            // --- 2) Communes ---
            $this->line('Import des communes / villes (peut prendre quelques minutes)...');
            $sansDepartement = 0;
            [$nbCommunes, $ignoresC] = $this->importer(
                $fichierCities,
                ['id', 'name', 'state_id', 'country_code'],
                'communes',
                ['departement_id', 'nom', 'updated_at'],
                $lot,
                function (array $ligne) use ($paysIds, $inclus, $exclus, &$sansDepartement, $idsDepartements) {
                    $iso = strtoupper(trim($ligne['country_code']));
                    if (! $this->retenu($iso, $inclus, $exclus, $paysIds)) {
                        return false;
                    }
                    $departementId = $idsDepartements[$ligne['state_id']] ?? null;
                    if (! $departementId) {
                        $sansDepartement++;

                        return false;
                    }

                    return ['departement_id' => $departementId, 'nom' => $ligne['name'], 'code_externe' => (string) $ligne['id']];
                },
                $source
            );
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        try {
            Cache::increment('geo:version'); // invalide tout le cache geographique
        } catch (\Throwable) {
            $this->warn('Cache indisponible : les listes se rafraîchiront à expiration du TTL.');
        }

        $this->newLine();
        $this->table(['', 'Importés / mis à jour', 'Ignorés (hors périmètre)'], [
            ['Départements / régions', $nbDepartements, $ignoresD],
            ['Communes / villes', $nbCommunes, $ignoresC + $sansDepartement],
        ]);
        $this->info('Terminé.');

        return self::SUCCESS;
    }

    /**
     * Lit un CSV en flux (memoire constante), transforme chaque ligne via $transformer
     * (qui retourne false pour l'ignorer) et l'enregistre par lots (upsert).
     *
     * @return array{0: int, 1: int} [importees, ignorees]
     */
    private function importer(string $fichier, array $colonnes, string $table, array $colonnesMaj, int $lot, callable $transformer, string $source): array
    {
        $maintenant = now();
        $lignes = [];
        $importees = 0;
        $ignorees = 0;
        $lots = 0;

        foreach ($this->lire($fichier, $colonnes) as $ligne) {
            $donnees = $transformer($ligne);
            $nom = is_array($donnees) ? trim((string) $donnees['nom']) : '';

            if ($donnees === false || $nom === '') {
                $ignorees++;

                continue;
            }

            $donnees['nom'] = mb_substr($nom, 0, 128);
            $donnees['source'] = $source;
            $donnees['created_at'] = $maintenant;
            $donnees['updated_at'] = $maintenant;

            // Indexe par identifiant d'origine : un meme identifiant ne peut pas apparaitre
            // deux fois dans une requete d'upsert (erreur PostgreSQL sinon).
            $lignes[$donnees['code_externe']] = $donnees;

            if (count($lignes) >= $lot) {
                $importees += $this->enregistrer($table, $lignes, $colonnesMaj);
                $lignes = [];
                if (++$lots % 10 === 0) {
                    $this->line("  ... {$importees} lignes");
                }
            }
        }

        if ($lignes) {
            $importees += $this->enregistrer($table, $lignes, $colonnesMaj);
        }

        return [$importees, $ignorees];
    }

    private function enregistrer(string $table, array $lignes, array $colonnesMaj): int
    {
        DB::table($table)->upsert(array_values($lignes), ['source', 'code_externe'], $colonnesMaj);

        return count($lignes);
    }

    /** Lecture d'un CSV ligne par ligne, avec controle des colonnes obligatoires. */
    private function lire(string $fichier, array $colonnesRequises): Generator
    {
        $poignee = fopen($fichier, 'r');
        if ($poignee === false) {
            throw new RuntimeException("Impossible d'ouvrir {$fichier}");
        }

        try {
            $entetes = fgetcsv($poignee, 0, ',', '"', '\\');
            if (! $entetes) {
                throw new RuntimeException("Fichier vide : {$fichier}");
            }

            $entetes[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $entetes[0]); // BOM UTF-8
            $entetes = array_map(fn ($entete) => strtolower(trim((string) $entete)), $entetes);

            $manquantes = array_diff($colonnesRequises, $entetes);
            if ($manquantes) {
                throw new RuntimeException(sprintf(
                    "%s : colonne(s) manquante(s) : %s. Colonnes trouvées : %s.",
                    basename($fichier),
                    implode(', ', $manquantes),
                    implode(', ', $entetes)
                ));
            }

            while (($ligne = fgetcsv($poignee, 0, ',', '"', '\\')) !== false) {
                if ($ligne === [null] || count($ligne) !== count($entetes)) {
                    continue; // ligne vide ou mal formee
                }

                yield array_combine($entetes, $ligne);
            }
        } finally {
            fclose($poignee);
        }
    }

    private function retenu(string $iso, array $inclus, array $exclus, array $paysIds): bool
    {
        return isset($paysIds[$iso])
            && ! in_array($iso, $exclus, true)
            && (! $inclus || in_array($iso, $inclus, true));
    }

    /** @return string[] */
    private function codes(mixed $valeur): array
    {
        return array_values(array_filter(array_map(
            fn ($code) => strtoupper(trim($code)),
            explode(',', (string) $valeur)
        )));
    }
}
