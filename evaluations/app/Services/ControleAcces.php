<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;

/**
 * Contrôle fin des droits (CDC Tableau 1, §16) - après le contrôle de rôle des routes :
 *  - administrateur : tout son établissement (le filtre tenant est appliqué partout) ;
 *  - enseignant     : uniquement les classes/matières où il est affecté ;
 *  - apprenant      : uniquement son propre dossier ;
 *  - parent         : uniquement les dossiers de ses enfants rattachés ;
 *  - tout autre rôle (super_admin, personnel) : aucun accès aux notes individuelles.
 * Chaque refus est un 403 ; chaque incertitude (service amont muet, contrat incomplet) un 503.
 */
class ControleAcces
{
    public function __construct(
        private readonly ScolariteClient $scolarite,
        private readonly RhClient $rh,
    ) {}

    /**
     * Vérifie que l'utilisateur courant peut lire le dossier (notes, bulletins) d'un apprenant.
     *
     * @return array<string, mixed> l'apprenant tel que renvoyé par Scolarité
     */
    public function lectureApprenant(string $apprenantUuid): array
    {
        $apprenant = $this->scolarite->apprenant($apprenantUuid)
            ?? throw MetierException::introuvable('Apprenant introuvable.');

        $utilisateur = Contexte::utilisateurUuid();

        $autorise = match (Contexte::role()) {
            'administrateur' => true,
            'enseignant' => isset($apprenant['classe']['uuid'])
                && $this->rh->enseigneDansClasse($utilisateur, $apprenant['classe']['uuid']),
            'apprenant' => $this->scolarite->estLApprenant($apprenant, $utilisateur),
            'parent' => $this->scolarite->estParentDe($apprenant, $utilisateur),
            default => false,
        };

        if (! $autorise) {
            throw MetierException::accesRefuse();
        }

        return $apprenant;
    }

    /** Gestion d'une classe (lecture des notes, classement) : administrateur ou enseignant affecté. */
    public function gestionClasse(string $classeUuid, ?string $matiereUuid = null): void
    {
        $role = Contexte::role();
        if ($role === 'administrateur') {
            return;
        }

        $utilisateur = Contexte::utilisateurUuid();
        $autorise = $role === 'enseignant' && ($matiereUuid !== null
            ? $this->rh->estAffecte($utilisateur, $matiereUuid, $classeUuid)
            : $this->rh->enseigneDansClasse($utilisateur, $classeUuid));

        if (! $autorise) {
            throw MetierException::accesRefuse("Vous n'êtes pas affecté à cette classe ou à cette matière.");
        }
    }

    /** Un enseignant n'agit que sur ses propres évaluations, et seulement s'il est toujours affecté. */
    public function enseignantDeLEvaluation(string $enseignantUuid, string $matiereUuid, string $classeUuid): void
    {
        $utilisateur = Contexte::utilisateurUuid();

        if (! hash_equals($enseignantUuid, $utilisateur) || ! $this->rh->estAffecte($utilisateur, $matiereUuid, $classeUuid)) {
            throw MetierException::accesRefuse("Vous n'êtes pas l'enseignant affecté à cette évaluation.");
        }
    }
}
