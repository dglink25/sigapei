<?php

namespace App\Domain\Onboarding;

use App\Services\RabbitMQService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Orchestre le formulaire d'onboarding en 5 etapes (section 4) : brouillon
 * auto-sauvegarde, televersement de documents, soumission finale et
 * declenchement des notifications initiales (section 6).
 */
class OnboardingService
{
    public function __construct(private RabbitMQService $rabbitmq) {}

    /**
     * Cree ou met a jour un brouillon de demande. Le porteur de projet n'est
     * pas authentifie : la demande est retrouvee par son uuid s'il est fourni
     * (reprise apres fermeture du navigateur), sinon une nouvelle est creee.
     */
    public function enregistrerBrouillon(?string $uuid, array $donnees): DemandeEtablissement
    {
        $demande = $uuid ? DemandeEtablissement::where('uuid', $uuid)->first() : null;
        $demande ??= new DemandeEtablissement();

        $formulaireExistant = $demande->donnees_formulaire ?? [];
        $demande->donnees_formulaire = array_replace_recursive($formulaireExistant, $donnees);

        // Duplique les champs structurants connus, s'ils sont presents dans ce lot.
        if (isset($donnees['localisation']['arrondissement_uuid'])) {
            $demande->arrondissement_id = \App\Domain\Geo\Arrondissement::where(
                'uuid', $donnees['localisation']['arrondissement_uuid']
            )->value('id');
        }
        $demande->adresse_complete ??= $donnees['localisation']['adresse_complete'] ?? $demande->adresse_complete;
        $demande->latitude = $donnees['geolocalisation']['latitude'] ?? $demande->latitude;
        $demande->longitude = $donnees['geolocalisation']['longitude'] ?? $demande->longitude;

        if (isset($donnees['dirigeant'])) {
            $demande->dirigeant_nom = $donnees['dirigeant']['nom_complet'] ?? $demande->dirigeant_nom;
            $demande->dirigeant_titre = $donnees['dirigeant']['titre'] ?? $demande->dirigeant_titre;
            $demande->dirigeant_email = $donnees['dirigeant']['email'] ?? $demande->dirigeant_email;
            $demande->dirigeant_telephone = $donnees['dirigeant']['telephone'] ?? $demande->dirigeant_telephone;
        }

        $demande->statut ??= 'brouillon';
        $demande->save();

        return $demande;
    }

    public function televerserDocument(string $demandeUuid, string $type, UploadedFile $fichier): DocumentEtablissement
    {
        $demande = DemandeEtablissement::where('uuid', $demandeUuid)->firstOrFail();

        $chemin = $fichier->store("demandes/{$demande->uuid}/{$type}", 's3');

        return $demande->documents()->create([
            'type' => $type,
            'chemin_stockage' => $chemin,
            'mime_type' => $fichier->getMimeType(),
            'taille_octets' => $fichier->getSize(),
        ]);
    }

    public function soumettre(string $demandeUuid): DemandeEtablissement
    {
        $demande = DemandeEtablissement::where('uuid', $demandeUuid)->firstOrFail();
        $demande->statut = 'soumise';
        $demande->date_soumission = now();
        $demande->save();

        $formulaire = $demande->donnees_formulaire ?? [];

        // Notifications initiales (section 6) : declenchees ici, envoyees
        // effectivement par le microservice Communication qui consomme
        // cet evenement.
        $this->rabbitmq->publier('demande.soumise', [
            'demandeUuid' => $demande->uuid,
            'etablissementNom' => $formulaire['etablissement']['nom'] ?? null,
            'etablissementEmail' => $formulaire['etablissement']['email'] ?? null,
            'etablissementTelephone1' => $formulaire['etablissement']['telephone_1'] ?? null,
            'dirigeantNom' => $demande->dirigeant_nom,
            'dirigeantEmail' => $demande->dirigeant_email,
            'dirigeantTelephone' => $demande->dirigeant_telephone,
        ]);

        return $demande;
    }
}
