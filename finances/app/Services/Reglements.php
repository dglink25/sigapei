<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Facture;
use App\Models\Reglement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Règlements saisis à la main (espèces, virement, chèque - CDC §5, §7) :
 *  - saisis par un profil habilité, avec pièce justificative ;
 *  - séparation des tâches activée par défaut : validés par un AUTRE profil habilité (contrainte en base) ;
 *    désactivée par l'administrateur, le règlement est validé à la saisie et marqué auto_valide ;
 *  - jamais au-delà du reste à payer (règlements en attente compris) ; un règlement décidé est définitif.
 * Les paiements en ligne ne passent jamais par ici : seul le service Paiement les confirme.
 */
class Reglements
{
    public function __construct(
        private readonly Journal $journal,
        private readonly Parametres $parametres,
        private readonly RabbitMqPublisher $evenements,
    ) {}

    public function saisir(Facture $facture, array $d): Reglement
    {
        $doubleValidation = $this->parametres->lire()['double_validation_reglements'];

        $r = DB::transaction(function () use ($facture, $d, $doubleValidation) {
            $f = Facture::whereKey($facture->id)->lockForUpdate()->firstOrFail();
            if ($f->statut === 'annulee') {
                throw MetierException::conflit('Cette facture est annulée.', 'FACTURE_ANNULEE');
            }
            if ($d['date_reglement'] > now()->toDateString()) {
                throw ValidationException::withMessages(['date_reglement' => 'La date du règlement ne peut pas être dans le futur.']);
            }
            $enAttente = (int) $f->reglements()->where('statut', 'a_valider')->sum('montant');
            $disponible = $f->resteAPayer() - $enAttente;
            if ($d['montant'] > $disponible) {
                throw ValidationException::withMessages(['montant' => "Le montant dépasse le reste à payer ({$disponible}".($enAttente > 0 ? ', règlements en attente de validation déduits' : '').').']);
            }

            $r = new Reglement([
                'mode' => $d['mode'],
                'montant' => $d['montant'],
                'date_reglement' => $d['date_reglement'],
                'piece_reference' => trim($d['piece_reference']),
                'commentaire' => $d['commentaire'] ?? null,
                'saisi_par_uuid' => Contexte::utilisateurUuid(),
                'statut' => $doubleValidation ? 'a_valider' : 'valide',
            ]);
            $r->facture_id = $f->id;
            if (! $doubleValidation) {
                $r->forceFill(['valide_par_uuid' => Contexte::utilisateurUuid(), 'valide_le' => now(), 'auto_valide' => true, 'numero_recu' => $this->journal->numero('RE')]);
            }
            $r->save();
            $this->journal->ecrire('reglement.saisi', 'reglement', $r->uuid, ['facture' => $f->numero, 'montant' => $r->montant, 'mode' => $r->mode, 'auto_valide' => ! $doubleValidation]);

            return $r;
        });

        if ($r->statut === 'valide') {
            $this->publierConfirme($r);
        }

        return $r->fresh('facture');
    }

    public function valider(Reglement $reglement): Reglement
    {
        $r = DB::transaction(function () use ($reglement) {
            $r = Reglement::whereKey($reglement->id)->lockForUpdate()->firstOrFail();
            $this->verifierDecidable($r);
            if (hash_equals((string) $r->saisi_par_uuid, Contexte::utilisateurUuid())) {
                throw MetierException::accesRefuse('Séparation des tâches : un règlement est validé par un autre profil que celui qui l\'a saisi.', 'SEPARATION_DES_TACHES');
            }
            $r->forceFill(['statut' => 'valide', 'valide_par_uuid' => Contexte::utilisateurUuid(), 'valide_le' => now(), 'numero_recu' => $this->journal->numero('RE')])->save();
            $this->journal->ecrire('reglement.valide', 'reglement', $r->uuid, ['montant' => $r->montant]);

            return $r;
        });
        $this->publierConfirme($r);

        return $r->fresh('facture');
    }

    public function rejeter(Reglement $reglement, string $motif): Reglement
    {
        return DB::transaction(function () use ($reglement, $motif) {
            $r = Reglement::whereKey($reglement->id)->lockForUpdate()->firstOrFail();
            $this->verifierDecidable($r);
            $r->forceFill(['statut' => 'rejete', 'valide_par_uuid' => Contexte::utilisateurUuid(), 'valide_le' => now(), 'motif_rejet' => $motif])->save();
            $this->journal->ecrire('reglement.rejete', 'reglement', $r->uuid, ['montant' => $r->montant, 'motif' => $motif]);

            return $r->fresh('facture');
        });
    }

    private function verifierDecidable(Reglement $r): void
    {
        if ($r->statut !== 'a_valider') {
            throw MetierException::conflit('Ce règlement a déjà été traité.', 'DEJA_TRAITE');
        }
    }

    private function publierConfirme(Reglement $r): void
    {
        $f = $r->facture()->first();
        $this->evenements->publier('finances.paiement.confirme', [
            'etablissement_uuid' => $r->etablissement_uuid, 'reglement_uuid' => $r->uuid, 'facture_uuid' => $f->uuid, 'apprenant_uuid' => $f->apprenant_uuid,
        ]);
    }
}
