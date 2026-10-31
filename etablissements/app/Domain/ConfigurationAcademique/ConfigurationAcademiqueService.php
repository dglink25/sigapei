<?php

namespace App\Domain\ConfigurationAcademique;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Domain\ConfigurationAcademique\CycleConfig;

/**
 * Service métier de la configuration académique.
 *
 * Regroupe les règles transversales :
 *   - Validation de non-chevauchement des années académiques
 *   - Suspension / réactivation d'une année
 *   - Propagation d'une matière aux classes homologues
 *   - Journalisation des actions sensibles
 */
class ConfigurationAcademiqueService
{
    // ── Années académiques ───────────────────────────────────────────────

    /**
     * Vérifie qu'une plage de dates ne chevauche pas une année existante
     * du même établissement.
     */
    public function aChevauche(int $etablissementId, string $dateDebut, string $dateFin, ?int $exclureId = null): bool
    {
        $q = AnneeAcademique::where('etablissement_id', $etablissementId)
            ->where('date_debut', '<', $dateFin)
            ->where('date_fin', '>', $dateDebut);

        if ($exclureId) {
            $q->where('id', '!=', $exclureId);
        }

        return $q->exists();
    }

    public function creerAnnee(int $etablissementId, array $donnees): AnneeAcademique
    {
        if ($this->aChevauche($etablissementId, $donnees['date_debut'], $donnees['date_fin'])) {
            throw ValidationException::withMessages([
                'date_debut' => ['Cette plage de dates chevauche une année académique existante.'],
            ]);
        }

        return DB::transaction(function () use ($etablissementId, $donnees) {
            $annee = AnneeAcademique::create(array_merge($donnees, [
                'etablissement_id' => $etablissementId,
            ]));

            // Auto-peupler cycles_config depuis cycles_autorises (statut actif dans cycles_autorises)
            // Les cycles sont créés avec actif = false : l'admin les active manuellement.
            $cyclesAutorises = \App\Domain\Etablissement\CycleAutorise::where('etablissement_id', $etablissementId)
                ->where('statut', 'actif')
                ->pluck('cycle');

            foreach ($cyclesAutorises as $cycle) {
                CycleConfig::firstOrCreate(
                    [
                        'etablissement_id' => $etablissementId,
                        'annee_id'         => $annee->id,
                        'cycle'            => $cycle,
                    ],
                    ['actif' => false],
                );
            }

            return $annee;
        });
    }

    public function modifierAnnee(AnneeAcademique $annee, array $donnees): AnneeAcademique
    {
        // Interdire la modification des dates pour une année terminée
        if ($annee->statut === 'termine' && (isset($donnees['date_debut']) || isset($donnees['date_fin']))) {
            throw ValidationException::withMessages([
                'date_debut' => ['Les dates d\'une année terminée ne peuvent pas être modifiées.'],
            ]);
        }

        $dateDebut = $donnees['date_debut'] ?? $annee->date_debut->toDateString();
        $dateFin   = $donnees['date_fin']   ?? $annee->date_fin->toDateString();

        if (isset($donnees['date_debut']) || isset($donnees['date_fin'])) {
            if ($this->aChevauche($annee->etablissement_id, $dateDebut, $dateFin, $annee->id)) {
                throw ValidationException::withMessages([
                    'date_debut' => ['Cette plage de dates chevauche une autre année académique.'],
                ]);
            }
        }

        $annee->update($donnees);
        return $annee->fresh();
    }

    public function suspendreAnnee(AnneeAcademique $annee, string $note = '', ?string $auteurUuid = null): AnneeAcademique
    {
        DB::transaction(function () use ($annee, $note, $auteurUuid) {
            $annee->update(['suspendu' => true, 'note_suspension' => $note]);
            $this->journaliser($annee->etablissement_id, 'suspension_annee', 'AnneeAcademique', $annee->uuid, [
                'libelle' => $annee->libelle,
                'note'    => $note,
            ], $auteurUuid);
        });
        return $annee->fresh();
    }

    public function reactiverAnnee(AnneeAcademique $annee, ?string $auteurUuid = null): AnneeAcademique
    {
        DB::transaction(function () use ($annee, $auteurUuid) {
            $annee->update(['suspendu' => false, 'note_suspension' => '']);
            $this->journaliser($annee->etablissement_id, 'reactivation_annee', 'AnneeAcademique', $annee->uuid, [
                'libelle' => $annee->libelle,
            ], $auteurUuid);
        });
        return $annee->fresh();
    }

    // ── Propagation de matières ──────────────────────────────────────────

