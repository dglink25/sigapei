<?php

namespace App\Services;

use App\Models\Bulletin;
use App\Models\ModeleBulletin;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * PDF d'un bulletin archivé (CDC §8.2).
 *
 * Le PDF est produit à la demande depuis l'instantané figé à la clôture (bulletins.contenu, immuable
 * en base) : il est donc toujours identique pour une même version, sans fichier à stocker ni à
 * synchroniser. L'empreinte SHA-256 de l'instantané est imprimée en pied de page (contrôle d'authenticité).
 * La mise en page suit le modèle de bulletin du cycle (en-tête, colonnes, mentions) s'il existe.
 *
 * Sécurité : aucune ressource distante chargée, PHP désactivé dans le moteur, toutes les valeurs échappées.
 */
class BulletinPdfService
{
    private const COLONNES_DEFAUT = ['matiere', 'coefficient', 'moyenne', 'moyenne_classe', 'min_classe', 'max_classe'];

    private const LIBELLES = [
        'matiere' => 'Matière',
        'coefficient' => 'Coef.',
        'notes' => 'Notes',
        'moyenne' => 'Moyenne',
        'moyenne_classe' => 'Moy. classe',
        'min_classe' => 'Min.',
        'max_classe' => 'Max.',
        'rang' => 'Rang',
        'appreciation' => 'Appréciation',
    ];

    public function generer(Bulletin $bulletin): string
    {
        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $options->setDefaultFont('DejaVu Sans');
        $options->setFontCache(storage_path('framework/cache'));
        $options->setTempDir(sys_get_temp_dir());
        $options->setChroot([base_path('vendor/dompdf/dompdf')]);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($this->html($bulletin), 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        return (string) $dompdf->output();
    }

    public function nomFichier(Bulletin $bulletin): string
    {
        $c = $bulletin->contenu;
        $base = implode('-', array_filter([
            'bulletin',
            $c['apprenant']['matricule'] ?? null,
            $c['periode']['libelle'] ?? null,
            'v'.$bulletin->version,
        ]));

        return preg_replace('/[^A-Za-z0-9_-]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base) ?: 'bulletin').'.pdf';
    }

    public function html(Bulletin $bulletin): string
    {
        $c = $bulletin->contenu;
        $modele = ModeleBulletin::where('cycle', (string) ($c['classe']['cycle'] ?? ''))->first();

        $colonnes = $modele?->colonnes_affichees ?: self::COLONNES_DEFAUT;
        $titre = $modele?->en_tete['titre'] ?? 'Bulletin de notes';
        $sousTitre = $modele?->en_tete['sous_titre'] ?? null;
        $e = fn ($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $tiret = fn ($v) => $v === null || $v === '' ? '-' : $e($v);

        $entetes = implode('', array_map(fn ($col) => '<th>'.$e(self::LIBELLES[$col] ?? $col).'</th>', $colonnes));

        $lignes = '';
        foreach ($c['matieres'] ?? [] as $m) {
            $cellules = '';
            foreach ($colonnes as $col) {
                $cellules .= match ($col) {
                    'matiere' => '<td class="g">'.$e($m['matiere_nom'] ?? '').'</td>',
                    'notes' => '<td class="g">'.$this->notes($m['notes'] ?? [], $e).'</td>',
                    'appreciation' => '<td class="g">'.$tiret($m['mention'] ?? null).'</td>',
                    'rang' => '<td>'.$tiret($m['rang'] ?? null).'</td>',
                    default => '<td>'.$tiret($m[$col] ?? null).'</td>',
                };
            }
            $lignes .= "<tr>{$cellules}</tr>";
        }

        $rang = $c['rang'] === null ? '-' : $e($c['rang']).($c['ex_aequo'] ? ' (ex æquo)' : '').' / '.$e($c['effectif']);
        $version = $bulletin->version > 1 ? ' - version '.$e($bulletin->version).($bulletin->motif_version ? ' ('.$e($bulletin->motif_version).')' : '') : '';
        $mentions = $modele?->mentions_bas_de_page ? '<p class="mentions">'.nl2br($e($modele->mentions_bas_de_page)).'</p>' : '';
        $date = $bulletin->genere_le?->timezone('Africa/Porto-Novo')->format('d/m/Y à H:i');

        return <<<HTML
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>{$e($titre)}</title>
<style>
  @page { margin: 18mm 14mm 20mm; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 10pt; color: #1a1a1a; }
  h1 { font-size: 16pt; margin: 0 0 2mm; text-align: center; }
  .sous-titre { text-align: center; margin: 0 0 6mm; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  .identite td { padding: 1.5mm 0; }
  .notes th, .notes td { border: 0.3mm solid #777; padding: 1.8mm 2mm; text-align: center; }
  .notes th { background: #eceff3; font-size: 9pt; }
  .notes td.g { text-align: left; }
  .synthese { margin-top: 6mm; }
  .synthese td { border: 0.3mm solid #777; padding: 2.5mm; width: 25%; }
  .synthese strong { font-size: 12pt; }
  .mentions { margin-top: 6mm; font-size: 9pt; }
  .pied { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 7pt; color: #666; }
</style></head>
<body>
  <h1>{$e($titre)}</h1>
  <p class="sous-titre">{$e($sousTitre ?? '')}</p>
  <table class="identite">
    <tr><td><strong>Apprenant :</strong> {$e(trim(($c['apprenant']['nom'] ?? '').' '.($c['apprenant']['prenom'] ?? '')))}</td>
        <td><strong>Matricule :</strong> {$tiret($c['apprenant']['matricule'] ?? null)}</td></tr>
    <tr><td><strong>Classe :</strong> {$tiret($c['classe']['nom'] ?? null)}</td>
        <td><strong>Période :</strong> {$e($c['periode']['libelle'] ?? '')} - {$e($c['periode']['annee_scolaire'] ?? '')}</td></tr>
  </table>
  <br>
  <table class="notes"><thead><tr>{$entetes}</tr></thead><tbody>{$lignes}</tbody></table>
  <table class="synthese"><tr>
    <td>Moyenne générale<br><strong>{$tiret($c['moyenne'] ?? null)}</strong></td>
    <td>Rang<br><strong>{$rang}</strong></td>
    <td>Moyenne de la classe<br><strong>{$tiret($c['moyenne_classe'] ?? null)}</strong></td>
    <td>Appréciation<br><strong>{$tiret($c['mention'] ?? null)}</strong></td>
  </tr></table>
  {$mentions}
  <div class="pied">Bulletin archivé le {$e($date)}{$version} - empreinte SHA-256 : {$e($bulletin->empreinte)}</div>
</body></html>
HTML;
    }

    private function notes(array $notes, callable $e): string
    {
        $morceaux = [];
        foreach ($notes as $n) {
            $morceaux[] = match ($n['statut'] ?? null) {
                'saisie' => $e($n['valeur'] ?? $n['niveau_competence'] ?? '').(($n['note_sur'] ?? '20') !== '20.00' && isset($n['valeur']) ? '/'.$e(rtrim(rtrim((string) $n['note_sur'], '0'), '.')) : ''),
                'absent_justifie' => 'AJ',
                'absent_non_justifie' => 'ANJ',
                'dispense' => 'D',
                default => '-',
            };
        }

        return implode(' · ', $morceaux);
    }
}
