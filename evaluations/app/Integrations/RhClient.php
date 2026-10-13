<?php

namespace App\Integrations;

/**
 * Vérification de l'affectation enseignant ↔ matière ↔ classe (requirements Exigence 1.1).
 * C'est la vérification de sécurité la plus importante du module.
 *
 * SOURCE NON DÉCIDÉE — TODO(DECISION-21) : le CDC nomme un microservice RH (rh.affectations),
 * mais le README plateforme n'en liste aucun et interdit toute jointure SQL inter-schémas
 * (règle n°1). Options : futur endpoint /interne du microservice RH, ou emplois du temps de
 * Scolarité. À trancher par le chef de projet.
 *
 * Fail closed : tant que la source n'est pas décidée, aucune affectation n'est reconnue,
 * donc aucune saisie de note n'est autorisée.
 */
class RhClient
{
    public function estAffecte(
        string $enseignantUuid,
        string $matiereUuid,
        string $classeUuid,
        string $dateStr
    ): bool {
        throw new \RuntimeException('TODO(DECISION-21) : source des affectations enseignant non décidée.');
    }
}
