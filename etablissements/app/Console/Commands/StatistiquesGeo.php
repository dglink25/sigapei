<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Etat du referentiel geographique : nombre de departements, communes et
 * arrondissements par pays. Sert a verifier ce qui est complet et ce qui manque.
 *
 *   php artisan geo:statistiques                 # tous les pays
 *   php artisan geo:statistiques --pays=BJ,FR    # quelques pays
 *   php artisan geo:statistiques --incomplets    # uniquement les pays sans subdivision
 *   php artisan geo:statistiques --sans-arrondissements   # pays ayant des communes mais aucun arrondissement
 */
class StatistiquesGeo extends Command
{
    protected $signature = 'geo:statistiques
        {--pays= : Codes ISO2 separes par des virgules}
        {--incomplets : Affiche seulement les pays sans aucun departement}
        {--sans-arrondissements : Affiche seulement les pays qui ont des communes mais aucun arrondissement}';

    protected $description = 'Affiche le nombre de departements, communes et arrondissements par pays.';

    public function handle(): int
    {
        $lignes = DB::select(<<<'SQL'
SELECT p.code_iso, p.nom,
    (SELECT count(*) FROM departements d WHERE d.pays_id = p.id) AS departements,
    (SELECT count(*) FROM communes c JOIN departements d ON d.id = c.departement_id WHERE d.pays_id = p.id) AS communes,
    (SELECT count(*) FROM arrondissements a JOIN communes c ON c.id = a.commune_id JOIN departements d ON d.id = c.departement_id WHERE d.pays_id = p.id) AS arrondissements
FROM pays p
ORDER BY p.code_iso
SQL);

        $filtre = array_values(array_filter(array_map(fn ($c) => strtoupper(trim($c)), explode(',', (string) $this->option('pays')))));

        $lignes = array_values(array_filter($lignes, function ($l) use ($filtre) {
            if ($filtre && ! in_array($l->code_iso, $filtre, true)) {
                return false;
            }
            if ($this->option('incomplets') && $l->departements > 0) {
                return false;
            }
            if ($this->option('sans-arrondissements') && ($l->communes == 0 || $l->arrondissements > 0)) {
                return false;
            }

            return true;
        }));

        $this->table(
            ['ISO', 'Pays', 'Departements', 'Communes', 'Arrondissements'],
            array_map(fn ($l) => [$l->code_iso, $l->nom, $l->departements, $l->communes, $l->arrondissements], $lignes)
        );

        $total = DB::selectOne('SELECT (SELECT count(*) FROM pays) AS pays, (SELECT count(*) FROM pays p WHERE EXISTS (SELECT 1 FROM departements d WHERE d.pays_id = p.id)) AS avec_subdivisions');
        $this->info("{$total->avec_subdivisions} pays sur {$total->pays} ont au moins un departement.");

        return self::SUCCESS;
    }
}
