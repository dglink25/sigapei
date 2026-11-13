<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use Illuminate\Support\Facades\DB;

/** Paramètres financiers de l'établissement (valeurs par défaut sûres tant qu'ils ne sont pas enregistrés). */
class Parametres
{
    public const DEFAUTS = [
        'devise' => 'XOF',
        'double_validation_reglements' => true,
        'relance_jours_avant' => 7,
        'relance_jours_apres' => [1, 7, 15],
        'mentions_recu' => null,
    ];

    public function __construct(
        private readonly Journal $journal,
        private readonly RabbitMqPublisher $evenements,
    ) {}

    public function lire(): array
    {
        $p = DB::table('finances.parametres')->where('etablissement_uuid', Contexte::etablissement())->first();
        if ($p === null) {
            return self::DEFAUTS + ['enregistre' => false];
        }

        return [
            'devise' => $p->devise,
            'double_validation_reglements' => (bool) $p->double_validation_reglements,
            'relance_jours_avant' => (int) $p->relance_jours_avant,
            'relance_jours_apres' => array_map('intval', json_decode($p->relance_jours_apres, true)),
            'mentions_recu' => $p->mentions_recu,
            'enregistre' => true,
        ];
    }

    public function enregistrer(array $d): array
    {
        $avant = $this->lire();
        $apres = array_merge(array_intersect_key($avant, self::DEFAUTS), array_intersect_key($d, self::DEFAUTS));
        if (isset($apres['relance_jours_apres'])) {
            $apres['relance_jours_apres'] = array_values(array_unique(array_map('intval', $apres['relance_jours_apres'])));
            sort($apres['relance_jours_apres']);
        }
        if ($avant['enregistre'] && $apres['devise'] !== $avant['devise'] && DB::table('finances.factures')->where('etablissement_uuid', Contexte::etablissement())->exists()) {
            throw MetierException::conflit('La devise ne change plus une fois des factures émises.', 'DEVISE_FIGEE');
        }

        DB::transaction(function () use ($apres, $avant) {
            DB::table('finances.parametres')->upsert([[
                'etablissement_uuid' => Contexte::etablissement(),
                'devise' => $apres['devise'],
                'double_validation_reglements' => $apres['double_validation_reglements'],
                'relance_jours_avant' => $apres['relance_jours_avant'],
                'relance_jours_apres' => json_encode($apres['relance_jours_apres']),
                'mentions_recu' => $apres['mentions_recu'],
                'modifie_par_uuid' => Contexte::utilisateurUuid(),
                'updated_at' => now(),
            ]], ['etablissement_uuid'], ['devise', 'double_validation_reglements', 'relance_jours_avant', 'relance_jours_apres', 'mentions_recu', 'modifie_par_uuid', 'updated_at']);

            $this->journal->ecrire('parametres.modifies', 'parametres', null, ['avant' => array_diff_key($avant, ['enregistre' => 1]), 'apres' => $apres]);

            // Garde-fou du CDC (§6.1) : la désactivation de la séparation des tâches est signalée à la plateforme.
            if ($avant['double_validation_reglements'] && ! $apres['double_validation_reglements']) {
                $this->evenements->publier('finances.separation_taches.desactivee', [
                    'etablissement_uuid' => Contexte::etablissement(),
                    'par_uuid' => Contexte::utilisateurUuid(),
                ]);
            }
        });

        return $this->lire();
    }
}
