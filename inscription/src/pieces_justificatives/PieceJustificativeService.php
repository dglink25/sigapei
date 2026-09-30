<?php

namespace App\pieces_justificatives;

use App\candidatures\CandidatureRepository;
use App\common\Services\AuditService;
use Exception;

class PieceJustificativeService
{
    public function __construct(
        protected CandidatureRepository $candidatureRepository
    ) {}

    public function ajouterPiece(string $candidatureUuid, array $donnees): PieceJustificative
    {
        $candidature = $this->candidatureRepository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        $piece = PieceJustificative::create([
            'tenant_id' => $candidature->tenant_id,
            'candidature_id' => $candidature->id,
            'type' => $donnees['type'],
            'nom_original' => $donnees['nom_original'],
            'chemin_stockage' => $donnees['chemin_stockage'],
            'taille_octets' => $donnees['taille_octets'] ?? 0,
            'mime_type' => $donnees['mime_type'] ?? null,
            'statut_validation' => 'en_attente',
        ]);

        AuditService::journaliser(
            'AJOUT_PIECE_JUSTIFICATIVE',
            "Piece '{$piece->type}' ajoutee a la candidature {$candidature->uuid}",
            ['piece_uuid' => $piece->uuid, 'chemin' => $piece->chemin_stockage]
        );

        return $piece;
    }
}
