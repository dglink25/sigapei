<?php

namespace App\Domain\Validation;

use App\Domain\Etablissement\CyclesAutorisesService;
use App\Domain\Etablissement\Etablissement;
use App\Domain\Etablissement\MatriculeService;
use App\Domain\Etablissement\SlugService;
use App\Domain\Onboarding\DemandeEtablissement;
use App\Services\RabbitMQService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Workflow d'instruction et de validation par le Super Administrateur
 * (section 7) : examen, demande de correction, relance automatique,
 * validation definitive (creation atomique de l'etablissement), suspension
 * et reactivation (section 10).
 */
class ValidationService
{
    public function __construct(
        private SlugService $slugService,
        private MatriculeService $matriculeService,
        private CyclesAutorisesService $cyclesService,
        private CorrectionTokenService $tokenService,
        private RabbitMQService $rabbitmq,
    ) {}

    public function listerDemandesAInstruire()
    {
        return DemandeEtablissement::where('statut', 'soumise')
            ->orderBy('date_soumission')
            ->get();
    }

    /**
     * Marque des champs comme "a corriger" (section 7.2) : renvoie le
     * dossier en statut "correction_demandee" et genere un premier lien
     * de correction a usage unique.
     */
    public function demanderCorrection(string $demandeUuid, array $champsACorreiger): DemandeEtablissement
    {
        $demande = DemandeEtablissement::where('uuid', $demandeUuid)->firstOrFail();

        $demande->champs_a_corriger = $champsACorreiger;
        $demande->statut = 'correction_demandee';
        $demande->save();

        $tokenClair = $this->tokenService->genererPour($demande);

        $this->rabbitmq->publier('demande.correction_demandee', [
            'demandeUuid' => $demande->uuid,
            'champsACorreiger' => $champsACorreiger,
            'lienCorrection' => $this->tokenService->urlCorrection($tokenClair),
            'dirigeantEmail' => $demande->dirigeant_email,
            'dirigeantTelephone' => $demande->dirigeant_telephone,
        ]);

        return $demande;
    }

    /**
     * Soumet la correction via le lien signe (section 7.2) : seuls les
     * champs marques sont modifiables, le jeton est invalide immediatement
     * apres usage, et le cycle de relance s'arrete.
     */
    public function soumettreCorrection(string $tokenEnClair, array $donneesCorrigees): DemandeEtablissement
    {
        $demande = $this->tokenService->resoudre($tokenEnClair);

        if (! $demande) {
            throw ValidationException::withMessages([
                'token' => ['Ce lien de correction est invalide ou a expire.'],
            ]);
        }

        $champsAutorises = array_keys($demande->champs_a_corriger ?? []);
        $donneesFiltrees = array_intersect_key($donneesCorrigees, array_flip($champsAutorises));

        $demande->donnees_formulaire = array_replace_recursive($demande->donnees_formulaire ?? [], $donneesFiltrees);
        $demande->statut = 'soumise';
        $demande->champs_a_corriger = null;
        $demande->save();

        $this->tokenService->invalider($demande);

        return $demande;
    }

    /** Relance quotidienne (section 7.3), invoquee par le scheduler a 18h59. */
    public function relancerCorrectionsEnAttente(): int
    {
        $demandes = DemandeEtablissement::where('statut', 'correction_demandee')->get();

        foreach ($demandes as $demande) {
            $tokenClair = $this->tokenService->genererPour($demande);
            $demande->date_dernier_rappel = now();
            $demande->save();

            $this->rabbitmq->publier('demande.correction_relance', [
                'demandeUuid' => $demande->uuid,
                'champsACorreiger' => $demande->champs_a_corriger,
                'lienCorrection' => $this->tokenService->urlCorrection($tokenClair),
                'dirigeantEmail' => $demande->dirigeant_email,
                'dirigeantTelephone' => $demande->dirigeant_telephone,
            ]);
        }

        return $demandes->count();
    }

    /**
     * Validation definitive (section 7.4) : transaction atomique creant
     * l'etablissement, ses cycles autorises et son matricule, puis
     * declenchant (via RabbitMQ) la creation du compte administrateur par
     * api-identite et l'envoi des identifiants (section 7.6) par
     * api-communication.
     */
    public function valider(string $demandeUuid): Etablissement
    {
        $demande = DemandeEtablissement::where('uuid', $demandeUuid)->firstOrFail();
        $formulaire = $demande->donnees_formulaire ?? [];
        $etablissementForm = $formulaire['etablissement'] ?? [];
        $types = $etablissementForm['types'] ?? [];
        $nom = $etablissementForm['nom'] ?? 'Etablissement';

        $etablissement = DB::transaction(function () use ($demande, $etablissementForm, $types, $nom) {
            $etablissement = Etablissement::create([
                'slug' => $this->slugService->genererDepuisNom($nom),
                'matricule' => $this->matriculeService->genererDepuisNom($nom),
                'nom' => $nom,
                'types' => $types,
                'annee_ouverture' => $etablissementForm['annee_ouverture'] ?? now()->year,
                'arrondissement_id' => $demande->arrondissement_id,
                'adresse_complete' => $demande->adresse_complete,
                'email' => $etablissementForm['email'] ?? $demande->dirigeant_email,
                'telephone_1' => $etablissementForm['telephone_1'] ?? $demande->dirigeant_telephone,
                'telephone_2' => $etablissementForm['telephone_2'] ?? null,
                'latitude' => $demande->latitude,
                'longitude' => $demande->longitude,
                'statut' => 'actif',
                'date_validation' => now(),
            ]);

            $this->cyclesService->creerPour($etablissement, $types);

            $demande->statut = 'validee';
            $demande->etablissement_id = $etablissement->id;
            $demande->save();

            return $etablissement;
        });

        // Creation du compte administrateur : evenement consomme par
        // api-identite (voir section 7.4 point 4). Reste de la
        // responsabilite d'Identite de creer utilisateur+role=administrateur.
        $this->rabbitmq->publier('etablissement.valide', [
            'tenantUuid' => $etablissement->uuid,
            'tenantId' => $etablissement->id,
            'nomEtablissement' => $etablissement->nom,
            'slug' => $etablissement->slug,
            'matricule' => $etablissement->matricule,
            'dirigeantNom' => $demande->dirigeant_nom,
            'dirigeantEmail' => $demande->dirigeant_email,
            'dirigeantTelephone' => $demande->dirigeant_telephone,
        ]);

        return $etablissement;
    }

    public function suspendre(string $etablissementUuid): Etablissement
    {
        $etablissement = Etablissement::where('uuid', $etablissementUuid)->firstOrFail();
        $etablissement->statut = 'suspendu';
        $etablissement->save();

        $this->invaliderCacheSlug($etablissement->slug);
        $this->rabbitmq->publier('etablissement.suspendu', ['tenantUuid' => $etablissement->uuid]);

        return $etablissement;
    }

    public function reactiver(string $etablissementUuid): Etablissement
    {
        $etablissement = Etablissement::where('uuid', $etablissementUuid)->firstOrFail();
        $etablissement->statut = 'actif';
        $etablissement->save();

        $this->invaliderCacheSlug($etablissement->slug);
        $this->rabbitmq->publier('etablissement.reactive', ['tenantUuid' => $etablissement->uuid]);

        return $etablissement;
    }

    private function invaliderCacheSlug(string $slug): void
    {
        Cache::forget("slug:resolution:{$slug}");
        Cache::forget("accueil:etablissement:{$slug}");
    }

    public function resoudreSlug(string $slug): ?array
    {
        return Cache::remember("slug:resolution:{$slug}", (int) env('CACHE_TTL_SLUG', 60), function () use ($slug) {
            $etablissement = Etablissement::where('slug', $slug)->first();

            if (! $etablissement) {
                return null;
            }

            return [
                'tenantUuid' => $etablissement->uuid,
                'slug' => $etablissement->slug,
                'statut' => $etablissement->statut,
            ];
        });
    }
}
