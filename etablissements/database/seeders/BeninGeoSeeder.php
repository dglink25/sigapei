<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Departements (12) et communes (77) du Benin, charges a la main (source
 * 'sigapei') pour que la cascade du formulaire d'onboarding fonctionne
 * immediatement sur le pays de lancement de la plateforme.
 *
 * Les arrondissements ne sont pas inclus ici : a charger depuis une source
 * officielle (voir docs/referentiel-geographique.md). La commande
 * `geo:importer` ignore le Benin par defaut (--sauf=BJ) pour ne pas creer de
 * doublons avec ces donnees. Idempotent : relancable sans risque.
 */
class BeninGeoSeeder extends Seeder
{
    private const SOURCE = 'sigapei';

    public function run(): void
    {
        $paysId = DB::table('pays')->where('code_iso', 'BJ')->value('id');

        if (! $paysId) {
            $this->command?->error("Pays BJ introuvable : lancez d'abord PaysMondeSeeder.");

            return;
        }

        $referentiel = [
            'Alibori' => ['Banikoara', 'Gogounou', 'Kandi', 'Karimama', 'Malanville', 'Ségbana'],
            'Atacora' => ['Boukoumbé', 'Cobly', 'Kérou', 'Kouandé', 'Matéri', 'Natitingou', 'Péhunco', 'Tanguiéta', 'Toucountouna'],
            'Atlantique' => ['Abomey-Calavi', 'Allada', 'Kpomassè', 'Ouidah', 'Sô-Ava', 'Toffo', 'Tori-Bossito', 'Zè'],
            'Borgou' => ['Bembèrèkè', 'Kalalé', 'N\'Dali', 'Nikki', 'Parakou', 'Pèrèrè', 'Sinendé', 'Tchaourou'],
            'Collines' => ['Bantè', 'Dassa-Zoumè', 'Glazoué', 'Ouèssè', 'Savalou', 'Savè'],
            'Couffo' => ['Aplahoué', 'Djakotomey', 'Dogbo', 'Klouékanmè', 'Lalo', 'Toviklin'],
            'Donga' => ['Bassila', 'Copargo', 'Djougou', 'Ouaké'],
            'Littoral' => ['Cotonou'],
            'Mono' => ['Athiémé', 'Bopa', 'Comè', 'Grand-Popo', 'Houéyogbé', 'Lokossa'],
            'Ouémé' => ['Adjarra', 'Adjohoun', 'Aguégués', 'Akpro-Missérété', 'Avrankou', 'Bonou', 'Dangbo', 'Porto-Novo', 'Sèmè-Podji'],
            'Plateau' => ['Adja-Ouèrè', 'Ifangni', 'Kétou', 'Pobè', 'Sakété'],
            'Zou' => ['Abomey', 'Agbangnizoun', 'Bohicon', 'Cové', 'Djidja', 'Ouinhi', 'Za-Kpota', 'Zagnanado', 'Zogbodomey'],
        ];

        $maintenant = now();

        // 1) Departements
        $lignes = [];
        foreach (array_keys($referentiel) as $departement) {
            $lignes[] = [
                'pays_id' => $paysId,
                'nom' => $departement,
                'source' => self::SOURCE,
                'code_externe' => 'bj-'.Str::slug($departement),
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ];
        }
        DB::table('departements')->upsert($lignes, ['source', 'code_externe'], ['pays_id', 'nom', 'updated_at']);

        $idsDepartements = DB::table('departements')
            ->where('source', self::SOURCE)
            ->pluck('id', 'code_externe');

        // 2) Communes
        $lignes = [];
        foreach ($referentiel as $departement => $communes) {
            $codeDepartement = 'bj-'.Str::slug($departement);
            foreach ($communes as $commune) {
                $lignes[] = [
                    'departement_id' => $idsDepartements[$codeDepartement],
                    'nom' => $commune,
                    'source' => self::SOURCE,
                    'code_externe' => $codeDepartement.'-'.Str::slug($commune),
                    'created_at' => $maintenant,
                    'updated_at' => $maintenant,
                ];
            }
        }
        DB::table('communes')->upsert($lignes, ['source', 'code_externe'], ['departement_id', 'nom', 'updated_at']);

        try {
            Cache::increment('geo:version');
        } catch (\Throwable) {
            // Cache indisponible : sans consequence, les listes expirent d'elles-memes (TTL).
        }

        $this->command?->info(count($referentiel).' departements et '.count($lignes).' communes du Benin charges/mis a jour.');
    }
}
