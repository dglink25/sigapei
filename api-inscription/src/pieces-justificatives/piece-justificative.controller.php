<?php

namespace App\pieces_justificatives;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PieceJustificativeController extends Controller
{
    public function __construct(
        protected PieceJustificativeService $service
    ) {}

    public function store(Request $request, string $uuid): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:bulletin,acte_naissance,certificat_nationalite,photo,autre',
            'nom_original' => 'required|string|max:255',
            'chemin_stockage' => 'required|string|max:500',
            'taille_octets' => 'nullable|integer',
            'mime_type' => 'nullable|string|max:100',
        ]);

        try {
            $piece = $this->service->ajouterPiece($uuid, $validated);

            return ApiResponse::succes([
                'uuid' => $piece->uuid,
                'type' => $piece->type,
                'nom_original' => $piece->nom_original,
                'chemin_stockage' => $piece->chemin_stockage,
                'statut_validation' => $piece->statut_validation,
            ], 'Piece justificative enregistree avec succes', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_AJOUT_PIECE', 400);
        }
    }
}
