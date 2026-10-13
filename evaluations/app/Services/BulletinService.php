<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Integrations\ScolariteClient;
use App\Jobs\CloturerPeriode;
use App\Models\Bulletin;
use App\Models\Evaluation;
use App\Models\Note;
use App\Models\Periode;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Bulletins (CDC §3.2, §8) :
 *  - période ouverte  : bulletin calculé à la volée depuis `notes` (cache court, invalidé à chaque écriture) ;
 *  - clôture          : instantané figé par apprenant (table `bulletins`, version 1), en tâche de fond ;
 *  - correction après clôture : nouvelle version pour chaque bulletin de la classe dont le contenu change
 *    (une note corrigée peut changer le rang des camarades) ; les anciennes versions restent consultables.
 * Tout calcul passe par CalculService : même résultat pour l'écran, le PDF et l'API interne.
 */
class BulletinService
{
    private const CACHE_TTL = 600;

    public function __construct(
        private readonly CalculService $calcul,
        private readonly ParametresService $parametres,
        private readonly ScolariteClient $scolarite,
        private readonly RabbitMqPublisher $publisher,
    ) {}

    // ------------------------------------------------------------------ Lecture

    /** Bulletin d'un apprenant : instantané (période clôturée) ou calcul à la volée (période ouverte). */
    public function bulletinApprenant(Periode $periode, array $apprenant): array
    {
        if ($periode->estCloturee()) {
            $bulletin = Bulletin::where('periode_id', $periode->id)
                ->where('apprenant_uuid', $apprenant['uuid'])
                ->orderByDesc('version')
                ->first()
                ?? throw MetierException::introuvable('Aucun bulletin archivé pour cet apprenant sur cette période.');

            return $this->presenterArchive($bulletin);
        }

        $classeUuid = $apprenant['classe']['uuid'] ?? throw MetierException::introuvable("L'apprenant n'est rattaché à aucune classe.");
        $calcul = $this->calculerClasse($periode, $classeUuid);

        if (! isset($calcul['bulletins'][$apprenant['uuid']])) {
            throw MetierException::introuvable("L'apprenant n'est pas inscrit dans cette classe.");
        }

        return $this->composer($calcul, $apprenant['uuid'], $periode) + ['provisoire' => true, 'version' => null];
    }

    /** Historique des versions archivées (consultation des anciennes versions après correction). */
    public function versions(Periode $periode, string $apprenantUuid): array
    {
        return Bulletin::where('periode_id', $periode->id)
            ->where('apprenant_uuid', $apprenantUuid)
            ->orderByDesc('version')
            ->get(['uuid', 'version', 'moyenne', 'rang', 'motif_version', 'genere_le', 'pdf_document_uuid'])
            ->toArray();
    }

    /** Classement et statistiques d'une classe (CDC §7). */
    public function classement(Periode $periode, string $classeUuid): array
    {
        $calcul = $this->calculerClasse($periode, $classeUuid);

        $lignes = [];
        foreach ($calcul['bulletins'] as $uuid => $b) {
            $a = $calcul['apprenants'][$uuid];
            $lignes[] = [
                'apprenant_uuid' => $uuid,
                'nom' => $a['nom'] ?? null,
                'prenom' => $a['prenom'] ?? null,
                'moyenne' => $b['moyenne'],
                'rang' => $calcul['rangs'][$uuid]['rang'],
                'ex_aequo' => $calcul['rangs'][$uuid]['ex_aequo'],
                'mention' => $b['mention'],
            ];
        }

        usort($lignes, fn ($x, $y) => [$x['rang'] ?? PHP_INT_MAX, $x['nom'], $x['prenom']] <=> [$y['rang'] ?? PHP_INT_MAX, $y['nom'], $y['prenom']]);

        return [
            'periode' => ['uuid' => $periode->uuid, 'libelle' => $periode->libelle, 'statut' => $periode->statut],
            'classe_uuid' => $classeUuid,
            'classement_actif' => $calcul['regles']['classement_actif'],
            'moyenne_classe' => $calcul['statistiques']['moyenne_classe'],
            'effectif_classe' => count($calcul['bulletins']),
            'effectif_classes' => $calcul['statistiques']['effectif_classe'],
            'distribution' => $calcul['statistiques']['par_matiere'],
            'apprenants' => $calcul['regles']['classement_actif'] ? $lignes : array_map(fn ($l) => array_diff_key($l, ['rang' => 1, 'ex_aequo' => 1]), $lignes),
        ];
    }

