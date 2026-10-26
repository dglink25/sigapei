<?php

namespace App\Http\Controllers;

use App\Common\Responses\ApiResponse;
use App\Common\Tenant\Contexte;
use App\Models\Affectation;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Endpoints internes (X-Internal-Secret), jamais exposés aux clients finaux.
 * Consommés par E-learning, Évaluations et Vie scolaire (règle 1 : aucune
 * jointure SQL inter-schémas ; ces lectures passent par l'API interne + secret).
 *
 * Le tenant est fourni par le paramètre `tenant_id` (ces appels ne passent pas
 * par la passerelle utilisateur) ; le contexte est posé avant toute lecture pour
 * garantir le filtrage fail-closed du modèle.
 */
class InterneController extends Controller
{
    /**
     * GET /v1/interne/personnel?tenant_id=&uuid= | ?tenant_id=&id=
     * Identité du personnel (résolution d'un compte Identité ou d'une clé externe).
     */
    public function personnel(Request $request): JsonResponse
    {
        $tenantId = $this->tenantValide($request);
        if ($tenantId === null) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $uuid = $request->query('uuid');
        if ($uuid !== null && ! Str::isUuid((string) $uuid)) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }
        $id = $request->query('id');

        if ($uuid === null && $id === null) {
            return ApiResponse::erreur('Paramètres invalides : uuid ou id requis.', 'PARAMETRES_INVALIDES', 422);
        }

        $personnel = Contexte::executerPour($tenantId, function () use ($uuid, $id) {
            return Personnel::query()
                ->when($uuid !== null, fn ($q) => $q->where('uuid', $uuid))
                ->when($uuid === null && $id !== null, fn ($q) => $q->where('id', (int) $id))
                ->first();
        });

        return ApiResponse::succes($personnel === null ? null : $this->serialiserPersonnel($personnel));
    }

    /**
     * GET /v1/interne/personnel/utilisateur/{utilisateur_uuid}?tenant_id=
     * Résout le membre du personnel rattaché à un compte Identité.
     */
    public function personnelParUtilisateur(Request $request, string $utilisateurUuid): JsonResponse
    {
        $tenantId = $this->tenantValide($request);
        if ($tenantId === null || ! Str::isUuid($utilisateurUuid)) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $personnel = Contexte::executerPour($tenantId, fn () => Personnel::query()
            ->where('utilisateur_uuid', $utilisateurUuid)->first());

        return ApiResponse::succes($personnel === null ? null : $this->serialiserPersonnel($personnel));
    }

    /**
     * GET /v1/interne/affectations?tenant_id=&enseignant_uuid=&matiere_uuid=&classe_uuid=&annee_scolaire=
     * Renvoie les affectations actives correspondant aux filtres fournis.
     */
    public function affectations(Request $request): JsonResponse
    {
        $tenantId = $this->tenantValide($request);
        if ($tenantId === null) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $enseignantUuid = $request->query('enseignant_uuid');
        $matiereUuid = $request->query('matiere_uuid');
        $classeUuid = $request->query('classe_uuid');
        $annee = $request->query('annee_scolaire');

        foreach ([$enseignantUuid, $matiereUuid, $classeUuid] as $u) {
            if ($u !== null && ! Str::isUuid((string) $u)) {
                return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
            }
        }

        $affectations = Contexte::executerPour($tenantId, fn () => Affectation::query()
            ->with('personnel')
            ->where('statut', 'actif')
            ->when($enseignantUuid !== null, fn ($q) => $q->whereHas('personnel', fn ($s) => $s->where('uuid', $enseignantUuid)))
            ->when($matiereUuid !== null, fn ($q) => $q->where('matiere_uuid', $matiereUuid))
            ->when($classeUuid !== null, fn ($q) => $q->where('classe_uuid', $classeUuid))
            ->when($annee !== null, fn ($q) => $q->where('annee_scolaire', $annee))
            ->get()
            ->map(fn (Affectation $a) => $this->serialiserAffectation($a))
            ->values());

        return ApiResponse::succes($affectations);
    }

    /**
     * GET /v1/interne/affectations/verifier?tenant_id=&enseignant_uuid=&matiere_uuid=&classe_uuid=
     * Réponse booléenne directe, utilisée par E-learning (DroitsService) et Évaluations (RhClient).
     */
    public function verifierAffectation(Request $request): JsonResponse
    {
        $tenantId = $this->tenantValide($request);
        $enseignantUuid = (string) $request->query('enseignant_uuid', '');
        $matiereUuid = (string) $request->query('matiere_uuid', '');
        $classeUuid = (string) $request->query('classe_uuid', '');

        if ($tenantId === null || ! Str::isUuid($enseignantUuid) || ! Str::isUuid($matiereUuid) || ! Str::isUuid($classeUuid)) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $affecte = Contexte::executerPour($tenantId, fn () => Affectation::query()
            ->where('matiere_uuid', $matiereUuid)
            ->where('classe_uuid', $classeUuid)
            ->where('statut', 'actif')
            ->whereHas('personnel', fn ($s) => $s->where('uuid', $enseignantUuid))
            ->exists());

        return ApiResponse::succes([
            'enseignant_uuid' => $enseignantUuid,
            'matiere_uuid' => $matiereUuid,
            'classe_uuid' => $classeUuid,
            'affecte' => $affecte,
        ]);
    }

    private function tenantValide(Request $request): ?int
    {
        $tenant = (string) $request->query('tenant_id', $request->header('X-Tenant-Id', ''));
        if ($tenant === '' || ! ctype_digit($tenant) || (int) $tenant < 1) {
            return null;
        }

        return (int) $tenant;
    }

    /** @return array<string, mixed> */
    private function serialiserPersonnel(Personnel $p): array
    {
        return [
            'id' => $p->id,
            'uuid' => $p->uuid,
            'tenant_id' => $p->tenant_id,
            'utilisateur_uuid' => $p->utilisateur_uuid,
            'matricule' => $p->matricule,
            'nom' => $p->nom,
            'prenom' => $p->prenom,
            'nom_complet' => $p->nomComplet(),
            'email' => $p->email,
            'telephone' => $p->telephone,
            'type_personnel' => $p->type_personnel,
            'fonction' => $p->fonction,
            'statut' => $p->statut,
            'actif' => $p->actif,
        ];
    }

    /** @return array<string, mixed> */
    private function serialiserAffectation(Affectation $a): array
    {
        return [
            'id' => $a->id,
            'uuid' => $a->uuid,
            'personnel_id' => $a->personnel_id,
            'enseignant_uuid' => $a->personnel?->uuid,
            'matiere_uuid' => $a->matiere_uuid,
            'classe_uuid' => $a->classe_uuid,
            'annee_scolaire' => $a->annee_scolaire,
            'heures_semaine' => $a->heures_semaine,
            'statut' => $a->statut,
        ];
    }
}
