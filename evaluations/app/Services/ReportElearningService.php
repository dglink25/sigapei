<?php

namespace App\Services;

use App\Exceptions\MetierException;
use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Models\Evaluation;
use App\Models\Matiere;
use App\Models\Note;
use App\Models\Periode;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

/**
 * Report des notes E-learning (devoir noté, tentative de quiz) dans evaluations.notes.
 *
 * Appelé par le microservice E-learning via /v1/interne (secret partagé + X-Tenant-Id), à la
 * demande explicite de l'enseignant : la note compte directement dans la moyenne (décision projet).
 *  - une épreuve « note_elearning » par devoir/quiz (activite_uuid), créée au premier report ;
 *  - une note par apprenant et par activité : un nouveau report met la note à jour tant que la
 *    période est ouverte (audit + version), ensuite 409 : seule l'administration corrige ;
 *  - mêmes garde-fous que la saisie manuelle : apprenant actif de la classe, enseignant affecté,
 *    matière d'Évaluations, période ouverte couvrant la date, valeur dans le barème.
 */
class ReportElearningService
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
        private readonly RhClient $rh,
        private readonly NoteService $notes,
        private readonly BulletinService $bulletins,
    ) {}

    /** @return array{note: Note, evaluation: Evaluation, creee: bool} */
    public function reporter(array $d): array
    {
        $apprenant = $this->scolarite->apprenant($d['apprenant_uuid']);
        if ($apprenant === null || ($apprenant['statut'] ?? null) !== 'actif' || ! isset($apprenant['classe']['uuid'], $apprenant['classe']['cycle'])) {
            throw ValidationException::withMessages(['apprenant_uuid' => "Apprenant introuvable ou non actif dans l'établissement."]);
        }
        $classeUuid = $apprenant['classe']['uuid'];
        $cycle = $apprenant['classe']['cycle'];

        $matiere = Matiere::where('uuid', $d['matiere_uuid'])->where('active', true)->first()
            ?? throw ValidationException::withMessages(['matiere_uuid' => "Matière inconnue d'Évaluations (utiliser l'uuid renvoyé par GET /v1/matieres)."]);

        if (! $this->rh->estAffecte($d['enseignant_uuid'], $matiere->uuid, $classeUuid)) {
            throw MetierException::accesRefuse("L'enseignant n'est pas affecté à cette matière dans la classe de l'apprenant.");
        }

        $evaluation = $this->epreuve($d, $matiere, $classeUuid, $cycle);

        if (! $evaluation->periode->estOuverte()) {
            throw MetierException::conflit('La période est clôturée : la note ne peut plus être reportée. Seule l\'administration peut la corriger.', 'PERIODE_CLOTUREE');
        }
        if ($evaluation->saisie_cloturee_le !== null) {
            throw MetierException::conflit('L\'enseignant a verrouillé la saisie de cette épreuve dans Évaluations.', 'SAISIE_VERROUILLEE');
        }

        $auteur = ['uuid' => $d['enseignant_uuid'], 'roleCode' => 'enseignant'];
        $resultat = $this->notes->reporterElearning(
            $evaluation,
            $d['apprenant_uuid'],
            $this->surBaremeEpreuve($d, $evaluation),
            $d['commentaire'] ?? null,
            $d['source_uuid'],
            $auteur,
        );

        $this->bulletins->invalider($evaluation->periode, $classeUuid);

        return $resultat + ['evaluation' => $evaluation];
    }

    /** Épreuve de l'activité : réutilisée si elle existe, sinon créée dans la période ouverte qui couvre la date. */
    private function epreuve(array $d, Matiere $matiere, string $classeUuid, string $cycle): Evaluation
    {
        $existante = Evaluation::with('periode')->where('activite_elearning_uuid', $d['activite_uuid'])->first();
        if ($existante !== null) {
            if ($existante->matiere_id !== $matiere->id || $existante->classe_uuid !== $classeUuid) {
                throw MetierException::conflit('Cette activité E-learning est déjà rattachée à une autre matière ou à une autre classe.', 'ACTIVITE_INCOHERENTE');
            }

            return $existante;
        }

        $periode = Periode::where('cycle', $cycle)
            ->whereDate('date_debut', '<=', $d['date'])
            ->whereDate('date_fin', '>=', $d['date'])
            ->orderByDesc('date_debut')
            ->first()
            ?? throw MetierException::conflit('Aucune période de notation ne couvre cette date pour le cycle de l\'apprenant.', 'PERIODE_INTROUVABLE');
        if (! $periode->estOuverte()) {
            throw MetierException::conflit('La période est clôturée : la note ne peut plus être reportée. Seule l\'administration peut la corriger.', 'PERIODE_CLOTUREE');
        }

        $evaluation = new Evaluation([
            'classe_uuid' => $classeUuid,
            'enseignant_uuid' => $d['enseignant_uuid'],
            'type' => 'note_elearning',
            'libelle' => mb_substr(($d['source'] === 'quiz' ? 'Quiz' : 'Devoir').' E-learning : '.$d['activite_libelle'], 0, 150),
            'date_evaluation' => $d['date'],
            'coefficient' => '1',
            'note_sur' => $d['note_sur'],
            'activite_elearning_uuid' => $d['activite_uuid'],
            'cree_par_uuid' => $d['enseignant_uuid'],
        ]);
        $evaluation->periode_id = $periode->id;
        $evaluation->matiere_id = $matiere->id;

        try {
            $evaluation->save();
        } catch (UniqueConstraintViolationException) {
            // Deux reports simultanés de la même activité : l'autre a créé l'épreuve, on la reprend.
            return Evaluation::with('periode')->where('activite_elearning_uuid', $d['activite_uuid'])->firstOrFail();
        }

        return $evaluation->setRelation('periode', $periode);
    }

    /** L'épreuve garde le barème de son premier report ; un autre barème est ramené dessus (2 décimales, demi vers le haut). */
    private function surBaremeEpreuve(array $d, Evaluation $evaluation): string
    {
        $noteSur = Decimal::versEchelle((string) $d['note_sur']);
        $bareme = Decimal::versEchelle((string) $evaluation->note_sur);
        if ($noteSur === $bareme) {
            return (string) $d['valeur'];
        }

        return Decimal::versTexte(Decimal::diviserArrondi(Decimal::versEchelle((string) $d['valeur']) * $bareme, $noteSur), 2);
    }
}
