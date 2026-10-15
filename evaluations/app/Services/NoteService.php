<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Integrations\ScolariteClient;
use App\Models\AuditNote;
use App\Models\Evaluation;
use App\Models\Note;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Saisie et correction des notes (CDC §3.2, §9, §16).
 *
 * Saisie (enseignant) : uniquement sur SES évaluations, s'il est toujours affecté, période ouverte,
 * saisie non verrouillée, apprenants réellement inscrits dans la classe. Toute modification d'une
 * note existante exige la version lue (verrou optimiste) et est tracée dans audit_note.
 * Correction (administrateur) : motif obligatoire, possible après clôture ; les bulletins archivés
 * concernés reçoivent alors une nouvelle version.
 */
class NoteService
{
    private const MOTIF_SAISIE = 'Modification par l\'enseignant pendant la période de saisie';

    public function __construct(
        private readonly ControleAcces $acces,
        private readonly ScolariteClient $scolarite,
        private readonly ParametresService $parametres,
        private readonly CalculService $calcul,
        private readonly BulletinService $bulletins,
        private readonly RabbitMqPublisher $publisher,
    ) {}

    /**
     * @param  list<array{apprenant_uuid: string, statut: string, valeur?: ?string, niveau_competence?: ?string, commentaire?: ?string, version?: ?int}>  $saisies
     * @return list<Note>
     */
    public function saisir(Evaluation $evaluation, array $saisies): array
    {
        $evaluation->loadMissing(['periode', 'matiere']);
        $periode = $evaluation->periode;

        $this->acces->enseignantDeLEvaluation($evaluation->enseignant_uuid, $evaluation->matiere->uuid, $evaluation->classe_uuid);

        if (! $periode->estOuverte()) {
            throw MetierException::conflit('La période est clôturée : la saisie est fermée. Contactez l\'administration pour une correction.', 'PERIODE_CLOTUREE');
        }
        if ($evaluation->saisie_cloturee_le !== null) {
            throw MetierException::conflit('Vous avez déjà verrouillé la saisie de cette évaluation.', 'SAISIE_VERROUILLEE');
        }

        $inscrits = $this->scolarite->apprenantsDeClasse($evaluation->classe_uuid);
        $grille = $this->parametres->pour($periode->cycle)->grille;

        foreach ($saisies as $i => $s) {
            if (! isset($inscrits[$s['apprenant_uuid']])) {
                throw ValidationException::withMessages(["notes.{$i}.apprenant_uuid" => "Cet apprenant n'est pas inscrit dans la classe de l'évaluation."]);
            }
            $this->validerContenu($s, $evaluation, $grille, "notes.{$i}");
        }

        $utilisateur = Contexte::utilisateur();

        $notes = DB::transaction(function () use ($evaluation, $saisies, $utilisateur) {
            $resultat = [];
            foreach ($saisies as $i => $s) {
                $note = Note::where('evaluation_id', $evaluation->id)
                    ->where('apprenant_uuid', $s['apprenant_uuid'])
                    ->lockForUpdate()
                    ->first();

                if ($note === null) {
                    $note = new Note([
                        'apprenant_uuid' => $s['apprenant_uuid'],
                        'saisi_par_uuid' => $utilisateur['uuid'],
                        'saisi_le' => now(),
                        'version' => 1,
                    ]);
                    $note->evaluation_id = $evaluation->id;
                    $this->appliquer($note, $s);
                    $note->save();
                } else {
                    $this->verifierVersion($note, $s['version'] ?? null, "notes.{$i}.version");
                    $this->modifier($note, $s, $utilisateur, self::MOTIF_SAISIE, false);
                }

                $resultat[] = $note;
            }

            return $resultat;
        });

        $this->bulletins->invalider($periode, $evaluation->classe_uuid);

        return $notes;
    }

