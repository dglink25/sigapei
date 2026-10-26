<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Base des tests d'API : vraie base PostgreSQL (contraintes et index partiels compris).
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected const TENANT = 1;

    protected const SECRET = 'secret-de-test-interne-0123456789abcdef';

    protected string $admin;

    protected string $staff;

    protected function beforeRefreshingDatabase()
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS rh');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = (string) Str::uuid();
        $this->staff = (string) Str::uuid();
    }

    /** @param array<string, mixed> $entetes */
    protected function api(string $methode, string $uri, array $donnees = [], array $entetes = []): TestResponse
    {
        return $this->json($methode, $uri, $donnees, array_merge([
            'X-Internal-Secret' => self::SECRET,
            'X-Tenant-Id' => (string) self::TENANT,
            'X-User-Id' => $this->admin,
            'X-User-Role' => 'administrateur',
        ], $entetes));
    }

    /** @param array<string, mixed> $query */
    protected function interne(string $uri, array $query = []): TestResponse
    {
        return $this->get($uri.'?'.http_build_query($query), [
            'X-Internal-Secret' => self::SECRET,
            'Accept' => 'application/json',
        ]);
    }

    /** @param array<string, mixed> $champs */
    protected function creerPersonnel(array $champs = [], int $tenant = self::TENANT): string
    {
        $uuid = (string) Str::uuid();
        DB::table('personnel')->insert(array_merge([
            'uuid' => $uuid,
            'tenant_id' => $tenant,
            'matricule' => 'M-'.substr($uuid, 0, 8),
            'nom' => 'NOM',
            'prenom' => 'Prenom',
            'type_personnel' => 'enseignant',
            'statut' => 'actif',
            'actif' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], $champs));

        return $uuid;
    }
}
