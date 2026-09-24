<?php

namespace App\Presences;

use App\Alertes\AlerteAbsenceService;
use App\Common\AuditLogger;
use App\Common\TenantContext;
use App\Events\AbsenceDeclaree;
use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Models\Presence;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Orchestration de l'enregistrement, de la consultation et de la correction
 * des presences (section 7.1 du CDC : PresenceService).
 *
 * Chaque absence enregistree declenche : la notification du parent via le
 * microservice Communication (AbsenceDeclaree) et l'agregation continue des
 * absences sur la periode glissante (AlerteAbsenceService).
 */
class PresenceService
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
        private readonly RhClient $rh,
        private readonly AlerteAbsenceService $alertes,
    ) {}

    /**
     * POST /presences — enregistre les presences/absences d'un cours pour
     * l'ensemble d'une classe.
     *
     * @param  array{cours_uuid: string, date: string, apprenants: array<int, array{uuid: string, statut: string}>}  $payload
     * @return array<int, array<string, mixed>>
     */
    public function enregistrerCours(int $tenantId, array $payload): array
    {
        $cours = $this->scolarite->coursParUuid($tenantId, $payload['cours_uuid']);
        if (! $cours) {
            throw new UnprocessableEntityHttpException('Cours introuvable dans le schéma scolarité.');
        }

        $apprenants = [];
        foreach ($payload['apprenants'] as $item) {
            $apprenant = $this->scolarite->apprenantParUuid($tenantId, $item['uuid']);
            if (! $apprenant) {
                throw new UnprocessableEntityHttpException(
                    "Apprenant introuvable dans le schéma scolarité : {$item['uuid']}."
                );
            }
            $apprenants[] = [
                'apprenant' => $apprenant,
                'uuid' => $item['uuid'],
                'statut' => $item['statut'],
            ];
        }

        return DB::transaction(function () use ($tenantId, $cours, $payload, $apprenants): array {
            $crees = [];
            $absents = [];

            foreach ($apprenants as $item) {
                $presence = Presence::create([
                    'tenant_id' => $tenantId,
                    'apprenant_id' => (int) $item['apprenant']->id,
                    'cours_id' => (int) $cours->id,
                    'statut' => $item['statut'],
                    'date' => $payload['date'],
                ]);

                $crees[] = [
                    'uuid' => $presence->uuid,
                    'statut' => $presence->statut,
                    'date' => $presence->date->toDateString(),
                    'apprenant_uuid' => $item['uuid'],
                    'cours_uuid' => $payload['cours_uuid'],
                ];

                if ($presence->estAbsence()) {
                    $absents[] = $presence;
                }
            }

            foreach ($absents as $presence) {
                event(AbsenceDeclaree::depuisPresence($presence));

                $this->alertes->verifierEtAlerter($tenantId, $presence->apprenant_id);
            }

            return $crees;
        });
    }

    /**
     * GET /presences — liste filtrable par classe, apprenant, cours, statut
     * ou periode. Chaque element n'expose que des uuid.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function liste(int $tenantId, array $filters): array
    {
        $query = Presence::query();

        if (! empty($filters['statut'])) {
            $query->where('statut', $filters['statut']);
        }

        if (! empty($filters['date'])) {
            $query->whereDate('date', $filters['date']);
        } else {
            if (! empty($filters['date_from'])) {
                $query->whereDate('date', '>=', $filters['date_from']);
            }
            if (! empty($filters['date_to'])) {
                $query->whereDate('date', '<=', $filters['date_to']);
            }
        }

        if (! empty($filters['cours_uuid'])) {
            $cours = $this->scolarite->coursParUuid($tenantId, $filters['cours_uuid']);
            if (! $cours) {
                return [];
            }
            $query->where('cours_id', $cours->id);
        }

        if (! empty($filters['apprenant_uuid'])) {
            $apprenant = $this->scolarite->apprenantParUuid($tenantId, $filters['apprenant_uuid']);
            if (! $apprenant) {
                return [];
            }
            $query->where('apprenant_id', $apprenant->id);
        }

        if (! empty($filters['classe_uuid'])) {
            $ids = $this->scolarite->apprenantIdsParClasseUuid($tenantId, $filters['classe_uuid']);
            if ($ids === []) {
                return [];
            }
            $query->whereIn('apprenant_id', $ids);
        }

        return $query
            ->orderBy('date', 'desc')
            ->limit((int) ($filters['limit'] ?? 100))
            ->get()
            ->map(fn (Presence $presence) => $this->serialiser($tenantId, $presence))
            ->values()
            ->all();
    }

    /**
     * PUT /presences/{uuid} — correction d'une presence deja enregistree.
     *
     * Regle (section 9) : l'enseignant ne peut corriger que le jour meme ;
     * au-dela, seuls le censeur ou l'administrateur corrigent. Toute
     * correction est journalisee dans audit_log (auteur + motif).
     *
     * @return array<string, mixed>
     */
    public function corriger(int $tenantId, string $uuid, string $statut, ?string $motif): array
    {
        $presence = $this->presenceParUuid($tenantId, $uuid);
        if (! $presence) {
            throw new NotFoundHttpException('Présence introuvable.');
        }

        $role = TenantContext::role();
        if ($role === 'enseignant') {
            $this->verifierFenetreCorrectionEnseignant($presence);
        } elseif (! in_array($role, ['censeur', 'administrateur'], true)) {
            abort(403, 'Seuls le censeur ou l\'administrateur peuvent corriger une présence.');
        }

        $avant = [
            'statut' => $presence->statut,
        ];

        $presence->statut = $statut;
        $presence->motif_correction = $motif;
        $presence->corrige_par_id = $this->rh->personnelIdPourUserUuid($tenantId, TenantContext::userId());
        $presence->corrige_le = now();
        $presence->save();

        AuditLogger::journalise(
            action: AuditLogger::ACTION_PRESENCE_CORRIGEE,
            entite: 'presences',
            entiteUuid: $presence->uuid,
            avant: $avant,
            apres: ['statut' => $statut],
            motif: $motif,
        );

        return $this->serialiser($tenantId, $presence);
    }

    /**
     * GET /apprenants/{uuid}/absences/synthese — total d'absences sur la
     * periode glissante configuree.
     *
     * @return array<string, mixed>
     */
    public function syntheseAbsences(int $tenantId, string $apprenantUuid): array
    {
        $apprenant = $this->scolarite->apprenantParUuid($tenantId, $apprenantUuid);
        if (! $apprenant) {
            throw new NotFoundHttpException('Apprenant introuvable dans le schéma scolarité.');
        }

        $periode = (int) config('vie-scolaire.absences.periode_glissante_jours', 30);
        $seuil = $this->alertes->seuilPourTenant($tenantId);
        $depuis = now()->subDays($periode)->startOfDay();

        $totalAbsences = Presence::where('apprenant_id', $apprenant->id)
            ->where('statut', 'absent')
            ->whereDate('date', '>=', $depuis)
            ->count();

        return [
            'apprenant_uuid' => $apprenantUuid,
            'periode_glissante_jours' => $periode,
            'total_absences' => $totalAbsences,
            'total_retards' => Presence::where('apprenant_id', $apprenant->id)
                ->where('statut', 'retard')
                ->whereDate('date', '>=', $depuis)
                ->count(),
            'total_presences' => Presence::where('apprenant_id', $apprenant->id)
                ->where('statut', 'present')
                ->whereDate('date', '>=', $depuis)
                ->count(),
            'seuil' => $seuil,
            'seuil_depasse' => $totalAbsences >= $seuil,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialiser(int $tenantId, Presence $presence): array
    {
        return [
            'uuid' => $presence->uuid,
            'statut' => $presence->statut,
            'date' => $presence->date->toDateString(),
            'apprenant_uuid' => $this->scolarite->apprenantParId($tenantId, $presence->apprenant_id)?->uuid,
            'cours_uuid' => $this->scolarite->coursParId($tenantId, $presence->cours_id)?->uuid,
            'corrige_le' => $presence->corrige_le?->toIso8601String(),
        ];
    }

    private function presenceParUuid(int $tenantId, string $uuid): ?Presence
    {
        return Presence::query()->where('uuid', $uuid)->first();
    }

    /**
     * Regle de correction enseignant : uniquement le jour meme (fenetre
     * exprimee en heures, section 9 / config vie-scolaire).
     */
    private function verifierFenetreCorrectionEnseignant(Presence $presence): void
    {
        $fenetre = (int) config('vie-scolaire.presences.fenetre_correction_enseignant_heures', 24);

        if (! $presence->date->isToday() || $presence->created_at->lte(now()->subHours($fenetre))) {
            abort(403, 'Correction hors fenêtre : réservée au censeur ou à l\'administrateur.');
        }
    }
}
