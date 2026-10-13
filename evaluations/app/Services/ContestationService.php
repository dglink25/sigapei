<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\ContestationNote;
use App\Models\Note;
use App\Models\ParametresNotation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Contestations (CDC §9) : ouverte par l'apprenant ou un parent rattaché, traitée par l'enseignant
 * de l'évaluation, escaladée à l'administration après le délai paramétré. Une contestation résolue
 * ne modifie jamais la note d'elle-même : la correction passe par PUT /notes/{uuid}/corriger (tracée).
 */
class ContestationService
{
    private const TRANSITIONS = [
        'ouverte' => ['en_examen', 'resolue', 'rejetee'],
        'en_examen' => ['resolue', 'rejetee'],
    ];

    public function __construct(
        private readonly ControleAcces $acces,
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function ouvrir(string $noteUuid, string $motif): ContestationNote
    {
        $note = Note::with('evaluation')->where('uuid', $noteUuid)->first()
            ?? throw MetierException::introuvable('Note introuvable.');

        $this->acces->lectureApprenant($note->apprenant_uuid);

        try {
            $contestation = DB::transaction(function () use ($note, $motif) {
                $c = new ContestationNote([
                    'demandeur_uuid' => Contexte::utilisateurUuid(),
                    'demandeur_role' => Contexte::role(),
                    'motif' => trim($motif),
                    'ouverte_le' => now(),
                ]);
                $c->note_id = $note->id;
                $c->save();

                $this->publisher->publier('evaluations.contestation.ouverte', [
                    'tenant_id' => Contexte::tenantId(),
                    'contestation_uuid' => $c->uuid,
                    'enseignant_uuid' => $note->evaluation->enseignant_uuid,
                    'apprenant_uuid' => $note->apprenant_uuid,
                ]);

                return $c;
            });
        } catch (UniqueConstraintViolationException) {
            throw MetierException::conflit('Une contestation est déjà en cours pour cette note.', 'CONTESTATION_EN_COURS');
        }

        return $contestation->fresh();
    }

    public function traiter(ContestationNote $contestation, string $statut, ?string $reponse): ContestationNote
    {
        $contestation->loadMissing('note.evaluation.matiere');
        $evaluation = $contestation->note->evaluation;

        if (Contexte::role() === 'enseignant') {
            $this->acces->enseignantDeLEvaluation($evaluation->enseignant_uuid, $evaluation->matiere->uuid, $evaluation->classe_uuid);
        }

        if (! in_array($statut, self::TRANSITIONS[$contestation->statut] ?? [], true)) {
            throw MetierException::conflit("Passage de « {$contestation->statut} » à « {$statut} » impossible.", 'TRANSITION_INTERDITE');
        }
        if (in_array($statut, ['resolue', 'rejetee'], true) && trim((string) $reponse) === '') {
            throw MetierException::conflit('Une réponse motivée est obligatoire pour clore une contestation.', 'REPONSE_OBLIGATOIRE');
        }

        $contestation->statut = $statut;
        $contestation->reponse = $reponse !== null ? trim($reponse) : $contestation->reponse;
        $contestation->traitee_par_uuid = Contexte::utilisateurUuid();
        if (in_array($statut, ['resolue', 'rejetee'], true)) {
            $contestation->cloturee_le = now();
        }

        DB::transaction(function () use ($contestation) {
            $contestation->save();
            $this->publisher->publier('evaluations.contestation.traitee', [
                'tenant_id' => Contexte::tenantId(),
                'contestation_uuid' => $contestation->uuid,
                'statut' => $contestation->statut,
                'demandeur_uuid' => $contestation->demandeur_uuid,
            ]);
        });

        return $contestation;
    }

    /** Escalade automatique (commande planifiée) : contestations sans réponse après le délai du cycle. */
    public function escaladerEnRetard(): int
    {
        $delais = ParametresNotation::pluck('delai_escalade_contestation_jours', 'cycle');
        $delaiMin = $delais->min() ?? 7;

        $candidates = ContestationNote::with('note.evaluation.periode')
            ->whereIn('statut', ['ouverte', 'en_examen'])
            ->whereNull('escaladee_le')
            ->where('ouverte_le', '<=', now()->subDays($delaiMin))
            ->get();

        $n = 0;
        foreach ($candidates as $c) {
            $delai = (int) ($delais[$c->note->evaluation->periode->cycle] ?? 7);
            if ($c->ouverte_le->gt(now()->subDays($delai))) {
                continue;
            }
            DB::transaction(function () use ($c) {
                $c->escaladee_le = now();
                $c->save();
                $this->publisher->publier('evaluations.contestation.escaladee', [
                    'tenant_id' => Contexte::tenantId(),
                    'contestation_uuid' => $c->uuid,
                ]);
            });
            $n++;
        }

        return $n;
    }
}
