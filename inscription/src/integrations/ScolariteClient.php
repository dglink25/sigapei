<?php

namespace App\integrations;

use App\common\Services\InterneClient;
use Exception;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Client d'intégration avec le microservice Scolarité.
 *
 * Règle n°1 : plus aucune jointure SQL inter-schémas. Les lectures passent
 * par l'API interne de Scolarité (`/interne/...` + `X-Internal-Secret`),
 * comme le fait vie-scolaire. Le secret interne est présenté par
 * InterneClient, jamais instancié ici.
 *
 * Règle n°5 : ce client ne valide aucun JWT. L'identité de l'appelant est
 * portée par le secret interne.
 */
class ScolariteClient
{
    public function __construct(
        protected InterneClient $interne
    ) {}

    /**
     * Vérifie la disponibilité de place dans une classe.
     * Accepte soit l'UUID, soit l'ID entier de la classe.
     *
     * @return array<string, mixed>
     */
    public function verifierDisponibilite(string|int $classeRef, mixed $tenantId = null): array
    {
        // Ne transmettre que le paramètre réellement fourni : une clé
        // présente mais vide fait échouer la validation 422 du contrôleur
        // qui teste `if ($uuid = $request->query('uuid'))`.
        $requete = is_numeric($classeRef)
            ? ['id' => (int) $classeRef]
            : ['uuid' => (string) $classeRef];

        $dispo = $this->interne->get('scolarite', '/v1/interne/classes/disponibilite', $requete);

        if (!$dispo) {
            throw new Exception("Classe visée (réf: {$classeRef}) introuvable dans le schéma scolarité.");
        }

        $donnees = $dispo['donnees'] ?? $dispo;

        if (($donnees['est_complete'] ?? false) === true) {
            throw new Exception(
                "Validation impossible : la classe '{$donnees['nom']}' a atteint sa capacité maximale ({$donnees['capacite']} places)."
            );
        }

        return $donnees;
    }

    /**
     * Crée l'apprenant via l'API interne de Scolarité.
     *
     * Règle absolue (immuable) :
     *   - Programme béninois                    → utilisateur_id = NULL (jamais de compte élève)
     *   - Programme français + cycle secondaire → compte utilisateur si fourni
     *   - Cycle universitaire (tout programme)  → compte utilisateur si fourni
     *
     * L'application de cette règle est du ressort de Scolarité, seul
     * propriétaire du schéma. Le client transmet les données et reçoit le
     * verdict.
     *
     * @param  array<string, mixed>  $donnees
     * @return array<string, mixed>
     */
    public function creerApprenant(array $donnees): array
    {
        $payload = [
            'classe_uuid'        => $donnees['classe_uuid'] ?? null,
            'candidature_uuid'   => $donnees['candidature_uuid'] ?? null,
            'parent_identite_uuid' => $donnees['parent_identite_uuid'] ?? null,
            'nom'                => $donnees['nom'] ?? null,
            'prenom'             => $donnees['prenom'] ?? null,
            'date_naissance'     => $donnees['date_naissance'] ?? null,
            'sexe'               => $donnees['sexe'] ?? null,
            'parent_lien'        => $donnees['parent_lien'] ?? 'parent',
        ];

        try {
            $reponse = $this->interne->post('scolarite', '/v1/interne/apprenants', $payload);
        } catch (RuntimeException $e) {
            throw new Exception('Création de l\'apprenant impossible : ' . $e->getMessage(), 0, $e);
        }

        $apprenant = $reponse['donnees'] ?? $reponse;

        if (empty($apprenant['uuid'])) {
            throw new Exception("Scolarité n'a pas retourné d'UUID d'apprenant.");
        }

        return [
            'uuid'                   => $apprenant['uuid'],
            'classe_nom'             => $apprenant['classe_nom'] ?? null,
            'programme'              => $apprenant['programme'] ?? null,
            'compte_utilisateur_cree'=> (bool) ($apprenant['compte_utilisateur_cree'] ?? false),
        ];
    }

    /**
     * Résout un profil parent via l'API interne d'Identité.
     * Conservé ici pour la lisibilité du flux de validation.
     */
    public function matriculePropose(): string
    {
        return 'MAT-' . strtoupper(Str::random(8));
    }
}
