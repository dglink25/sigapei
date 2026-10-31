<?php

namespace App\Exceptions;

use RuntimeException;

/** Refus métier explicite : code HTTP et code technique stables, message destiné à l'utilisateur final. */
class MetierException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $codeTechnique,
        public readonly int $statut = 422,
    ) {
        parent::__construct($message);
    }

    public static function accesRefuse(string $message = "Vous n'avez pas accès à cette ressource.", string $code = 'ACCES_REFUSE'): self
    {
        return new self($message, $code, 403);
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