    // ------------------------------------------------------------------ Clôture

    /** Lance la clôture (asynchrone) ; passage atomique ouverte -> en_cloture pour empêcher toute double clôture. */
    public function demanderCloture(Periode $periode): void
    {
        $bascule = Periode::whereKey($periode->id)->where('statut', 'ouverte')->update(['statut' => 'en_cloture', 'updated_at' => now()]);

        if ($bascule !== 1) {
            throw MetierException::conflit('Cette période est déjà clôturée ou en cours de clôture.', 'PERIODE_NON_OUVERTE');
        }

        CloturerPeriode::dispatch(Contexte::tenantId(), $periode->uuid, Contexte::utilisateur());
    }

    /** Exécutée par le job : calcule toutes les classes puis écrit tout ou rien. */
    public function executerCloture(Periode $periode, string $auteurUuid): void
    {
        if ($periode->statut !== 'en_cloture') {
            return; // déjà traitée (job rejoué) : idempotent
        }

        $classes = Evaluation::where('periode_id', $periode->id)->distinct()->orderBy('classe_uuid')->pluck('classe_uuid');

        // Phase 1 : tous les calculs (appels à Scolarité) hors transaction.
        $calculs = [];
        foreach ($classes as $classeUuid) {
            $calculs[$classeUuid] = $this->calculerClasseSansCache($periode, $classeUuid);
        }

        // Phase 2 : écriture atomique des instantanés et du statut.
        DB::transaction(function () use ($periode, $calculs, $auteurUuid) {
            foreach ($calculs as $classeUuid => $calcul) {
                foreach (array_keys($calcul['bulletins']) as $apprenantUuid) {
                    $existe = Bulletin::where('periode_id', $periode->id)->where('apprenant_uuid', $apprenantUuid)->exists();
                    if (! $existe) {
                        $this->archiver($periode, $calcul, $apprenantUuid, 1, null, $auteurUuid);
                    }
                }
            }

            Periode::whereKey($periode->id)->where('statut', 'en_cloture')->update([
                'statut' => 'cloturee',
                'cloturee_par_uuid' => $auteurUuid,
                'cloturee_le' => now(),
                'updated_at' => now(),
            ]);

            foreach ($calculs as $classeUuid => $calcul) {
                $this->publisher->publier('evaluations.bulletin.publie', [
                    'tenant_id' => Contexte::tenantId(),
                    'periode_uuid' => $periode->uuid,
                    'classe_uuid' => $classeUuid,
                    'apprenants_uuids' => array_keys($calcul['bulletins']),
                ]);
            }
            $this->publisher->publier('evaluations.periode.cloturee', [
                'tenant_id' => Contexte::tenantId(),
                'periode_uuid' => $periode->uuid,
            ]);
        });
    }

    /** Échec définitif du job : la période redevient ouverte, rien n'a été écrit (transaction). */
    public function annulerCloture(Periode $periode): void
    {
        Periode::whereKey($periode->id)->where('statut', 'en_cloture')->update(['statut' => 'ouverte', 'updated_at' => now()]);
    }

    /**
     * Après correction d'une note sur une période clôturée : nouvelle version pour chaque bulletin
     * de la classe dont le contenu a changé. À appeler dans la transaction de la correction.
     *
     * @return list<string> uuids des apprenants dont le bulletin a changé
     */
    public function regenererApresCorrection(Periode $periode, string $classeUuid, string $motif, string $auteurUuid): array
    {
        $calcul = $this->calculerClasseSansCache($periode, $classeUuid);
        $modifies = [];

        foreach (array_keys($calcul['bulletins']) as $apprenantUuid) {
            $dernier = Bulletin::where('periode_id', $periode->id)->where('apprenant_uuid', $apprenantUuid)
                ->orderByDesc('version')->lockForUpdate()->first();

            if ($dernier === null) {
                continue; // apprenant arrivé après la clôture : pas de bulletin archivé pour cette période
            }

            $contenu = $this->contenuArchive($calcul, $apprenantUuid, $periode);
            if (! hash_equals($dernier->empreinte, $this->empreinte($contenu))) {
                $this->archiver($periode, $calcul, $apprenantUuid, $dernier->version + 1, $motif, $auteurUuid);
                $modifies[] = $apprenantUuid;
            }
        }

        if ($modifies !== []) {
            $this->publisher->publier('evaluations.bulletin.corrige', [
                'tenant_id' => Contexte::tenantId(),
                'periode_uuid' => $periode->uuid,
                'classe_uuid' => $classeUuid,
                'apprenants_uuids' => $modifies,
            ]);
        }

        return $modifies;
    }

