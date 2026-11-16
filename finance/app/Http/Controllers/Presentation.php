<?php

namespace App\Http\Controllers;

use App\Integrations\PaiementClient;
use App\Models\Facture;
use App\Models\FormuleTarifaire;
use App\Models\PaiementEnLigne;
use App\Models\Reglement;

/** Présentation unique des ressources : uuid seulement, jamais d'identifiant interne. */
final class Presentation
{
    public static function formule(FormuleTarifaire $f): array
    {
        return $f->only(['uuid', 'code', 'libelle', 'nature', 'annee_scolaire', 'cycle', 'niveau', 'classe_uuid', 'montant', 'echeancier', 'actif'])
            + ['mis_a_jour_le' => $f->updated_at?->toIso8601String()];
    }

    public static function facture(Facture $f, bool $detail = false): array
    {
        $base = $f->only(['uuid', 'numero', 'apprenant_uuid', 'apprenant_nom', 'apprenant_matricule', 'classe_uuid', 'classe_nom',
            'annee_scolaire', 'libelle', 'devise', 'montant_total', 'montant_regle', 'statut']) + [
                'reste_a_payer' => $f->resteAPayer(),
                'emise_le' => $f->created_at?->toIso8601String(),
            ];
        if ($f->statut === 'annulee') {
            $base['annulation'] = ['motif' => $f->motif_annulation, 'le' => $f->annulee_le?->toIso8601String()];
        }
        if (! $detail) {
            return $base;
        }

        return $base + [
            'lignes' => $f->lignes->map(fn ($l) => $l->only(['ordre', 'libelle', 'nature', 'formule_uuid', 'montant']))->values(),
            'echeances' => $f->echeances->map(fn ($e) => ['rang' => $e->rang, 'libelle' => $e->libelle, 'date_echeance' => $e->date_echeance->toDateString(), 'montant' => $e->montant])->values(),
            'reglements' => $f->reglements->map(fn ($r) => self::reglement($r, false))->values(),
        ];
    }

    public static function reglement(Reglement $r, bool $avecFacture = true): array
    {
        $d = $r->only(['uuid', 'mode', 'montant', 'statut', 'piece_reference', 'commentaire', 'numero_recu', 'motif_rejet', 'saisi_par_uuid', 'valide_par_uuid', 'auto_valide'])
            + ['date_reglement' => $r->date_reglement?->toDateString(), 'valide_le' => $r->valide_le?->toIso8601String(), 'saisi_le' => $r->created_at?->toIso8601String(),
                'recu_disponible' => $r->statut === 'valide' && $r->montant > 0];
        if ($avecFacture && $r->relationLoaded('facture')) {
            $f = $r->facture;
            $d['facture'] = ['uuid' => $f->uuid, 'numero' => $f->numero, 'apprenant_nom' => $f->apprenant_nom, 'classe_nom' => $f->classe_nom, 'reste_a_payer' => $f->resteAPayer()];
        }

        return $d;
    }

    public static function paiement(PaiementEnLigne $p): array
    {
        return $p->only(['uuid', 'montant', 'statut', 'url_paiement', 'encaissement_uuid']) + [
            'expire_le' => $p->expire_le?->toIso8601String(),
            'acquis' => in_array($p->statut, PaiementClient::ETATS_ACQUIS, true),
            'cree_le' => $p->created_at?->toIso8601String(),
        ];
    }
}
