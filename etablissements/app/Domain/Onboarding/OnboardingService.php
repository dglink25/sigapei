<?php

namespace App\Domain\Onboarding;

use App\Domain\Geo\LocalisationService;
use App\Services\RabbitMQService;
use App\Support\FusionFormulaire;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Orchestre le formulaire d'onboarding en 5 etapes (section 4) : brouillon
 * auto-sauvegarde, televersement de documents, soumission finale et
 * declenchement des notifications initiales (section 6).
 */
class OnboardingService
{
    public function __construct(
        private RabbitMQService $rabbitmq,
        private LocalisationService $localisation,
    ) {}

    /**
     * Cree ou met a jour un brouillon de demande. Le porteur de projet n'est
     * pas authentifie : la demande est retrouvee par son uuid s'il est fourni
     * (reprise apres fermeture du navigateur), sinon une nouvelle est creee.
     * Seul un brouillon est modifiable ici : une demande soumise ne se corrige
     * que via le lien de correction signe.
     */
    public function enregistrerBrouillon(?string $uuid, array $donnees): DemandeEtablissement
    {
        $demande = $uuid ? DemandeEtablissement::where('uuid', $uuid)->first() : null;

        if ($demande && $demande->statut !== 'brouillon') {
            abort(409, 'Cette demande a déjà été soumise : elle ne peut plus être modifiée ici.');
        }

        $demande ??= new DemandeEtablissement();

        $this->appliquerDonnees($demande, $donnees);

        $demande->statut ??= 'brouillon';
        $demande->save();

        return $demande;
    }

    /**
     * Fusionne un lot de donnees dans le formulaire de la demande ET recopie les
     * champs structurants (localisation a chaque niveau, adresse, coordonnees,
     * dirigeant) dans leurs colonnes dediees, qui font foi a la validation.
     * Ne sauvegarde pas : l'appelant enregistre apres ses propres controles.
     * Utilisee par le brouillon ET par la correction (sinon une correction
     * resterait dans le JSON sans jamais atteindre l'etablissement cree).
     */
    public function appliquerDonnees(DemandeEtablissement $demande, array $donnees): void
    {
        $demande->donnees_formulaire = FusionFormulaire::fusionner($demande->donnees_formulaire ?? [], $donnees);
        $formulaire = $demande->donnees_formulaire;

        // Localisation : chaque niveau est resolu, controle (coherence entre
        // niveaux) et complete vers le haut. Tolerant tant que la saisie est partielle.
        if (isset($donnees['localisation'])) {
            $ids = $this->localisation->resoudre($formulaire['localisation'] ?? []);
            $demande->pays_id = $ids['pays_id'];
            $demande->departement_id = $ids['departement_id'];
            $demande->commune_id = $ids['commune_id'];
            $demande->arrondissement_id = $ids['arrondissement_id'];

            if (array_key_exists('adresse_complete', $donnees['localisation'])) {
                $demande->adresse_complete = $donnees['localisation']['adresse_complete'];
            }
        }

        if (isset($donnees['geolocalisation'])) {
            $demande->latitude = $donnees['geolocalisation']['latitude'] ?? $demande->latitude;
            $demande->longitude = $donnees['geolocalisation']['longitude'] ?? $demande->longitude;
        }

        if (isset($donnees['dirigeant'])) {
            $demande->dirigeant_nom = $donnees['dirigeant']['nom_complet'] ?? $demande->dirigeant_nom;
            $demande->dirigeant_titre = $donnees['dirigeant']['titre'] ?? $demande->dirigeant_titre;
            $demande->dirigeant_email = $donnees['dirigeant']['email'] ?? $demande->dirigeant_email;
            $demande->dirigeant_telephone = $donnees['dirigeant']['telephone'] ?? $demande->dirigeant_telephone;
        }
    }

    public function televerserDocument(string $demandeUuid, string $type, UploadedFile $fichier): DocumentEtablissement
    {
        $demande = DemandeEtablissement::where('uuid', $demandeUuid)->firstOrFail();

        // Documents acceptes tant que le dossier est en cours ; apres validation,
        // seul le logo peut encore etre ajoute (section 4.4).
        $autorise = in_array($demande->statut, ['brouillon', 'correction_demandee'], true)
            || ($demande->statut === 'validee' && $type === 'logo');

        if (! $autorise) {
            abort(409, "Cette demande n'accepte plus de nouveau document.");
        }

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

        // Une demande deja soumise, en correction ou validee ne repasse jamais par ici.
        if ($demande->statut !== 'brouillon') {
            abort(409, 'Cette demande a déjà été soumise.');
        }

        // Localisation exploitable exigee des la soumission (pays, departement,
        // commune, arrondissement si la commune en possede, adresse).
        $this->localisation->exigerComplete($demande);

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
