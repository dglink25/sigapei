<?php

namespace App\Http\Controllers;

use App\Common\Responses\ApiResponse;
use App\Common\Tenant\Contexte;
use App\Models\Bulletin;
use App\Models\Periode;
use App\Services\ReportElearningService;
use App\Support\Decimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Endpoints internes (X-Internal-Secret), jamais exposés aux clients finaux. */
class InterneController extends Controller
{
    /**
     * GET /v1/interne/eligibilite-document/{apprenant_uuid} - consommé par Demandes administratives (CDC §17.5).
     * En-tête X-Tenant-Id obligatoire. Renvoie les bulletins archivés disponibles (dernière version par période).
     */
    public function eligibiliteDocument(Request $request, string $apprenantUuid): JsonResponse
    {
        $tenant = (string) $request->header('X-Tenant-Id', '');
        if (! ctype_digit($tenant) || (int) $tenant < 1 || ! Str::isUuid($apprenantUuid)) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $bulletins = Contexte::executerPour((int) $tenant, function () use ($apprenantUuid) {
            $derniers = Bulletin::query()
                ->selectRaw('DISTINCT ON (periode_id) *')
                ->where('apprenant_uuid', $apprenantUuid)
                ->orderBy('periode_id')->orderByDesc('version')
                ->get();
            $periodes = Periode::whereIn('id', $derniers->pluck('periode_id'))->get()->keyBy('id');

            return $derniers->map(fn ($b) => [
                'bulletin_uuid' => $b->uuid,
                'periode_uuid' => $periodes[$b->periode_id]->uuid,
                'periode' => $periodes[$b->periode_id]->libelle,
                'annee_scolaire' => $periodes[$b->periode_id]->annee_scolaire,
                'version' => $b->version,
                'pdf_disponible' => $b->pdf_document_uuid !== null,
            ])->sortBy(['annee_scolaire', 'periode'])->values();
        });

        return ApiResponse::succes([
            'apprenant_uuid' => $apprenantUuid,
            'eligible' => $bulletins->isNotEmpty(),
            'bulletins' => $bulletins,
        ]);
    }

    /**
     * POST /v1/interne/notes-elearning - report d'une note E-learning (devoir noté, tentative de quiz).
     * 201 : note créée · 200 : note existante (mise à jour si la valeur a changé, sinon inchangée).
     */
    public function reporterNoteElearning(Request $request, ReportElearningService $service): JsonResponse
    {
        $tenant = (string) $request->header('X-Tenant-Id', '');
        if (! ctype_digit($tenant) || (int) $tenant < 1) {
            return ApiResponse::erreur('En-tête X-Tenant-Id invalide.', 'PARAMETRES_INVALIDES', 422);
        }

        $d = $request->validate([
            'source' => ['required', 'in:devoir,quiz'],
            'source_uuid' => ['required', 'uuid'],
            'activite_uuid' => ['required', 'uuid'],
            'activite_libelle' => ['required', 'string', 'max:120'],
            'apprenant_uuid' => ['required', 'uuid'],
            'matiere_uuid' => ['required', 'uuid'],
            'enseignant_uuid' => ['required', 'uuid'],
            'valeur' => ['required', 'regex:/^\d{1,3}(\.\d{1,2})?$/'],
            'note_sur' => ['required', 'regex:/^\d{1,3}(\.\d{1,2})?$/'],
            'date' => ['required', 'date_format:Y-m-d'],
            'commentaire' => ['nullable', 'string', 'max:255'],
        ]);
        if (Decimal::versEchelle($d['note_sur']) <= 0 || Decimal::versEchelle($d['valeur']) > Decimal::versEchelle($d['note_sur'])) {
            throw ValidationException::withMessages(['valeur' => 'La note doit être comprise entre 0 et note_sur (strictement positif).']);
        }

        $utilisateur = ['uuid' => $d['enseignant_uuid'], 'roleCode' => 'enseignant', 'tenantId' => (int) $tenant];
        $r = Contexte::executerPour((int) $tenant, fn () => $service->reporter($d), $utilisateur);

        return ApiResponse::succes([
            'note_uuid' => $r['note']->uuid,
            'evaluation_uuid' => $r['evaluation']->uuid,
            'periode_uuid' => $r['evaluation']->periode->uuid,
            'valeur' => $r['note']->valeur,
            'note_sur' => Decimal::versTexte(Decimal::versEchelle((string) $r['evaluation']->note_sur), 2),
            'version' => $r['note']->version,
        ], $r['creee'] ? 'Note reportée.' : 'Note déjà reportée : mise à jour si la valeur a changé.', $r['creee'] ? 201 : 200);
    }
}
