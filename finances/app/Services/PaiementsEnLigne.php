<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\ContratIncompletException;
use App\Integrations\PaiementClient;
use App\Integrations\RabbitMqPublisher;
use App\Models\Facture;
use App\Models\PaiementEnLigne;
use App\Models\Reglement;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Paiement en ligne d'une facture : Finances CONSOMME le microservice Paiement (seul à parler aux agrégateurs).
 *  1. la famille (ou un profil habilité) demande à payer un montant ≤ reste à payer ;
 *  2. Finances demande un encaissement à Paiement (clé d'idempotence = uuid du paiement Finances) et renvoie
 *     l'URL de paiement de l'agrégateur ;
 *  3. Paiement notifie Finances (ou la synchronisation planifiée passe) : Finances RELIT l'encaissement chez
 *     Paiement, contrôle établissement, facture et montant, puis enregistre le règlement - une seule fois
 *     (index unique), y compris si la notification arrive plusieurs fois ; un remboursement fait chez Paiement
 *     produit un règlement négatif du même montant.
 */
class PaiementsEnLigne
{
    public function __construct(
        private readonly PaiementClient $paiement,
        private readonly Journal $journal,
        private readonly RabbitMqPublisher $evenements,
    ) {}

    public function initier(Facture $facture, int $montant, ?string $urlRetour): PaiementEnLigne
    {
        $p = DB::transaction(function () use ($facture, $montant) {
            $f = Facture::whereKey($facture->id)->lockForUpdate()->firstOrFail();
            if ($f->statut === 'annulee' || $f->statut === 'reglee') {
                throw MetierException::conflit($f->statut === 'reglee' ? 'Cette facture est déjà réglée.' : 'Cette facture est annulée.', 'FACTURE_NON_PAYABLE');
            }
            $enCours = (int) PaiementEnLigne::where('facture_id', $f->id)->whereIn('statut', ['initie', 'en_attente'])
                ->where('created_at', '>', now()->subMinutes(30))->sum('montant');
            $enAttente = (int) $f->reglements()->where('statut', 'a_valider')->sum('montant');
            $disponible = $f->resteAPayer() - $enCours - $enAttente;
            if ($montant > $disponible) {
                throw ValidationException::withMessages(['montant' => $disponible > 0
                    ? "Le montant dépasse le reste à payer ({$disponible}, paiements en cours déduits)."
                    : 'Un paiement est déjà en cours pour le reste de cette facture : patientez quelques minutes.']);
            }

            $p = new PaiementEnLigne(['montant' => $montant, 'statut' => 'initie', 'initie_par_uuid' => Contexte::utilisateurUuid()]);
            $p->facture_id = $f->id;
            $p->save();

            return $p;
        });

        try {
            $e = $this->paiement->creerEncaissement([
                'etablissement_uuid' => Contexte::etablissement(),
                'devise' => $facture->devise,
                'montant' => $montant,
                'objet_type' => 'facture',
                'objet_uuid' => $facture->uuid,
                'libelle' => mb_substr("{$facture->numero} - {$facture->libelle}", 0, 255),
                'payeur_utilisateur_uuid' => Contexte::utilisateurUuid(),
                'url_retour' => $urlRetour,
            ], $p->uuid);
        } catch (Throwable $t) {
            $p->forceFill(['statut' => 'echec_creation'])->save();
            throw $t;
        }

        $p->forceFill(['encaissement_uuid' => $e['uuid'], 'statut' => $e['statut'], 'url_paiement' => $e['url_paiement'], 'expire_le' => $e['expire_le'], 'derniere_synchro' => now()])->save();
        $this->journal->ecrire('paiement.initie', 'paiement', $p->uuid, ['facture' => $facture->numero, 'montant' => $montant, 'encaissement_uuid' => $e['uuid']]);

        return $p->fresh();
    }

    /** Relit l'encaissement chez Paiement et applique son état (idempotent). Contexte établissement requis. */
    public function synchroniser(PaiementEnLigne $p): PaiementEnLigne
    {
        if ($p->encaissement_uuid === null) {
            return $p;
        }
        $e = $this->paiement->encaissement($p->encaissement_uuid, Contexte::etablissement());
        if ($e === null) {
            throw new ContratIncompletException("Paiement ne connaît pas l'encaissement {$p->encaissement_uuid}.");
        }

        $facture = $p->facture()->firstOrFail();
        if (strtolower((string) $e['etablissement_uuid']) !== Contexte::etablissement() || $e['objet_type'] !== 'facture'
            || $e['objet_uuid'] !== $facture->uuid || (int) $e['montant'] !== $p->montant) {
            Log::critical('[PAIEMENT_INCOHERENT] Encaissement ne correspondant pas au paiement Finances', ['paiement' => $p->uuid, 'encaissement' => $e]);
            throw new ContratIncompletException('Encaissement incohérent avec la demande de paiement.');
        }

        $acquis = in_array($e['statut'], PaiementClient::ETATS_ACQUIS, true);
        $net = $acquis ? $p->montant - (int) ($e['montant_rembourse'] ?? 0) : 0;

        $nouveau = DB::transaction(function () use ($p, $e, $facture, $acquis, $net) {
            PaiementEnLigne::whereKey($p->id)->lockForUpdate()->first();
            $p->forceFill(['statut' => $e['statut'], 'derniere_synchro' => now()])->save();
            if (! $acquis) {
                return false;
            }

            $dejaCompte = (int) Reglement::where('encaissement_uuid', $p->encaissement_uuid)->where('statut', 'valide')->sum('montant');
            $ecart = $net - $dejaCompte;
            if ($ecart === 0) {
                return false;
            }

            try {
                DB::transaction(function () use ($p, $e, $facture, $ecart) {
                    $r = new Reglement([
                        'mode' => 'en_ligne',
                        'montant' => $ecart,
                        'statut' => 'valide',
                        'date_reglement' => substr((string) ($e['approuve_le'] ?? now()->toDateString()), 0, 10),
                        'encaissement_uuid' => $p->encaissement_uuid,
                        'commentaire' => $ecart > 0 ? 'Paiement en ligne' : 'Remboursement du paiement en ligne',
                        'valide_le' => now(),
                        'numero_recu' => $ecart > 0 ? $this->journal->numero('RE') : null,
                    ]);
                    $r->facture_id = $facture->id;
                    $r->save();
                });
            } catch (QueryException $ex) {
                if (str_contains($ex->getMessage(), 'reglements_encaissement_unique')) {
                    return false; // notification concurrente : déjà enregistré
                }
                if (str_contains($ex->getMessage(), 'depasse le montant')) {
                    Log::critical('[TROP_PERCU] Paiement en ligne au-delà du reste à payer', ['paiement' => $p->uuid, 'facture' => $facture->numero]);
                    $this->evenements->publier('finances.trop_percu', ['etablissement_uuid' => $facture->etablissement_uuid, 'facture_uuid' => $facture->uuid, 'encaissement_uuid' => $p->encaissement_uuid]);

                    return false;
                }
                throw $ex;
            }

            return true;
        });

        if ($nouveau) {
            $this->evenements->publier('finances.paiement.confirme', [
                'etablissement_uuid' => $facture->etablissement_uuid, 'facture_uuid' => $facture->uuid, 'apprenant_uuid' => $facture->apprenant_uuid, 'encaissement_uuid' => $p->encaissement_uuid,
            ]);
        }

        return $p->fresh();
    }
}
