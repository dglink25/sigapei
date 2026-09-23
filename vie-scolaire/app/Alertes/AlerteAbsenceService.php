<?php

namespace App\Alertes;

use App\Events\AlerteAbsencesDeclenchee;
use App\Integrations\ScolariteClient;
use App\Models\Presence;
use Illuminate\Support\Collection;

/**
 * Agregation continue des absences et declenchement des alertes au censeur
 * (section 7.1 du CDC : AlerteAbsenceService).
 *
 * Le seuil est configurable au niveau de l'etablissement (valeur par defaut
 * configurable au niveau plateforme) et ne peut etre desactive, seulement
 * ajuste (section 9). Aucun compteur duplique : la detection repose sur
 * l'agregation des donnees de presences existantes sur la periode glissante.
 */
class AlerteAbsenceService
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
    ) {}

    public function seuilPourTenant(int $tenantId): int
    {
        return (int) config('vie-scolaire.absences.seuil_defaut', 4);
    }

    public function periodeGlissante(int $tenantId): int
    {
        return (int) config('vie-scolaire.absences.periode_glissante_jours', 30);
    }

    /**
     * GET /interne/alertes-absences — apprenants ayant depasse le seuil
     * d'absences sur la periode glissante, consomme par le back-office du
     * censeur.
     *
     * @return array<int, array<string, mixed>>
     */
    public function apprenantsEnAlerte(int $tenantId): array
    {
        $seuil = $this->seuilPourTenant($tenantId);
        $periode = $this->periodeGlissante($tenantId);

        $depasse = $this->totauxParApprenant($tenantId)
            ->filter(fn (object $row) => (int) $row->total_absences >= $seuil);

        return $depasse
            ->map(fn (object $row) => [
                'apprenant_uuid' => $this->scolarite->apprenantParId($tenantId, (int) $row->apprenant_id)?->uuid,
                'total_absences' => (int) $row->total_absences,
                'seuil' => $seuil,
                'periode_jours' => $periode,
            ])
            ->values()
            ->all();
    }

    /**
     * Recalcule l'agregation pour un apprenant apres un enregistrement
     * d'absence et emet l'alerte au censeur si le seuil est franchi.
     */
    public function verifierEtAlerter(int $tenantId, int $apprenantId): void
    {
        $totaux = Presence::query()
            ->selectRaw('apprenant_id, count(*) as total_absences')
            ->where('tenant_id', $tenantId)
            ->where('apprenant_id', $apprenantId)
            ->where('statut', 'absent')
            ->whereDate('date', '>=', now()->subDays($this->periodeGlissante($tenantId))->startOfDay())
            ->groupBy('apprenant_id')
            ->first();

        $total = (int) ($totaux?->total_absences ?? 0);
        $seuil = $this->seuilPourTenant($tenantId);

        if ($total >= $seuil) {
            event(new AlerteAbsencesDeclenchee(
                tenantId: $tenantId,
                apprenantId: $apprenantId,
                totalAbsences: $total,
                seuil: $seuil,
                periodeJours: $this->periodeGlissante($tenantId),
            ));
        }
    }

    private function totauxParApprenant(int $tenantId): Collection
    {
        return Presence::query()
            ->selectRaw('apprenant_id, count(*) as total_absences')
            ->where('tenant_id', $tenantId)
            ->where('statut', 'absent')
            ->whereDate('date', '>=', now()->subDays($this->periodeGlissante($tenantId))->startOfDay())
            ->groupBy('apprenant_id')
            ->get();
    }
}
