<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Integrations\ScolariteClient;
use App\Services\Gouvernance;
use App\Services\Parametres;
use App\Services\Soldes;
use Illuminate\Http\JsonResponse;

/** Vues personnelles : droits du profil connecté et situation de la famille (apprenant ou parent). */
class MesFinancesController extends Controller
{
    public function __construct(
        private readonly Gouvernance $gouvernance,
        private readonly ScolariteClient $scolarite,
        private readonly Soldes $soldes,
        private readonly Parametres $parametres,
    ) {}

    /** GET /v1/mes-droits - ce que le profil peut faire (le front n'affiche que ce qui est autorisé). */
    public function droits(): JsonResponse
    {
        $p = $this->parametres->lire();

        return $this->ok([
            'role' => Contexte::role(),
            'actions' => $this->gouvernance->mesActions(),
            'administrateur' => Contexte::role() === Gouvernance::ADMINISTRATEUR,
            'famille' => in_array(Contexte::role(), ['apprenant', 'parent'], true),
            'devise' => $p['devise'],
            'double_validation_reglements' => $p['double_validation_reglements'],
        ]);
    }

    /** GET /v1/mes-finances - pour chaque apprenant rattaché au compte : solde et factures. */
    public function famille(): JsonResponse
    {
        if (! in_array(Contexte::role(), ['apprenant', 'parent'], true)) {
            return $this->ok([]);
        }
        $apprenants = $this->scolarite->apprenantsDuCompte(Contexte::utilisateurUuid(), Contexte::role() === 'parent');

        return $this->ok(array_map(fn ($a) => [
            'apprenant' => [
                'uuid' => $a['uuid'],
                'nom' => $a['nom'] ?? null,
                'prenom' => $a['prenom'] ?? null,
                'matricule' => $a['matricule'] ?? null,
                'classe' => $a['classe']['nom'] ?? null,
            ],
            'solde' => $this->soldes->apprenant($a['uuid']),
            'factures' => array_map(fn ($f) => [
                'uuid' => $f->uuid,
                'numero' => $f->numero,
                'libelle' => $f->libelle,
                'annee_scolaire' => $f->annee_scolaire,
                'montant_total' => (int) $f->montant_total,
                'montant_regle' => (int) $f->montant_regle,
                'reste_a_payer' => (int) $f->montant_total - (int) $f->montant_regle,
                'statut' => $f->statut,
                'prochaine_echeance' => $f->prochaine_echeance,
            ], $this->soldes->factures($a['uuid'])),
        ], $apprenants));
    }
}