    /** Correction tracée par l'administrateur, y compris après clôture (CDC §9). */
    public function corriger(Note $note, array $donnees): Note
    {
        $note->loadMissing('evaluation.periode', 'evaluation.matiere');
        $evaluation = $note->evaluation;
        $periode = $evaluation->periode;

        if ($periode->statut === 'en_cloture') {
            throw MetierException::conflit('La clôture de la période est en cours : réessayez dans quelques minutes.', 'CLOTURE_EN_COURS');
        }

        $grille = $this->parametres->pour($periode->cycle)->grille;
        $this->validerContenu($donnees, $evaluation, $grille, '');

        $utilisateur = Contexte::utilisateur();
        $apresCloture = $periode->estCloturee();

        DB::transaction(function () use ($note, $donnees, $utilisateur, $apresCloture, $periode, $evaluation) {
            $verrouillee = Note::whereKey($note->id)->lockForUpdate()->firstOrFail();
            $this->verifierVersion($verrouillee, $donnees['version'] ?? null, 'version');
            $this->modifier($verrouillee, $donnees, $utilisateur, trim($donnees['motif']), $apresCloture);
            $note->setRawAttributes($verrouillee->getAttributes(), true);

            if ($apresCloture) {
                $this->bulletins->regenererApresCorrection($periode, $evaluation->classe_uuid, trim($donnees['motif']), $utilisateur['uuid']);
            }

            $this->publisher->publier('evaluations.note.corrigee', [
                'tenant_id' => Contexte::tenantId(),
                'note_uuid' => $note->uuid,
                'apprenant_uuid' => $note->apprenant_uuid,
                'apres_cloture' => $apresCloture,
            ]);
        });

        $this->bulletins->invalider($periode, $evaluation->classe_uuid);

        return $note;
    }

    // ------------------------------------------------------------------------------------------

    private function modifier(Note $note, array $s, array $utilisateur, string $motif, bool $apresCloture): void
    {
        $avant = ['statut' => $note->statut, 'valeur' => $note->valeur, 'niveau' => $note->niveau_competence];
        $this->appliquer($note, $s);

        if (! $note->isDirty(['statut', 'valeur', 'niveau_competence', 'commentaire'])) {
            return; // rien n'a changé : ni version, ni audit
        }

        $note->version = $note->version + 1;
        $note->modifie_par_uuid = $utilisateur['uuid'];
        $note->save();

        if ($avant['statut'] !== $note->statut || $avant['valeur'] !== $note->valeur || $avant['niveau'] !== $note->niveau_competence) {
            $audit = new AuditNote([
                'auteur_uuid' => $utilisateur['uuid'],
                'auteur_role' => $utilisateur['roleCode'],
                'statut_avant' => $avant['statut'],
                'valeur_avant' => $avant['valeur'],
                'statut_apres' => $note->statut,
                'valeur_apres' => $note->valeur,
                'motif' => $motif,
                'apres_cloture' => $apresCloture,
                'cree_le' => now(),
            ]);
            $audit->note_id = $note->id;
            $audit->save();
        }
    }

    private function appliquer(Note $note, array $s): void
    {
        $saisie = $s['statut'] === 'saisie';
        $note->statut = $s['statut'];
        $note->valeur = $saisie && isset($s['valeur']) ? $this->normaliserTexte((string) $s['valeur']) : null;
        $note->niveau_competence = $saisie ? ($s['niveau_competence'] ?? null) : null;
        if (array_key_exists('commentaire', $s)) {
            $note->commentaire = $s['commentaire'];
        }
    }

    private function validerContenu(array $s, Evaluation $evaluation, $grille, string $prefixe): void
    {
        $cle = fn (string $champ) => ltrim("{$prefixe}.{$champ}", '.');

        if ($s['statut'] !== 'saisie') {
            return;
        }

        if ($grille->type_notation === 'competences') {
            $codes = array_column($grille->niveaux_competence ?? [], 'code');
            if (! in_array($s['niveau_competence'] ?? null, $codes, true)) {
                throw ValidationException::withMessages([$cle('niveau_competence') => 'Niveau de compétence attendu parmi : '.implode(', ', $codes).'.']);
            }
            if (isset($s['valeur'])) {
                throw ValidationException::withMessages([$cle('valeur') => 'Ce barème ne prévoit pas de note chiffrée.']);
            }

            return;
        }

        if (! isset($s['valeur'])) {
            throw ValidationException::withMessages([$cle('valeur') => 'La note est obligatoire pour une note saisie.']);
        }

        try {
            $this->calcul->validerValeur((string) $s['valeur'], (string) $evaluation->note_sur);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([$cle('valeur') => $e->getMessage()]);
        }
    }

    private function verifierVersion(Note $note, ?int $version, string $champ): void
    {
        if ($version === null) {
            throw ValidationException::withMessages([$champ => 'La version de la note est obligatoire pour la modifier (rechargez la grille).']);
        }
        if ($version !== $note->version) {
            throw MetierException::conflit('Cette note a été modifiée entre-temps. Rechargez la grille avant de la modifier.', 'NOTE_MODIFIEE_ENTRE_TEMPS');
        }
    }

    /** "12.5" et "12.50" représentent la même note : forme canonique à 2 décimales. */
    private function normaliserTexte(string $valeur): string
    {
        [$entier, $decimales] = array_pad(explode('.', $valeur, 2), 2, '');

        return ((string) (int) $entier).'.'.str_pad($decimales, 2, '0');
    }
}
