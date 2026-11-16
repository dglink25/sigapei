<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Models\Facture;
use App\Models\Reglement;
use App\Services\Documents;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Téléchargement des PDF par lien relatif signé et à durée courte, délivré par une route authentifiée qui a
 * contrôlé l'accès. L'établissement fait partie de la signature : le lien ne peut pas être détourné.
 */
class DocumentsController extends Controller
{
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/';

    public function __construct(private readonly Documents $documents) {}

    public function facture(Request $request, string $facture): Response
    {
        return $this->servir($request, function () use ($facture) {
            $f = Facture::where('uuid', $facture)->firstOrFail();

            return [$this->documents->facture($f), "facture-{$f->numero}.pdf"];
        });
    }

    public function recu(Request $request, string $reglement): Response
    {
        return $this->servir($request, function () use ($reglement) {
            $r = Reglement::where('uuid', $reglement)->where('statut', 'valide')->where('montant', '>', 0)->firstOrFail();

            return [$this->documents->recu($r), "recu-{$r->numero_recu}.pdf"];
        });
    }

    private function servir(Request $request, callable $produire): Response
    {
        $etab = (string) $request->query('e', '');
        abort_unless(preg_match(self::UUID, $etab) === 1, 404);

        [$pdf, $nom] = Contexte::executerPour($etab, $produire);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.preg_replace('/[^A-Za-z0-9_.-]/', '-', $nom).'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