    /**
     * Retourne les classes homologues devant recevoir la matière selon les règles de cycle :
     * - Maternelle / Primaire : toutes les classes du même niveau (homologues entre groupes).
     * - Secondaire sans série : toutes les classes de la promotion (même niveau).
     * - Secondaire avec série : uniquement les classes de la même promotion ET même série (jamais les autres séries).
     * - Universitaire : géré au niveau des cohortes.
     * @return ClasseConfig[]
     */
    public function classesPourPropagation(MatiereConfig $source): \Illuminate\Support\Collection
    {
        $q = ClasseConfig::where('etablissement_id', $source->etablissement_id)
            ->where('annee_id', $source->annee_id)
            ->where('niveau_id', $source->niveau_id)
            ->where('actif', true);

        if ($source->cycle === 'secondaire') {
            if ($source->serie_id) {
                // Strictement la même série
                $q->where('serie_id', $source->serie_id);
            } else {
                // Promotion générale sans série
                $q->whereNull('serie_id');
            }
        }

        if ($source->classe_id) {
            $q->where('id', '!=', $source->classe_id);
        }

        return $q->with(['niveau', 'subdivision', 'serie'])->get();
    }

    /**
     * Propage automatiquement une matière selon les règles des cycles.
     */
    public function propagerMatiere(MatiereConfig $source, ?string $auteurUuid = null): int
    {
        $classes = $this->classesPourPropagation($source);
        $crees   = 0;

        DB::transaction(function () use ($source, $classes, $auteurUuid, &$crees) {
            foreach ($classes as $classe) {
                $existe = MatiereConfig::where([
                    'etablissement_id'     => $source->etablissement_id,
                    'annee_id'             => $source->annee_id,
                    'niveau_id'            => $source->niveau_id,
                    'serie_id'             => $classe->serie_id,
                    'classe_id'            => $classe->id,
                    'matiere_uuid_externe' => $source->matiere_uuid_externe,
                ])->exists();

                if (! $existe) {
                    MatiereConfig::create([
                        'etablissement_id'     => $source->etablissement_id,
                        'annee_id'             => $source->annee_id,
                        'cycle'                => $source->cycle,
                        'niveau_id'            => $source->niveau_id,
                        'serie_id'             => $classe->serie_id,
                        'promotion_id'         => $source->promotion_id ?: $source->niveau_id,
                        'classe_id'            => $classe->id,
                        'matiere_uuid_externe' => $source->matiere_uuid_externe,
                        'nom_matiere'          => $source->nom_matiere,
                        'code_matiere'         => $source->code_matiere,
                        'coefficient'          => $source->coefficient,
                        'est_obligatoire'      => $source->est_obligatoire,
                    ]);
                    $crees++;
                }
            }

            // Pour l'universitaire : propager aux cohortes de la même filière + niveau
            if ($source->cycle === 'universitaire' && $source->serie_id) {
                $cohortes = CohorteUniversitaire::where('etablissement_id', $source->etablissement_id)
                    ->where('annee_id', $source->annee_id)
                    ->where('filiere_id', $source->serie_id)
                    ->where('niveau_id', $source->niveau_id)
                    ->where('actif', true)
                    ->get();

                foreach ($cohortes as $cohorte) {
                    $existe = MatiereConfig::where([
                        'etablissement_id'     => $source->etablissement_id,
                        'annee_id'             => $source->annee_id,
                        'niveau_id'            => $source->niveau_id,
                        'serie_id'             => $source->serie_id,
                        'cohorte_id'           => $cohorte->id,
                        'matiere_uuid_externe' => $source->matiere_uuid_externe,
                    ])->exists();

                    if (! $existe) {
                        MatiereConfig::create([
                            'etablissement_id'     => $source->etablissement_id,
                            'annee_id'             => $source->annee_id,
                            'cycle'                => 'universitaire',
                            'niveau_id'            => $source->niveau_id,
                            'serie_id'             => $source->serie_id,
                            'cohorte_id'           => $cohorte->id,
                            'matiere_uuid_externe' => $source->matiere_uuid_externe,
                            'nom_matiere'          => $source->nom_matiere,
                            'code_matiere'         => $source->code_matiere,
                            'coefficient'          => $source->coefficient,
                            'est_obligatoire'      => $source->est_obligatoire,
                        ]);
                        $crees++;
                    }
                }
            }

            if ($crees > 0) {
                $this->journaliser(
                    $source->etablissement_id,
                    'propagation_matiere',
                    'MatiereConfig',
                    $source->uuid,
                    ['matiere' => $source->matiere_uuid_externe, 'crees' => $crees],
                    $auteurUuid,
                );
            }
        });

        return $crees;
    }

