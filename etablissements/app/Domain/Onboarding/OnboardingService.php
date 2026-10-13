<?php

namespace App\Domain\Onboarding;

use App\Services\RabbitMQService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Illuminate\Support\Facades\DB;
use App\Domain\Onboarding\DemandeEtablissement;

class OnboardingService{
    public function __construct(private RabbitMQService $rabbitmq) {}
    

    public function enregistrerBrouillon(
        ?string $uuid,
        array $donnees
    ): DemandeEtablissement {
        return DB::transaction(function () use ($uuid, $donnees) {

            // Rechercher le brouillon existant si un UUID est fourni.
            $demande = $uuid
                ? DemandeEtablissement::where('uuid', $uuid)
                    ->lockForUpdate()
                    ->first()
                : null;

            // Si un UUID est fourni mais introuvable, ne pas créer
            // silencieusement un nouveau brouillon.
            if ($uuid !== null && !$demande) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException(
                    'Aucun brouillon trouvé pour cet UUID.'
                );
            }

            // Créer un nouveau brouillon si aucun UUID n'est fourni.
            if (!$demande) {
                $demande = new DemandeEtablissement();
                $demande->uuid = (string) Str::uuid();
            }

            // Fusionner les données du formulaire.
            $formulaireExistant = $demande->donnees_formulaire ?? [];

            $demande->donnees_formulaire = array_replace_recursive(
                $formulaireExistant,
                $donnees
            );

            // Localisation.
            if (isset($donnees['localisation']['arrondissement_uuid'])) {
                $demande->arrondissement_id =
                    \App\Domain\Geo\Arrondissement::where(
                        'uuid',
                        $donnees['localisation']['arrondissement_uuid']
                    )->value('id');
            }

            $demande->adresse_complete ??=
                $donnees['localisation']['adresse_complete']
                ?? null;

            $demande->latitude =
                $donnees['geolocalisation']['latitude']
                ?? $demande->latitude;

            $demande->longitude =
                $donnees['geolocalisation']['longitude']
                ?? $demande->longitude;

            // Dirigeant.
            if (isset($donnees['dirigeant'])) {
                $demande->dirigeant_nom =
                    $donnees['dirigeant']['nom_complet']
                    ?? $demande->dirigeant_nom;

                $demande->dirigeant_titre =
                    $donnees['dirigeant']['titre']
                    ?? $demande->dirigeant_titre;

                $demande->dirigeant_email =
                    $donnees['dirigeant']['email']
                    ?? $demande->dirigeant_email;

                $demande->dirigeant_telephone =
                    $donnees['dirigeant']['telephone']
                    ?? $demande->dirigeant_telephone;
            }

            $demande->statut ??= 'brouillon';

            $demande->save();

            return $demande;
        });
    }

    public function televerserDocument(string $demandeUuid, string $type, UploadedFile $fichier): DocumentEtablissement    {

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
