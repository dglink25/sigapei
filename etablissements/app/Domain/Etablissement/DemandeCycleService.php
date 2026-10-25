<?php

namespace App\Domain\Etablissement;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service métier pour les demandes d'extension de cycle.
 *
 * Règles :
 *   - Un établissement ne peut pas demander un cycle qu'il possède déjà.
 *   - Une seule demande en attente par cycle par établissement.
 *   - L'acceptation crée la ligne dans cycles_autorises.
 *   - Le refus est définitif ; l'établissement peut re-soumettre.
 */
class DemandeCycleService
{
    /**
     * Soumet une demande d'extension de cycle (côté administrateur de l'établissement).
     */
    public function soumettre(int $etablissementId, string $cycle, string $motif = ''): DemandeCycle
    {
        // Vérifier que le cycle n'est pas déjà autorisé
        $dejaAutorise = CycleAutorise::where('etablissement_id', $etablissementId)
            ->where('cycle', $cycle)
            ->where('statut', 'actif')
            ->exists();

        if ($dejaAutorise) {
            throw ValidationException::withMessages([
                'cycle' => ['Ce cycle est déjà autorisé pour votre établissement.'],
            ]);
        }

        // Vérifier qu'il n'y a pas déjà une demande en attente
        $dejaEnAttente = DemandeCycle::where('etablissement_id', $etablissementId)
            ->where('cycle', $cycle)
            ->where('statut', 'en_attente')
            ->exists();

        if ($dejaEnAttente) {
            throw ValidationException::withMessages([
                'cycle' => ['Une demande est déjà en cours d\'instruction pour ce cycle.'],
            ]);
        }

        return DemandeCycle::create([
            'etablissement_id' => $etablissementId,
            'cycle'            => $cycle,
            'statut'           => 'en_attente',
            'motif'            => $motif,
        ]);
    }

    /**
     * Accepte une demande (Super Administrateur).
     * Crée ou réactive la ligne dans cycles_autorises.
     */
    public function accepter(DemandeCycle $demande, string $note = '', ?string $instruitPar = null): DemandeCycle    {
        if ($demande->statut !== 'en_attente') {
            throw ValidationException::withMessages([
                'statut' => ['Seule une demande en attente peut être acceptée.'],
            ]);
        }

        DB::transaction(function () use ($demande, $note, $instruitPar) {
            // Créer ou réactiver le cycle autorisé
            CycleAutorise::updateOrCreate(
                ['etablissement_id' => $demande->etablissement_id, 'cycle' => $demande->cycle],
                ['statut' => 'actif'],
            );

            $demande->update([
                'statut'           => 'acceptee',
                'note_instruction' => $note,
                'instruit_par'     => $instruitPar,
                'date_instruction' => now(),
            ]);
        });

        return $demande->fresh();
    }

    /**
     * Refuse une demande (Super Administrateur).
     */
    public function refuser(DemandeCycle $demande, string $note = '', ?string $instruitPar = null): DemandeCycle
    {
        if ($demande->statut !== 'en_attente') {
            throw ValidationException::withMessages([
                'statut' => ['Seule une demande en attente peut être refusée.'],
            ]);
        }

        $demande->update([
            'statut'           => 'refusee',
            'note_instruction' => $note,
            'instruit_par'     => $instruitPar,
            'date_instruction' => now(),
        ]);

        return $demande->fresh();
    }
}
