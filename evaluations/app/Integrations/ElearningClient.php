<?php

namespace App\Integrations;

use Illuminate\Support\Facades\Http;

/**
 * Seul client HTTP du module - appels vers E-learning.
 * Guide suprême design §2 compositions + §02 §5 :
 * Authentification par jeton de service (jamais JWT utilisateur).
 *
 * PHASE 2 - bloqué tant que le correctif Roc n'est pas validé.
 * Guide tasks C0 : ne démarrer aucune tâche composition avant C0.1 + C0.2.
 */
class ElearningClient
{
    private string $baseUrl;

    private string $serviceToken;

    public function __construct()
    {
        $this->baseUrl = config('services.elearning.url', '');
        $this->serviceToken = config('services.elearning.service_token', '');
    }

    /**
     * Crée un quiz de composition officielle côté E-learning.
     * Guide compositions design §2 étape 2 + §4.
     *
     * @param  array  $payload  matière, classe, date, durée, niveau_surveillance
     * @return string quiz_elearning_uuid retourné par E-learning
     *
     * TODO(C0.2) : contrat d'interface à documenter avec Roc avant implémentation.
     */
    public function creerQuizComposition(array $payload): string
    {
        throw new \RuntimeException('PHASE 2 - bloqué : TODO(C0.2) contrat E-learning non validé.');
    }
}
