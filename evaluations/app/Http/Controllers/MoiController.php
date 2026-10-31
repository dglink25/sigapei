<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Models\Matiere;
use Illuminate\Http\JsonResponse;

/** Contexte de l'utilisateur connecté, pour construire son interface (aucune donnée d'un autre). */
class MoiController extends Controller
{
    /** GET /v1/mes-affectations - enseignant : ses classes et matières (source RH). */
    public function affectations(RhClient $rh): JsonResponse
    {
        $affectations = $rh->affectationsDe(Contexte::utilisateurUuid());
        $matieres = Matiere::whereIn('uuid', array_column($affectations, 'matiere_uuid'))->get(['uuid', 'code', 'nom'])->keyBy('uuid');

        return $this->ok(array_values(array_filter(array_map(fn ($a) => isset($matieres[$a['matiere_uuid']]) ? [
            'classe_uuid' => $a['classe_uuid'],
            'matiere' => ['uuid' => $a['matiere_uuid'], 'code' => $matieres[$a['matiere_uuid']]->code, 'nom' => $matieres[$a['matiere_uuid']]->nom],
        ] : null, $affectations))));
    }

    /** GET /v1/mes-apprenants - apprenant : son dossier ; parent : ses enfants rattachés (source Scolarité). */
    public function apprenants(ScolariteClient $scolarite): JsonResponse
    {
        $liste = $scolarite->apprenantsDuCompte(Contexte::utilisateurUuid(), Contexte::role() === 'parent');

        return $this->ok(array_map(fn ($a) => [
            'uuid' => $a['uuid'],
            'nom' => $a['nom'] ?? null,
            'prenom' => $a['prenom'] ?? null,
            'matricule' => $a['matricule'] ?? null,
            'classe' => isset($a['classe']['uuid']) ? [
                'uuid' => $a['classe']['uuid'], 'nom' => $a['classe']['nom'] ?? null, 'cycle' => $a['classe']['cycle'] ?? null,
            ] : null,
        ], $liste));
    }
}