    /**
     * Quand une nouvelle classe est créée, elle hérite automatiquement
     * de toutes les matières déjà configurées pour son niveau / série.
     */
    public function synchroniserMatieresPourNouvelleClasse(ClasseConfig $classe): int
    {
        $q = MatiereConfig::where('etablissement_id', $classe->etablissement_id)
            ->where('annee_id', $classe->annee_id)
            ->where('niveau_id', $classe->niveau_id);

        if ($classe->niveau?->cycle === 'secondaire') {
            if ($classe->serie_id) {
                $q->where(function ($sub) use ($classe) {
                    $sub->where('serie_id', $classe->serie_id)
                        ->orWhereNull('serie_id');
                });
            } else {
                $q->whereNull('serie_id');
            }
        }

        $matieresModeles = $q->get()->unique('matiere_uuid_externe');
        $attachees = 0;

        foreach ($matieresModeles as $modele) {
            $existe = MatiereConfig::where([
                'etablissement_id'     => $classe->etablissement_id,
                'annee_id'             => $classe->annee_id,
                'niveau_id'            => $classe->niveau_id,
                'classe_id'            => $classe->id,
                'matiere_uuid_externe' => $modele->matiere_uuid_externe,
            ])->exists();

            if (! $existe) {
                MatiereConfig::create([
                    'etablissement_id'     => $classe->etablissement_id,
                    'annee_id'             => $classe->annee_id,
                    'cycle'                => $modele->cycle,
                    'niveau_id'            => $classe->niveau_id,
                    'serie_id'             => $classe->serie_id,
                    'promotion_id'         => $classe->niveau_id,
                    'classe_id'            => $classe->id,
                    'matiere_uuid_externe' => $modele->matiere_uuid_externe,
                    'nom_matiere'          => $modele->nom_matiere,
                    'code_matiere'         => $modele->code_matiere,
                    'coefficient'          => $modele->coefficient,
                    'est_obligatoire'      => $modele->est_obligatoire,
                ]);
                $attachees++;
            }
        }

        return $attachees;
    }

    /**
     * Quand une nouvelle cohorte est créée, elle hérite automatiquement
     * de toutes les matières configurées pour sa filière et niveau.
     */
    public function synchroniserMatieresPourNouvelleCohorte(CohorteUniversitaire $cohorte): int
    {
        $matieresModeles = MatiereConfig::where('etablissement_id', $cohorte->etablissement_id)
            ->where('annee_id', $cohorte->annee_id)
            ->where('niveau_id', $cohorte->niveau_id)
            ->where('serie_id', $cohorte->filiere_id)
            ->get()
            ->unique('matiere_uuid_externe');

        $attachees = 0;

        foreach ($matieresModeles as $modele) {
            $existe = MatiereConfig::where([
                'etablissement_id'     => $cohorte->etablissement_id,
                'annee_id'             => $cohorte->annee_id,
                'niveau_id'            => $cohorte->niveau_id,
                'serie_id'             => $cohorte->filiere_id,
                'cohorte_id'           => $cohorte->id,
                'matiere_uuid_externe' => $modele->matiere_uuid_externe,
            ])->exists();

            if (! $existe) {
                MatiereConfig::create([
                    'etablissement_id'     => $cohorte->etablissement_id,
                    'annee_id'             => $cohorte->annee_id,
                    'cycle'                => 'universitaire',
                    'niveau_id'            => $cohorte->niveau_id,
                    'serie_id'             => $cohorte->filiere_id,
                    'cohorte_id'           => $cohorte->id,
                    'matiere_uuid_externe' => $modele->matiere_uuid_externe,
                    'nom_matiere'          => $modele->nom_matiere,
                    'code_matiere'         => $modele->code_matiere,
                    'coefficient'          => $modele->coefficient,
                    'est_obligatoire'      => $modele->est_obligatoire,
                ]);
                $attachees++;
            }
        }

        return $attachees;
    }

    // ── Audit ────────────────────────────────────────────────────────────

    public function journaliser(
        int $etablissementId,
        string $action,
        string $entite,
        ?string $entiteUuid = null,
        array $detail = [],
        ?string $auteurUuid = null,
    ): void {
        AuditConfigAcademique::create([
            'etablissement_id' => $etablissementId,
            'action'     => $action,
            'entite'     => $entite,
            'entite_uuid'=> $entiteUuid,
            'detail'     => $detail,
            'auteur_uuid'=> $auteurUuid,
        ]);
    }
}
