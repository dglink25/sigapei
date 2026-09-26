<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Charge les 54 pays du continent africain (section 5.1), avec code ISO
 * (2 lettres), nom en francais et indicatif telephonique. Idempotent
 * (upsert sur code_iso) : peut etre relance sans creer de doublons.
 */
class PaysAfriqueSeeder extends Seeder
{
    public function run(): void
    {
        $pays = [
            ['ZA', 'Afrique du Sud', '27'],
            ['DZ', 'Algerie', '213'],
            ['AO', 'Angola', '244'],
            ['BJ', 'Benin', '229'],
            ['BW', 'Botswana', '267'],
            ['BF', 'Burkina Faso', '226'],
            ['BI', 'Burundi', '257'],
            ['CV', 'Cap-Vert', '238'],
            ['CM', 'Cameroun', '237'],
            ['CF', 'Republique centrafricaine', '236'],
            ['KM', 'Comores', '269'],
            ['CG', 'Congo', '242'],
            ['CD', 'Republique democratique du Congo', '243'],
            ['CI', "Cote d'Ivoire", '225'],
            ['DJ', 'Djibouti', '253'],
            ['EG', 'Egypte', '20'],
            ['ER', 'Erythree', '291'],
            ['SZ', 'Eswatini', '268'],
            ['ET', 'Ethiopie', '251'],
            ['GA', 'Gabon', '241'],
            ['GM', 'Gambie', '220'],
            ['GH', 'Ghana', '233'],
            ['GN', 'Guinee', '224'],
            ['GW', 'Guinee-Bissau', '245'],
            ['GQ', 'Guinee equatoriale', '240'],
            ['KE', 'Kenya', '254'],
            ['LS', 'Lesotho', '266'],
            ['LR', 'Liberia', '231'],
            ['LY', 'Libye', '218'],
            ['MG', 'Madagascar', '261'],
            ['MW', 'Malawi', '265'],
            ['ML', 'Mali', '223'],
            ['MA', 'Maroc', '212'],
            ['MU', 'Maurice', '230'],
            ['MR', 'Mauritanie', '222'],
            ['MZ', 'Mozambique', '258'],
            ['NA', 'Namibie', '264'],
            ['NE', 'Niger', '227'],
            ['NG', 'Nigeria', '234'],
            ['UG', 'Ouganda', '256'],
            ['RW', 'Rwanda', '250'],
            ['ST', 'Sao Tome-et-Principe', '239'],
            ['SN', 'Senegal', '221'],
            ['SC', 'Seychelles', '248'],
            ['SL', 'Sierra Leone', '232'],
            ['SO', 'Somalie', '252'],
            ['SD', 'Soudan', '249'],
            ['SS', 'Soudan du Sud', '211'],
            ['TZ', 'Tanzanie', '255'],
            ['TD', 'Tchad', '235'],
            ['TG', 'Togo', '228'],
            ['TN', 'Tunisie', '216'],
            ['ZM', 'Zambie', '260'],
            ['ZW', 'Zimbabwe', '263'],
        ];

        $maintenant = now();

        foreach ($pays as [$code, $nom, $indicatif]) {
            $existant = DB::table('pays')->where('code_iso', $code)->first();

            DB::table('pays')->updateOrInsert(
                ['code_iso' => $code],
                [
                    'nom' => $nom,
                    'indicatif_tel' => $indicatif,
                    'updated_at' => $maintenant,
                    'created_at' => $existant->created_at ?? $maintenant,
                ]
            );
        }

        $this->command?->info(count($pays).' pays africains charges/mis a jour.');
    }
}