    /** Invalide le cache de calcul d'une classe (appelé à chaque écriture de note). */
    public function invalider(Periode $periode, string $classeUuid): void
    {
        $cle = $this->cleVersion($periode, $classeUuid);
        Cache::add($cle, 0, now()->addDays(30));
        Cache::increment($cle);
    }

    // ------------------------------------------------------------------ Calcul

    public function calculerClasse(Periode $periode, string $classeUuid): array
    {
        $version = (int) Cache::get($this->cleVersion($periode, $classeUuid), 0);
        $cle = sprintf('bulletins:%d:%s:%s:v%d', Contexte::tenantId(), $periode->uuid, $classeUuid, $version);

        return Cache::remember($cle, self::CACHE_TTL, fn () => $this->calculerClasseSansCache($periode, $classeUuid));
    }

    public function calculerClasseSansCache(Periode $periode, string $classeUuid): array
    {
        $parametres = $this->parametres->pour($periode->cycle);
        $regles = $parametres->regles();
        $apprenants = $this->scolarite->apprenantsDeClasse($classeUuid);

        $classe = $apprenants === [] ? null : reset($apprenants)['classe'];
        if ($classe !== null && ($classe['cycle'] ?? null) !== $periode->cycle) {
            throw MetierException::conflit("Cette classe n'appartient pas au cycle de la période.", 'CYCLE_INCOHERENT');
        }

        $evaluations = Evaluation::with(['matiere.coefficients', 'rattrapageDe:id,uuid'])
            ->where('periode_id', $periode->id)
            ->where('classe_uuid', $classeUuid)
            ->orderBy('matiere_id')->orderBy('date_evaluation')->orderBy('id')
            ->get();

        $notes = Note::whereIn('evaluation_id', $evaluations->pluck('id'))
            ->get(['evaluation_id', 'apprenant_uuid', 'statut', 'valeur', 'niveau_competence'])
            ->groupBy('apprenant_uuid')
            ->map(fn ($n) => $n->keyBy('evaluation_id'));

        $bulletins = [];
        foreach ($apprenants as $apprenantUuid => $a) {
            $lignes = [];
            foreach ($evaluations as $ev) {
                $note = $notes->get($apprenantUuid)?->get($ev->id);
                $lignes[] = [
                    'evaluation_uuid' => $ev->uuid,
                    'type' => $ev->type,
                    'matiere_uuid' => $ev->matiere->uuid,
                    'matiere_nom' => $ev->matiere->nom,
                    'coef_matiere' => $ev->matiere->coefficientPour($periode->cycle, (string) ($classe['niveau'] ?? '')),
                    'coef_evaluation' => (string) $ev->coefficient,
                    'note_sur' => (string) $ev->note_sur,
                    'rattrapage_de' => $ev->rattrapageDe?->uuid,
                    'note' => $note === null ? null : [
                        'statut' => $note->statut,
                        'valeur' => $note->valeur === null ? null : (string) $note->valeur,
                        'niveau_competence' => $note->niveau_competence,
                    ],
                ];
            }
            $bulletins[$apprenantUuid] = $this->calcul->calculerBulletin($lignes, $regles);
        }

        $rangs = $this->calcul->calculerRangs(
            array_map(fn ($b) => $b['_moyenne_echelle'], $bulletins),
            $regles['decimales'],
            $regles['classement_actif'],
        );

        return [
            'classe' => $classe,
            'apprenants' => $apprenants,
            'regles' => $regles,
            'bulletins' => $bulletins,
            'rangs' => $rangs,
            'statistiques' => $this->calcul->statistiquesClasse(array_values($bulletins), $regles['decimales']),
        ];
    }

