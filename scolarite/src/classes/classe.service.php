<?php

namespace App\classes;

use App\common\Services\AuditService;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class ClasseService
{
    public function __construct(
        protected ClasseRepository $repository
    ) {}

    public function listerClasses(array $filtres = []): Collection
    {
        return $this->repository->lister($filtres);
    }

    public function creerClasse(array $donnees): Classe
    {
        // Validation metier : programme doit etre soit 'beninois' soit 'francais'
        if (!in_array($donnees['programme'] ?? 'beninois', ['beninois', 'francais'])) {
            throw new Exception('Le programme pedagogique doit etre "beninois" ou "francais".');
        }

        $classe = $this->repository->creer($donnees);

        AuditService::journaliser('CREATION_CLASSE', "Classe {$classe->nom}", [
            'uuid' => $classe->uuid,
            'programme' => $classe->programme,
            'cycle' => $classe->cycle
        ]);

        return $classe;
    }

    public function verifierDisponibilite(string $uuid): array
    {
        $classe = $this->repository->trouverParUuid($uuid);
        if (!$classe) {
            throw new Exception('Classe introuvable.');
        }

        $inscrits = $classe->apprenants()->count();
        $placesRestantes = max(0, $classe->capacite - $inscrits);

        return [
            'uuid' => $classe->uuid,
            'nom' => $classe->nom,
            'cycle' => $classe->cycle,
            'niveau' => $classe->niveau,
            'programme' => $classe->programme,
            'capacite_totale' => $classe->capacite,
            'inscrits_actuels' => $inscrits,
            'places_disponibles' => $placesRestantes,
            'est_complete' => ($placesRestantes <= 0),
        ];
    }
}
