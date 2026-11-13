<?php

namespace App\Services;

use App\Models\Facture;
use App\Models\Reglement;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * PDF des factures et des reçus : produits à la demande depuis les données figées en base (montants et lignes
 * immuables), texte réel, sans ressource distante ni PHP dans le moteur, toutes les valeurs échappées.
 */
class Documents
{
    public function __construct(private readonly Parametres $parametres) {}

    public function facture(Facture $f): string
    {
        $f->loadMissing(['lignes', 'echeances']);
        $lignes = '';
        foreach ($f->lignes as $l) {
            $lignes .= '<tr><td class="g">'.$this->e($l->libelle).'</td><td>'.$this->e($this->nature($l->nature)).'</td><td class="d">'.$this->m($l->montant, $f->devise).'</td></tr>';
        }
        $echeances = '';
        foreach ($f->echeances as $e) {
            $echeances .= '<tr><td class="g">'.$this->e($e->libelle).'</td><td>'.$e->date_echeance->format('d/m/Y').'</td><td class="d">'.$this->m($e->montant, $f->devise).'</td></tr>';
        }
        $statut = ['emise' => 'À régler', 'partiellement_reglee' => 'Partiellement réglée', 'reglee' => 'Réglée', 'annulee' => 'Annulée'][$f->statut];

        $corps = <<<HTML
<h1>Facture {$this->e($f->numero)}</h1>
<table class="infos">
  <tr><td><strong>Apprenant :</strong> {$this->e($f->apprenant_nom)}</td><td><strong>Matricule :</strong> {$this->e($f->apprenant_matricule ?? '-')}</td></tr>
  <tr><td><strong>Classe :</strong> {$this->e($f->classe_nom ?? '-')}</td><td><strong>Année :</strong> {$this->e($f->annee_scolaire)}</td></tr>
  <tr><td><strong>Objet :</strong> {$this->e($f->libelle)}</td><td><strong>Émise le :</strong> {$f->created_at->format('d/m/Y')}</td></tr>
</table>
<table class="t"><thead><tr><th>Désignation</th><th>Nature</th><th>Montant</th></tr></thead><tbody>{$lignes}</tbody>
<tfoot><tr><td colspan="2" class="g"><strong>Total</strong></td><td class="d"><strong>{$this->m($f->montant_total, $f->devise)}</strong></td></tr>
<tr><td colspan="2" class="g">Déjà réglé</td><td class="d">{$this->m($f->montant_regle, $f->devise)}</td></tr>
<tr><td colspan="2" class="g"><strong>Reste à payer</strong></td><td class="d"><strong>{$this->m($f->resteAPayer(), $f->devise)}</strong></td></tr></tfoot></table>
<h2>Échéancier</h2>
<table class="t"><thead><tr><th>Échéance</th><th>Date</th><th>Montant</th></tr></thead><tbody>{$echeances}</tbody></table>
<p class="statut">Statut : <strong>{$this->e($statut)}</strong></p>
HTML;

        return $this->rendre("Facture {$f->numero}", $corps);
    }

    public function recu(Reglement $r): string
    {
        $f = $r->facture()->firstOrFail();
        $mode = ['en_ligne' => 'Paiement en ligne (mobile money / carte)', 'especes' => 'Espèces', 'virement' => 'Virement bancaire', 'cheque' => 'Chèque'][$r->mode];
        $mentions = $this->parametres->lire()['mentions_recu'];
        $mentionsHtml = $mentions ? '<p class="mentions">'.nl2br($this->e($mentions)).'</p>' : '';

        $corps = <<<HTML
<h1>Reçu {$this->e($r->numero_recu)}</h1>
<table class="infos">
  <tr><td><strong>Reçu de :</strong> {$this->e($f->apprenant_nom)}</td><td><strong>Matricule :</strong> {$this->e($f->apprenant_matricule ?? '-')}</td></tr>
  <tr><td><strong>Facture :</strong> {$this->e($f->numero)} - {$this->e($f->libelle)}</td><td><strong>Date du règlement :</strong> {$r->date_reglement->format('d/m/Y')}</td></tr>
  <tr><td><strong>Mode :</strong> {$this->e($mode)}</td><td><strong>Référence :</strong> {$this->e($r->piece_reference ?? $r->encaissement_uuid ?? '-')}</td></tr>
</table>
<p class="montant">Montant reçu : <strong>{$this->m($r->montant, $f->devise)}</strong></p>
<p>Reste à payer sur la facture après ce règlement et les précédents : <strong>{$this->m($f->resteAPayer(), $f->devise)}</strong>.</p>
{$mentionsHtml}
HTML;

        return $this->rendre("Reçu {$r->numero_recu}", $corps);
    }

    private function rendre(string $titre, string $corps): string
    {
        $html = <<<HTML
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>{$this->e($titre)}</title>
<style>
  @page { margin: 18mm 16mm 20mm; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 10.5pt; color: #1a1a1a; }
  h1 { font-size: 17pt; color: #006B3C; margin: 0 0 6mm; }
  h2 { font-size: 12pt; margin: 7mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; }
  .infos td { padding: 1.4mm 0; vertical-align: top; }
  .t { margin-top: 5mm; }
  .t th, .t td { border: 0.3mm solid #8a8a8a; padding: 2mm; text-align: center; }
  .t th { background: #eef3ef; font-size: 9.5pt; }
  .t .g { text-align: left; } .t .d { text-align: right; white-space: nowrap; }
  .montant { font-size: 14pt; margin: 8mm 0 4mm; }
  .statut { margin-top: 6mm; }
  .mentions { margin-top: 8mm; font-size: 9pt; color: #444; }
  .pied { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 7.5pt; color: #666; text-align: center; }
</style></head><body>{$corps}<div class="pied">Document émis par SIGAPEI le {$this->e(now()->timezone('Africa/Porto-Novo')->format('d/m/Y à H:i'))}</div></body></html>
HTML;

        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $options->setDefaultFont('DejaVu Sans');
        $options->setFontCache(storage_path('framework/cache'));
        $options->setTempDir(sys_get_temp_dir());
        $options->setChroot([base_path('vendor/dompdf/dompdf')]);

        $pdf = new Dompdf($options);
        $pdf->loadHtml($html, 'UTF-8');
        $pdf->setPaper('A4');
        $pdf->render();

        return (string) $pdf->output();
    }

    /** 125000 XOF -> "125 000 FCFA" (séparateur de milliers : espace insécable fine). */
    private function m(int $montant, string $devise): string
    {
        $libelle = in_array($devise, ['XOF', 'XAF'], true) ? 'FCFA' : $devise;

        return ($montant < 0 ? '-' : '').number_format(abs($montant), 0, ',', "\u{202F}").' '.$libelle;
    }

    private function nature(string $n): string
    {
        return ['scolarite' => 'Scolarité', 'inscription' => 'Inscription', 'cantine' => 'Cantine', 'transport' => 'Transport',
            'activite' => 'Activité', 'dossier' => 'Frais de dossier', 'autre' => 'Autre'][$n] ?? $n;
    }

    private function e(?string $v): string
    {
        return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