    // ------------------------------------------------------------------ Présentation / archivage

    private function composer(array $calcul, string $apprenantUuid, Periode $periode): array
    {
        $b = $calcul['bulletins'][$apprenantUuid];
        $a = $calcul['apprenants'][$apprenantUuid];
        $stats = array_column($calcul['statistiques']['par_matiere'], null, 'matiere_uuid');
        $rang = $calcul['rangs'][$apprenantUuid];

        $matieres = array_map(function ($ligne) use ($stats) {
            unset($ligne['_moyenne_echelle']);
            $s = $stats[$ligne['matiere_uuid']] ?? null;

            return $ligne + [
                'moyenne_classe' => $s['moyenne'] ?? null,
                'min_classe' => $s['min'] ?? null,
                'max_classe' => $s['max'] ?? null,
            ];
        }, $b['matieres']);

        return [
            'apprenant' => [
                'uuid' => $apprenantUuid,
                'nom' => $a['nom'] ?? null,
                'prenom' => $a['prenom'] ?? null,
                'matricule' => $a['matricule'] ?? null,
            ],
            'classe' => [
                'uuid' => $calcul['classe']['uuid'] ?? null,
                'nom' => $calcul['classe']['nom'] ?? null,
                'cycle' => $calcul['classe']['cycle'] ?? null,
                'niveau' => $calcul['classe']['niveau'] ?? null,
                'programme' => $calcul['classe']['programme'] ?? null,
            ],
            'periode' => [
                'uuid' => $periode->uuid,
                'libelle' => $periode->libelle,
                'annee_scolaire' => $periode->annee_scolaire,
            ],
            'moyenne' => $b['moyenne'],
            'mention' => $b['mention'],
            'rang' => $rang['rang'],
            'ex_aequo' => $rang['ex_aequo'],
            'effectif' => count($calcul['bulletins']),
            'moyenne_classe' => $calcul['statistiques']['moyenne_classe'],
            'matieres' => $matieres,
            'regles_appliquees' => $b['regles_appliquees'],
        ];
    }

    private function contenuArchive(array $calcul, string $apprenantUuid, Periode $periode): array
    {
        return $this->composer($calcul, $apprenantUuid, $periode);
    }

    private function archiver(Periode $periode, array $calcul, string $apprenantUuid, int $version, ?string $motif, string $auteurUuid): Bulletin
    {
        $contenu = $this->contenuArchive($calcul, $apprenantUuid, $periode);

        $bulletin = new Bulletin([
            'apprenant_uuid' => $apprenantUuid,
            'classe_uuid' => $calcul['classe']['uuid'],
            'version' => $version,
            'moyenne' => $contenu['moyenne'],
            'rang' => $contenu['rang'],
            'ex_aequo' => $contenu['ex_aequo'],
            'effectif' => $contenu['effectif'],
            'moyenne_classe' => $contenu['moyenne_classe'],
            'mention' => $contenu['mention'],
            'contenu' => $contenu,
            'empreinte' => $this->empreinte($contenu),
            'motif_version' => $motif,
            'genere_par_uuid' => $auteurUuid,
            'genere_le' => now(),
        ]);
        $bulletin->periode_id = $periode->id;
        $bulletin->save();

        return $bulletin;
    }

    private function presenterArchive(Bulletin $bulletin): array
    {
        return $bulletin->contenu + [
            'provisoire' => false,
            'version' => $bulletin->version,
            'bulletin_uuid' => $bulletin->uuid,
            'genere_le' => $bulletin->genere_le?->toIso8601String(),
            'motif_version' => $bulletin->motif_version,
        ];
    }

    private function empreinte(array $contenu): string
    {
        return hash('sha256', json_encode($contenu, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function cleVersion(Periode $periode, string $classeUuid): string
    {
        return sprintf('bulletins-version:%d:%s:%s', Contexte::tenantId(), $periode->uuid, $classeUuid);
    }
}
