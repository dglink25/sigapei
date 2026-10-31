<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Models\FormuleTarifaire;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Formules tarifaires (CDC §5) : frais par portée et par année, avec échéancier dont la somme est exactement
 * le montant de la formule. Portée : toute l'école (aucune), un cycle, un niveau (dans un cycle) ou une classe.
 * Une formule déjà facturée garde son montant et son échéancier (les factures émises sont figées, mais on évite
 * aussi toute divergence entre la formule affichée et ce qui a été facturé) : on la désactive et on en crée une autre.
 */
class Tarifs
{
    public function __construct(private readonly Journal $journal) {}

    public function creer(array $d): FormuleTarifaire
    {
        $this->verifierEcheancier($d['montant'], $d['echeancier']);
        $this->verifierPortee($d);

        return DB::transaction(function () use ($d) {
            $f = FormuleTarifaire::create([
                'code' => $d['code'],
                'libelle' => trim($d['libelle']),
                'nature' => $d['nature'],
                'annee_scolaire' => $d['annee_scolaire'],
                'cycle' => $d['cycle'] ?? null,
                'niveau' => $d['niveau'] ?? null,
                'classe_uuid' => $d['classe_uuid'] ?? null,
                'montant' => $d['montant'],
                'echeancier' => $this->normaliser($d['echeancier']),
                'actif' => $d['actif'] ?? true,
                'modifie_par_uuid' => Contexte::utilisateurUuid(),
            ]);
            $this->journal->ecrire('formule.creee', 'formule', $f->uuid, ['code' => $f->code, 'montant' => $f->montant]);

            return $f->fresh();
        });
    }

    public function modifier(FormuleTarifaire $f, array $d): FormuleTarifaire
    {
        $facturee = DB::table('finances.facture_lignes')->where('formule_uuid', $f->uuid)->exists();
        $financier = array_intersect_key($d, array_flip(['montant', 'echeancier', 'annee_scolaire', 'cycle', 'niveau', 'classe_uuid', 'nature']));
        if ($facturee && $financier !== []) {
            throw MetierException::conflit(
                'Cette formule a déjà été facturée : son montant, son échéancier et sa portée ne changent plus. Désactivez-la et créez-en une nouvelle.',
                'FORMULE_DEJA_FACTUREE',
            );
        }

        $nouveau = array_merge($f->only(['montant', 'echeancier', 'cycle', 'niveau', 'classe_uuid']), $d);
        $this->verifierEcheancier($nouveau['montant'], $nouveau['echeancier']);
        $this->verifierPortee($nouveau);

        return DB::transaction(function () use ($f, $d) {
            if (isset($d['echeancier'])) {
                $d['echeancier'] = $this->normaliser($d['echeancier']);
            }
            if (isset($d['libelle'])) {
                $d['libelle'] = trim($d['libelle']);
            }
            $f->fill(array_intersect_key($d, array_flip(['libelle', 'nature', 'annee_scolaire', 'cycle', 'niveau', 'classe_uuid', 'montant', 'echeancier', 'actif'])));
            $f->modifie_par_uuid = Contexte::utilisateurUuid();
            $f->save();
            $this->journal->ecrire('formule.modifiee', 'formule', $f->uuid, ['modifications' => $d]);

            return $f->fresh();
        });
    }

    /** Formules actives applicables à une classe d'apprenant (portée la plus large à la plus précise). */
    public function applicables(string $annee, array $classe): Collection
    {
        return FormuleTarifaire::where('annee_scolaire', $annee)->where('actif', true)
            ->where(function ($q) use ($classe) {
                $q->where(fn ($t) => $t->whereNull('cycle')->whereNull('niveau')->whereNull('classe_uuid'))
                    ->orWhere(fn ($t) => $t->where('cycle', $classe['cycle'] ?? '')->whereNull('niveau')->whereNull('classe_uuid'))
                    ->orWhere(fn ($t) => $t->where('cycle', $classe['cycle'] ?? '')->where('niveau', $classe['niveau'] ?? '')->whereNull('classe_uuid'))
                    ->orWhere('classe_uuid', $classe['uuid'] ?? '00000000-0000-0000-0000-000000000000');
            })
            ->orderBy('nature')->orderBy('libelle')->get();
    }

    private function verifierEcheancier(int $montant, array $echeancier): void
    {
        $total = array_sum(array_map(fn ($e) => (int) $e['montant'], $echeancier));
        if ($total !== $montant) {
            throw ValidationException::withMessages(['echeancier' => "La somme des échéances ({$total}) doit être égale au montant de la formule ({$montant})."]);
        }
        $dates = array_column($echeancier, 'date_echeance');
        if (count($dates) !== count(array_unique($dates))) {
            throw ValidationException::withMessages(['echeancier' => 'Deux échéances ne peuvent pas tomber le même jour.']);
        }
    }

    private function verifierPortee(array $d): void
    {
        if (! empty($d['niveau']) && empty($d['cycle'])) {
            throw ValidationException::withMessages(['cycle' => 'Précisez le cycle du niveau.']);
        }
        if (! empty($d['classe_uuid']) && (! empty($d['cycle']) || ! empty($d['niveau']))) {
            throw ValidationException::withMessages(['classe_uuid' => 'Une formule de classe ne précise ni cycle ni niveau.']);
        }
    }

    private function normaliser(array $echeancier): array
    {
        usort($echeancier, fn ($a, $b) => strcmp($a['date_echeance'], $b['date_echeance']));

        return array_values(array_map(fn ($e, $i) => [
            'libelle' => trim($e['libelle'] ?? '') ?: 'Échéance '.($i + 1),
            'date_echeance' => $e['date_echeance'],
            'montant' => (int) $e['montant'],
        ], $echeancier, array_keys($echeancier)));
    }
}
