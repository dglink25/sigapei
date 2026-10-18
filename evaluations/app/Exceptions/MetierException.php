<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Refus métier explicite, rendu en JSON avec un code HTTP et un code technique stables.
 * Le message est destiné à l'utilisateur final (jamais de détail interne).
 */
class MetierException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $codeTechnique,
        public readonly int $statut = 422,
    ) {
        parent::__construct($message);
    }

    public static function accesRefuse(string $message = "Vous n'avez pas accès à cette ressource."): self
    {
        return new self($message, 'ACCES_REFUSE', 403);
    }

    public static function introuvable(string $message = 'Ressource introuvable.'): self
    {
        return new self($message, 'RESSOURCE_INTROUVABLE', 404);
    }

    public static function conflit(string $message, string $code = 'CONFLIT'): self
    {
        return new self($message, $code, 409);
    }
}
