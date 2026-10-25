<?php

namespace App\Http\Controllers;

use App\Domain\Etablissement\DemandeCycle;
use App\Domain\Etablissement\DemandeCycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Routes côté administrateur de l'établissement :
 *   GET    /interne/mon-etablissement/demandes-cycle         → liste ses demandes
 *   POST   /interne/mon-etablissement/demandes-cycle         → soumettre une demande
 *   DELETE /interne/mon-etablissement/demandes-cycle/{uuid}  → annuler (en_attente uniquement)
 *
 * Routes côté Super Administrateur (interne) :
 *   GET    /interne/demandes-cycle            → toutes les demandes en attente
 *   POST   /interne/demandes-cycle/{uuid}/accepter
 *   POST   /interne/demandes-cycle/{uuid}/refuser
 */
class DemandeCycleController extends Controller
{
    public function __construct(private DemandeCycleService $service) {}

    // ── Côté établissement ───────────────────────────────────────────

    public function listerMesDemandes(Request $request): JsonResponse
    {
        $etab    = $request->attributes->get('etablissement');
        $demandes = DemandeCycle::where('etablissement_id', $etab->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $demandes]);
    }

    public function soumettre(Request $request): JsonResponse
    {
        $etab    = $request->attributes->get('etablissement');
        $donnees = $request->validate([
            'cycle' => ['required', Rule::in(['maternelle', 'primaire', 'secondaire', 'universitaire'])],
            'motif' => ['required', 'string', 'min:20', 'max:1000'],
        ]);

        $demande = $this->service->soumettre($etab->id, $donnees['cycle'], $donnees['motif']);

        return response()->json(['success' => true, 'data' => $demande], 201);
    }

    public function annuler(Request $request, string $uuid): JsonResponse
    {
        $etab    = $request->attributes->get('etablissement');
        $demande = DemandeCycle::where('etablissement_id', $etab->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        if ($demande->statut !== 'en_attente') {
            return response()->json([
                'success' => false,
                'error'   => ['code' => 'DEMANDE_NON_ANNULABLE', 'message' => 'Seule une demande en attente peut être annulée.'],
            ], 409);
        }

        $demande->delete();

        return response()->json(['success' => true]);
    }

    // ── Côté Super Administrateur ────────────────────────────────────

    public function listerToutesDemandes(Request $request): JsonResponse
    {
        $statut   = $request->query('statut', 'en_attente');
        $demandes = DemandeCycle::with('etablissement:id,uuid,nom,slug')
            ->when($statut !== 'tous', fn($q) => $q->where('statut', $statut))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($d) => array_merge($d->toArray(), [
                'etablissement_nom'  => $d->etablissement->nom ?? null,
                'etablissement_slug' => $d->etablissement->slug ?? null,
            ]));

        return response()->json(['success' => true, 'data' => $demandes]);
    }

    public function accepter(Request $request, string $uuid): JsonResponse
    {
        $demande = DemandeCycle::where('uuid', $uuid)->firstOrFail();
        $note    = $request->input('note', '');

        $demande = $this->service->accepter($demande, $note);

        return response()->json(['success' => true, 'data' => $demande]);
    }

    public function refuser(Request $request, string $uuid): JsonResponse
    {
        $demande = DemandeCycle::where('uuid', $uuid)->firstOrFail();
        $donnees = $request->validate([
            'note' => ['required', 'string', 'min:10'],
        ]);

        $demande = $this->service->refuser($demande, $donnees['note']);

        return response()->json(['success' => true, 'data' => $demande]);
    }
}
