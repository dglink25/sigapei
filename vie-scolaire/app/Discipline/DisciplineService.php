<?php

namespace App\Discipline;

use App\Common\AuditLogger;
use App\Common\TenantContext;
use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Models\IncidentDisciplinaire;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Gestion des incidents disciplinaires et de leurs sanctions (section 7.1
 * du CDC : DisciplineService).
 *
 * Regle de gestion (section 9) : un incident peut exister sans sanction ;
 * une sanction ne peut jamais exister sans incident associe — modelisee ici
 * comme un etat de l'incident.
 */
class DisciplineService
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
        private readonly RhClient $rh,
    ) {}

    /**
     * POST /incidents — signale un nouvel incident disciplinaire.
     *
     * @param  array{apprenant_uuid: string, type: string, description: string}  $data
     * @return array<string, mixed>
     */
    public function signaler(int $tenantId, array $data): array
    {
        $apprenant = $this->scolarite->apprenantParUuid($tenantId, $data['apprenant_uuid']);
        if (! $apprenant) {
            throw new UnprocessableEntityHttpException('Apprenant introuvable dans le schéma scolarité.');
        }

        $auteurId = $this->rh->personnelIdPourUserUuid($tenantId, TenantContext::userId());

        return DB::transaction(function () use ($tenantId, $data, $apprenant, $auteurId): array {
            $incident = IncidentDisciplinaire::create([
                'tenant_id' => $tenantId,
                'apprenant_id' => (int) $apprenant->id,
                'auteur_id' => $auteurId,
                'type' => $data['type'],
                'description' => $data['description'],
            ]);

            AuditLogger::journalise(
                action: AuditLogger::ACTION_INCIDENT_AJOUTE,
                entite: 'incidents_disciplinaires',
                entiteUuid: $incident->uuid,
                apres: [
                    'type' => $incident->type,
                    'apprenant_id' => $incident->apprenant_id,
                ],
            );

            return $this->serialiser($tenantId, $incident);
        });
    }

    /**
     * GET /incidents — liste filtrable par classe ou apprenant.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function liste(int $tenantId, array $filters): array
    {
        $query = IncidentDisciplinaire::query();

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
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
            ->orderBy('created_at', 'desc')
            ->limit((int) ($filters['limit'] ?? 100))
            ->get()
            ->map(fn (IncidentDisciplinaire $incident) => $this->serialiser($tenantId, $incident))
            ->values()
            ->all();
    }

    /**
     * POST /incidents/{uuid}/sanction — associe une sanction a un incident
     * existant.
     *
     * @return array<string, mixed>
     */
    public function appliquerSanction(int $tenantId, string $incidentUuid, string $sanction): array
    {
        $incident = IncidentDisciplinaire::query()->where('uuid', $incidentUuid)->first();
        if (! $incident) {
            throw new NotFoundHttpException('Incident introuvable.');
        }

        return DB::transaction(function () use ($tenantId, $incident, $sanction): array {
            $avant = ['sanction' => $incident->sanction];

            $incident->sanction = $sanction;
            $incident->sanction_appliquee_par_id = $this->rh->personnelIdPourUserUuid($tenantId, TenantContext::userId());
            $incident->sanction_appliquee_le = now();
            $incident->save();

            AuditLogger::journalise(
                action: AuditLogger::ACTION_SANCTION_APPLIQUEE,
                entite: 'incidents_disciplinaires',
                entiteUuid: $incident->uuid,
                avant: $avant,
                apres: ['sanction' => $sanction],
            );

            return $this->serialiser($tenantId, $incident);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function serialiser(int $tenantId, IncidentDisciplinaire $incident): array
    {
        return [
            'uuid' => $incident->uuid,
            'type' => $incident->type,
            'description' => $incident->description,
            'sanction' => $incident->sanction,
            'sanction_appliquee_le' => $incident->sanction_appliquee_le?->toIso8601String(),
            'apprenant_uuid' => $this->scolarite->apprenantParId($tenantId, $incident->apprenant_id)?->uuid,
            'cree_le' => $incident->created_at?->toIso8601String(),
        ];
    }
}
