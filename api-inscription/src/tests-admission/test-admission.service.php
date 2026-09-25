<?php

namespace App\tests_admission;

use App\candidatures\CandidatureRepository;
use App\common\Services\AuditService;
use Exception;

class TestAdmissionService
{
    public function __construct(
        protected CandidatureRepository $candidatureRepository
    ) {}

    public function enregistrerTest(string $candidatureUuid, array $donnees): TestAdmission
    {
        $candidature = $this->candidatureRepository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        $test = TestAdmission::create([
            'tenant_id' => $candidature->tenant_id,
            'candidature_id' => $candidature->id,
            'type_test' => $donnees['type_test'],
            'matiere' => $donnees['matiere'] ?? null,
            'note' => $donnees['note'] ?? null,
            'note_max' => $donnees['note_max'] ?? 20.00,
            'resultat' => $donnees['resultat'] ?? 'en_attente',
            'observations' => $donnees['observations'] ?? null,
            'evalue_par_id' => $donnees['evalue_par_id'] ?? null,
            'date_test' => $donnees['date_test'] ?? now()->toDateString(),
        ]);

        AuditService::journaliser(
            'ENREGISTREMENT_TEST_ADMISSION',
            "Test {$test->type_test} pour candidature {$candidature->uuid} (Resultat: {$test->resultat})",
            ['note' => $test->note, 'note_max' => $test->note_max]
        );

        return $test;
    }
}
