<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RhClient;
use App\Models\Evaluation;
use App\Models\Matiere;
use App\Models\Periode;
use Illuminate\Validation\ValidationException;

/** Création des évaluations (CDC §6) et verrouillage de saisie par l'enseignant (CDC §8.1). */
class EvaluationService
{
    public function __construct(
        private readonly RhClient $rh,
        private readonly ControleAcces $acces,
    ) {}

    public function creer(array $d): Evaluation
    {
        $periode = Periode::where('uuid', $d['periode_uuid'])->first()
            ?? throw ValidationException::withMessages(['periode_uuid' => 'Période introuvable.']);
        $matiere = Matiere::where('uuid', $d['matiere_uuid'])->where('active', true)->first()
            ?? throw ValidationException::withMessages(['matiere_uuid' => 'Matière introuvable ou inactive.']);

        if (! $periode->estOuverte()) {
            throw MetierException::conflit('Impossible de créer une évaluation sur une période clôturée.', 'PERIODE_CLOTUREE');
        }

        $date = $d['date_evaluation'];
        if ($date < $periode->date_debut->toDateString() || $date > $periode->date_fin->toDateString()) {
            throw ValidationException::withMessages(['date_evaluation' => 'La date doit être comprise dans la période ('.$periode->date_debut->format('d/m/Y').' – '.$periode->date_fin->format('d/m/Y').').']);
        }

        // L'enseignant crée pour lui-même ; l'administrateur désigne l'enseignant responsable.
        $enseignant = Contexte::role() === 'enseignant' ? Contexte::utilisateurUuid() : ($d['enseignant_uuid'] ?? null);
        if ($enseignant === null) {
            throw ValidationException::withMessages(['enseignant_uuid' => "L'enseignant responsable est obligatoire."]);
        }
        if (! $this->rh->estAffecte($enseignant, $matiere->uuid, $d['classe_uuid'])) {
            throw MetierException::accesRefuse("L'enseignant n'est pas affecté à cette matière dans cette classe.");
        }

        $rattrapageDe = null;
        if (! empty($d['rattrapage_de_uuid'])) {
            $rattrapageDe = Evaluation::where('uuid', $d['rattrapage_de_uuid'])->first();
            if ($rattrapageDe === null || $rattrapageDe->periode_id !== $periode->id
                || $rattrapageDe->matiere_id !== $matiere->id || $rattrapageDe->classe_uuid !== $d['classe_uuid']
                || $rattrapageDe->rattrapage_de_id !== null) {
                throw ValidationException::withMessages(['rattrapage_de_uuid' => "L'épreuve rattrapée doit être une épreuve initiale de la même classe, matière et période."]);
            }
        }

        $evaluation = new Evaluation([
            'classe_uuid' => $d['classe_uuid'],
            'enseignant_uuid' => $enseignant,
            'type' => $d['type'],
            'libelle' => $d['libelle'],
            'date_evaluation' => $date,
            'coefficient' => (string) ($d['coefficient'] ?? '1'),
            'note_sur' => (string) ($d['note_sur'] ?? '20'),
            'cree_par_uuid' => Contexte::utilisateurUuid(),
        ]);
        $evaluation->periode_id = $periode->id;
        $evaluation->matiere_id = $matiere->id;
        $evaluation->rattrapage_de_id = $rattrapageDe?->id;
        $evaluation->save();

        return $evaluation->load('periode', 'matiere');
    }

    public function verrouillerSaisie(Evaluation $evaluation): Evaluation
    {
        $evaluation->loadMissing('matiere');
        $this->acces->enseignantDeLEvaluation($evaluation->enseignant_uuid, $evaluation->matiere->uuid, $evaluation->classe_uuid);

        if ($evaluation->saisie_cloturee_le === null) {
            $evaluation->saisie_cloturee_le = now();
            $evaluation->save();
        }

        return $evaluation;
    }
}
