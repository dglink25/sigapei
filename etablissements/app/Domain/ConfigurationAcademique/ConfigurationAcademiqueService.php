<?php

namespace App\Domain\ConfigurationAcademique;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

        return AnneeAcademique::create(array_merge($donnees, [
            'etablissement_id' => $etablissementId,
        ]));
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
     * Retourne les MatiereConfig manquantes pour les classes homologues
     * (même niveau, même année, même établissement) sans créer de doublons.
     * @return ClasseConfig[]
     */
    public function classesPourPropagation(MatiereConfig $source): \Illuminate\Support\Collection
    {
        $dejaConfigures = MatiereConfig::where('etablissement_id', $source->etablissement_id)
            ->where('annee_id', $source->annee_id)
            ->where('niveau_id', $source->niveau_id)
            ->where('matiere_uuid_externe', $source->matiere_uuid_externe)
            ->where('id', '!=', $source->id)
            ->pluck('serie_id');

        return ClasseConfig::where('etablissement_id', $source->etablissement_id)
            ->where('annee_id', $source->annee_id)
            ->where('niveau_id', $source->niveau_id)
            ->where('actif', true)
            ->whereNotIn('serie_id', $dejaConfigures)
            ->where('id', '!=', $source->id ?? 0)
            ->with(['niveau', 'subdivision', 'serie'])
            ->get();
    }

    public function propagerMatiere(MatiereConfig $source, ?string $auteurUuid = null): int
    {
        $classes = $this->classesPourPropagation($source);
        $crees   = 0;

        DB::transaction(function () use ($source, $classes, $auteurUuid, &$crees) {
            foreach ($classes as $classe) {
                $existe = MatiereConfig::where([
                    'etablissement_id'    => $source->etablissement_id,
                    'annee_id'            => $source->annee_id,
                    'niveau_id'           => $source->niveau_id,
                    'serie_id'            => $classe->serie_id,
                    'matiere_uuid_externe' => $source->matiere_uuid_externe,
                ])->exists();

                if (! $existe) {
                    MatiereConfig::create([
                        'etablissement_id'    => $source->etablissement_id,
                        'annee_id'            => $source->annee_id,
                        'cycle'               => $source->cycle,
                        'niveau_id'           => $source->niveau_id,
                        'serie_id'            => $classe->serie_id,
                        'matiere_uuid_externe' => $source->matiere_uuid_externe,
                        'nom_matiere'         => $source->nom_matiere,
                        'code_matiere'        => $source->code_matiere,
                        'coefficient'         => $source->coefficient,
                        'est_obligatoire'     => $source->est_obligatoire,
                    ]);
                    $crees++;
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
