<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Supprime les departements (et, en cascade, communes et arrondissements) d'un ou
 * plusieurs pays, pour repartir d'une source propre.
 *
 * Protegee par les cles etrangeres : si une demande ou un etablissement utilise
 * deja une de ces subdivisions, rien n'est supprime (tout est annule).
 *
 *   php artisan geo:vider BJ
 *   php artisan geo:vider BJ FR --force
 */
class ViderGeoPays extends Command
{
    protected $signature = 'geo:vider
        {pays* : Codes ISO2 des pays a vider (ex. BJ)}
        {--force : Ne demande pas de confirmation}';

    protected $description = 'Supprime departements, communes et arrondissements des pays indiques.';

    public function handle(): int
    {
        $codes = array_values(array_unique(array_map('strtoupper', (array) $this->argument('pays'))));
        $paysIds = DB::table('pays')->whereIn('code_iso', $codes)->pluck('id', 'code_iso')->all();

        $inconnus = array_diff($codes, array_keys($paysIds));
        if ($inconnus) {
            $this->error('Codes pays inconnus : '.implode(', ', $inconnus));

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('Supprimer toutes les subdivisions de '.implode(', ', $codes).' ?')) {
            $this->line('Annule.');

            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($paysIds) {
                foreach ($paysIds as $iso => $paysId) {
                    $n = DB::table('departements')->where('pays_id', $paysId)->delete();
                    $this->line("{$iso} : {$n} departement(s) supprime(s) (communes et arrondissements en cascade).");
                }
            });
        } catch (QueryException) {
            $this->error('Suppression impossible : des demandes ou des etablissements utilisent deja ces subdivisions. Rien n\'a ete supprime.');

            return self::FAILURE;
        }

        try {
            Cache::increment('geo:version');
        } catch (\Throwable) {
            // sans consequence : les listes expirent d'elles-memes
        }

        return self::SUCCESS;
    }
}
