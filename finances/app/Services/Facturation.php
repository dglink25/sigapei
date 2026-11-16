<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Integrations\ScolariteClient;
use App\Models\Echeance;
use App\Models\Facture;
use App\Models\FactureLigne;
use App\Models\FormuleTarifaire;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Émission et annulation des factures (CDC §5).
 *  - l'apprenant est lu en direct dans Scolarité (dossier actif) ; nom, matricule et classe sont figés sur la facture ;
 *  - lignes issues des formules tarifaires et/ou lignes libres ; échéances regroupées par date ;
 *  - une même formule n'est jamais facturée deux fois au même apprenant (facture non annulée) : l'émission par
 *    classe peut donc être relancée sans risque ;
 *  - annulation motivée, uniquement sans règlement (validé ou en attente) ni paiement en ligne en cours.
 */
class Facturation
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
        private readonly Journal $journal,
        private readonly Parametres $parametres,
        private readonly RabbitMqPublisher $evenements,
    ) {}

    /**
     * @param  array{apprenant_uuid: string, annee_scolaire: string, libelle?: ?string, formules?: list<string>, lignes?: list<array{libelle: string, nature: string, montant: int, date_echeance: string}>}  $d
     */
    public function emettre(array $d): Facture
    {
        $apprenant = $this->scolarite->apprenant($d['apprenant_uuid']);
        if ($apprenant === null || ($apprenant['statut'] ?? null) !== 'actif') {
            throw ValidationException::withMessages(['apprenant_uuid' => "Apprenant introuvable ou non actif dans l'établissement."]);
        }

        return $this->emettrePour($apprenant, $d['annee_scolaire'], $this->formules($d['formules'] ?? [], $d['annee_scolaire']), $d['lignes'] ?? [], $d['libelle'] ?? null);
    }

    /** Factures de toute une classe : une par apprenant actif ; ceux qui ont déjà ces formules sont ignorés. */
    public function emettrePourClasse(string $classeUuid, string $annee, array $formuleUuids, ?string $libelle): array
    {
        $formules = $this->formules($formuleUuids, $annee);
        if ($formules->isEmpty()) {
            throw ValidationException::withMessages(['formules' => 'Choisissez au moins une formule tarifaire.']);
        }

        $creees = [];
        $ignorees = [];
        foreach ($this->scolarite->apprenantsDeClasse($classeUuid) as $a) {
            $deja = $this->formulesDejaFacturees($a['uuid'], $formules->pluck('uuid')->all());
            $restantes = $formules->reject(fn ($f) => in_array($f->uuid, $deja, true));
            if ($restantes->isEmpty()) {
                $ignorees[] = ['apprenant_uuid' => $a['uuid'], 'nom' => $this->nom($a), 'raison' => 'Déjà facturé pour ces formules.'];

                continue;
            }
            $creees[] = $this->emettrePour($a, $annee, $restantes, [], $libelle);
        }

        return ['creees' => $creees, 'ignorees' => $ignorees];
    }

    public function annuler(Facture $f, string $motif): Facture
    {
        return DB::transaction(function () use ($f, $motif) {
            $f = Facture::whereKey($f->id)->lockForUpdate()->firstOrFail();
            if ($f->statut === 'annulee') {
                throw MetierException::conflit('Cette facture est déjà annulée.', 'DEJA_ANNULEE');
            }
            if ($f->montant_regle > 0 || $f->reglements()->where('statut', 'a_valider')->exists()) {
                throw MetierException::conflit('Une facture qui a reçu un règlement ne s\'annule pas : remboursez d\'abord le règlement.', 'FACTURE_REGLEE');
            }
            if (DB::table('finances.paiements_en_ligne')->where('facture_id', $f->id)->whereIn('statut', ['initie', 'en_attente'])->exists()) {
                throw MetierException::conflit('Un paiement en ligne est en cours sur cette facture : réessayez une fois qu\'il est terminé.', 'PAIEMENT_EN_COURS');
            }

            $f->forceFill(['statut' => 'annulee', 'motif_annulation' => $motif, 'annulee_par_uuid' => Contexte::utilisateurUuid(), 'annulee_le' => now()])->save();
            $this->journal->ecrire('facture.annulee', 'facture', $f->uuid, ['numero' => $f->numero, 'motif' => $motif]);
            $this->evenements->publier('finances.facture.annulee', ['etablissement_uuid' => $f->etablissement_uuid, 'facture_uuid' => $f->uuid, 'apprenant_uuid' => $f->apprenant_uuid]);

            return $f;
        });
    }

    // ------------------------------------------------------------------------------------------

    private function emettrePour(array $apprenant, string $annee, $formules, array $lignesLibres, ?string $libelle): Facture
    {
        if ($formules->isEmpty() && $lignesLibres === []) {
            throw ValidationException::withMessages(['lignes' => 'Une facture contient au moins une formule ou une ligne.']);
        }
        $deja = $this->formulesDejaFacturees($apprenant['uuid'], $formules->pluck('uuid')->all());
        if ($deja !== []) {
            throw MetierException::conflit('Ces frais sont déjà facturés à cet apprenant : '.$formules->whereIn('uuid', $deja)->pluck('libelle')->join(', ').'.', 'DEJA_FACTURE');
        }

        $lignes = [];
        $echeances = [];
        foreach ($formules as $f) {
            $lignes[] = ['libelle' => $f->libelle, 'nature' => $f->nature, 'formule_uuid' => $f->uuid, 'montant' => $f->montant];
            foreach ($f->echeancier as $e) {
                $echeances[$e['date_echeance']] = ($echeances[$e['date_echeance']] ?? 0) + (int) $e['montant'];
            }
        }
        foreach ($lignesLibres as $l) {
            $lignes[] = ['libelle' => trim($l['libelle']), 'nature' => $l['nature'], 'formule_uuid' => null, 'montant' => (int) $l['montant']];
            $echeances[$l['date_echeance']] = ($echeances[$l['date_echeance']] ?? 0) + (int) $l['montant'];
        }
        ksort($echeances);
        $total = array_sum(array_column($lignes, 'montant'));
        if ($total > 100_000_000_000) {
            throw ValidationException::withMessages(['lignes' => 'Montant total hors limite.']);
        }

        $facture = DB::transaction(function () use ($apprenant, $annee, $libelle, $lignes, $echeances, $total) {
            $f = new Facture([
                'numero' => $this->journal->numero('FA'),
                'apprenant_uuid' => $apprenant['uuid'],
                'apprenant_nom' => $this->nom($apprenant),
                'apprenant_matricule' => $apprenant['matricule'] ?? null,
                'classe_uuid' => $apprenant['classe']['uuid'] ?? null,
                'classe_nom' => $apprenant['classe']['nom'] ?? null,
                'annee_scolaire' => $annee,
                'libelle' => trim($libelle ?? '') ?: 'Frais '.$annee,
                'devise' => $this->parametres->lire()['devise'],
                'montant_total' => $total,
                'emise_par_uuid' => Contexte::utilisateurUuid(),
            ]);
            $f->save();

            foreach ($lignes as $i => $l) {
                (new FactureLigne($l + ['ordre' => $i + 1]))->forceFill(['facture_id' => $f->id])->save();
            }
            $rang = 0;
            foreach ($echeances as $date => $montant) {
                $rang++;
                (new Echeance(['rang' => $rang, 'libelle' => count($echeances) > 1 ? "Échéance {$rang}" : 'Échéance unique', 'date_echeance' => $date, 'montant' => $montant]))
                    ->forceFill(['facture_id' => $f->id])->save();
            }
            $this->journal->ecrire('facture.emise', 'facture', $f->uuid, ['numero' => $f->numero, 'montant' => $total]);

            return $f;
        });

        $this->evenements->publier('finances.facture.emise', [
            'etablissement_uuid' => $facture->etablissement_uuid, 'facture_uuid' => $facture->uuid, 'apprenant_uuid' => $facture->apprenant_uuid,
        ]);

        return $facture->fresh(['lignes', 'echeances']);
    }

    private function formules(array $uuids, string $annee)
    {
        $uuids = array_values(array_unique($uuids));
        $formules = FormuleTarifaire::whereIn('uuid', $uuids)->where('actif', true)->get();
        if ($formules->count() !== count($uuids)) {
            throw ValidationException::withMessages(['formules' => 'Une formule est introuvable ou désactivée.']);
        }
        if ($formules->contains(fn ($f) => $f->annee_scolaire !== $annee)) {
            throw ValidationException::withMessages(['formules' => "Toutes les formules doivent concerner l'année {$annee}."]);
        }

        return $formules;
    }

    /** @return list<string> */
    private function formulesDejaFacturees(string $apprenantUuid, array $formuleUuids): array
    {
        if ($formuleUuids === []) {
            return [];
        }

        return DB::table('finances.facture_lignes as l')
            ->join('finances.factures as f', 'f.id', '=', 'l.facture_id')
            ->where('f.etablissement_uuid', Contexte::etablissement())
            ->where('f.apprenant_uuid', $apprenantUuid)
            ->where('f.statut', '<>', 'annulee')
            ->whereIn('l.formule_uuid', $formuleUuids)
            ->distinct()->pluck('l.formule_uuid')->all();
    }

    private function nom(array $a): string
    {
        return trim(($a['nom'] ?? '').' '.($a['prenom'] ?? '')) ?: ($a['matricule'] ?? 'Apprenant');
    }
}
