<?php

namespace Tests\Feature;

use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Models\Presence;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\FakeRhClient;
use Tests\Support\FakeScolariteClient;
use Tests\TestCase;

/**
 * Base commune des tests Feature du microservice.
 *
 * Reproduit en SQLite locale les contrats externes du schema scolarite et
 * du schema rh (jointures reelles dans l'application, tables deja presentes
 * ici pour les tests) et remplace les clients d'integration par leurs fakes.
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->creerTablesExternes();

        $this->app->instance(
            ScolariteClient::class,
            new FakeScolariteClient,
        );
        $this->app->instance(
            RhClient::class,
            new FakeRhClient,
        );

        config([
            'vie-scolaire.absences.seuil_defaut' => 2,
            'vie-scolaire.absences.periode_glissante_jours' => 30,
            'vie-scolaire.presences.fenetre_correction_enseignant_heures' => 24,
        ]);
    }

    protected function creerTablesExternes(): void
    {
        Schema::create('scolarite_classes', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->unsignedBigInteger('tenant_id');
        });

        Schema::create('scolarite_apprenants', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('classe_id')->nullable();
        });

        Schema::create('scolarite_emplois_du_temps', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('classe_id')->nullable();
        });

        Schema::create('rh_personnel', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->unsignedBigInteger('tenant_id');
        });
    }

    protected function seedClasse(int $tenantId = 1, string $uuid = '11111111-0000-0000-0000-000000000001'): int
    {
        return DB::table('scolarite_classes')->insertGetId([
            'uuid' => $uuid,
            'tenant_id' => $tenantId,
        ]);
    }

    protected function seedApprenant(int $tenantId = 1, string $uuid = 'apprenant-1', ?int $classeId = null): int
    {
        return DB::table('scolarite_apprenants')->insertGetId([
            'uuid' => $uuid,
            'tenant_id' => $tenantId,
            'classe_id' => $classeId,
        ]);
    }

    protected function seedCours(int $tenantId = 1, string $uuid = 'cours-1', ?int $classeId = null): int
    {
        return DB::table('scolarite_emplois_du_temps')->insertGetId([
            'uuid' => $uuid,
            'tenant_id' => $tenantId,
            'classe_id' => $classeId,
        ]);
    }

    protected function seedPersonnel(int $tenantId = 1, string $uuid = '55555555-0000-0000-0000-000000000000'): int
    {
        return DB::table('rh_personnel')->insertGetId([
            'uuid' => $uuid,
            'tenant_id' => $tenantId,
        ]);
    }

    protected function creerPresence(int $tenantId, string $statut, mixed $date, int $creeIlYA = 0): Presence
    {
        $presence = Presence::create([
            'tenant_id' => $tenantId,
            'apprenant_id' => 1,
            'cours_id' => 1,
            'statut' => $statut,
            'date' => $date,
        ]);

        if ($creeIlYA > 0) {
            $presence->forceFill([
                'created_at' => now()->subHours($creeIlYA),
                'updated_at' => now()->subHours($creeIlYA),
            ])->save();
        }

        return $presence;
    }

    protected function headersTenant(int $tenantId = 1, string $role = 'enseignant', ?string $userUuid = '55555555-0000-0000-0000-000000000000'): array
    {
        return [
            'X-Tenant-Id' => (string) $tenantId,
            'X-User-Id' => $userUuid,
            'X-User-Role' => $role,
            'Accept' => 'application/json',
        ];
    }
}
