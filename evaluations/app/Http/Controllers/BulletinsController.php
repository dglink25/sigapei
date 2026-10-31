<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Models\Bulletin;
use App\Models\Periode;
use App\Services\BulletinPdfService;
use App\Services\BulletinService;
use App\Services\ControleAcces;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/** Bulletins et classements (CDC Tableau 7) - lecture seule. */
class BulletinsController extends Controller
{
    private const VALIDITE_LIEN_MINUTES = 5;

    public function __construct(
        private readonly BulletinService $bulletins,
        private readonly ControleAcces $acces,
    ) {}

    /** GET /v1/bulletins/apprenant/{uuid}?periode_uuid= */
    public function consulter(Request $request, string $apprenantUuid): JsonResponse
    {
        $d = $request->validate(['periode_uuid' => ['required', 'uuid']]);
        abort_unless(Str::isUuid($apprenantUuid), 404);

        $apprenant = $this->acces->lectureApprenant($apprenantUuid);
        $periode = Periode::where('uuid', $d['periode_uuid'])->firstOrFail();

        $bulletin = $this->bulletins->bulletinApprenant($periode, $apprenant);
        if ($periode->estCloturee()) {
            $bulletin['versions'] = $this->bulletins->versions($periode, $apprenantUuid);
        }

        return $this->ok($bulletin);
    }

    /**
     * GET /v1/bulletins/apprenant/{uuid}/pdf?periode_uuid= - lien de téléchargement signé, valable 5 minutes (CDC §8.2).
     * Mêmes droits que la consultation. Le lien est relatif : le front le préfixe par l'URL du service.
     */
    public function pdf(Request $request, string $apprenantUuid): JsonResponse
    {
        $d = $request->validate(['periode_uuid' => ['required', 'uuid']]);
        abort_unless(Str::isUuid($apprenantUuid), 404);

        $this->acces->lectureApprenant($apprenantUuid);
        $periode = Periode::where('uuid', $d['periode_uuid'])->firstOrFail();

        if (! $periode->estCloturee()) {
            throw MetierException::conflit('Le PDF est disponible après la clôture de la période.', 'PERIODE_NON_CLOTUREE');
        }

        $bulletin = Bulletin::where('periode_id', $periode->id)->where('apprenant_uuid', $apprenantUuid)->orderByDesc('version')->first()
            ?? throw MetierException::introuvable('Aucun bulletin archivé pour cette période.');

        $expiration = now()->addMinutes(self::VALIDITE_LIEN_MINUTES);

        return $this->ok([
            'bulletin_uuid' => $bulletin->uuid,
            'version' => $bulletin->version,
            'url' => URL::temporarySignedRoute('bulletins.telecharger', $expiration, [
                'bulletin_uuid' => $bulletin->uuid,
                'tenant' => Contexte::tenantId(),
            ], absolute: false),
            'expire_le' => $expiration->toIso8601String(),
        ]);
    }

    /**
     * GET /v1/bulletins/telecharger/{bulletin_uuid}?tenant=&expires=&signature= - le PDF lui-même.
     * Aucun en-tête d'authentification (lien ouvert par le navigateur) : la signature HMAC (APP_KEY),
     * qui couvre le bulletin, le tenant et l'expiration, est l'autorisation. Lien expiré ou modifié => 403.
     */
    public function telecharger(Request $request, string $bulletinUuid, BulletinPdfService $pdf): Response
    {
        $tenant = (string) $request->query('tenant', '');
        abort_unless(Str::isUuid($bulletinUuid) && ctype_digit($tenant) && (int) $tenant > 0, 404);

        [$contenu, $nom] = Contexte::executerPour((int) $tenant, function () use ($bulletinUuid, $pdf) {
            $bulletin = Bulletin::where('uuid', $bulletinUuid)->firstOrFail();

            return [$pdf->generer($bulletin), $pdf->nomFichier($bulletin)];
        });

        return response($contenu, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$nom.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** GET /v1/classements/classe/{uuid}?periode_uuid= */
    public function classement(Request $request, string $classeUuid): JsonResponse
    {
        $d = $request->validate(['periode_uuid' => ['required', 'uuid']]);
        abort_unless(Str::isUuid($classeUuid), 404);

        $this->acces->gestionClasse($classeUuid);
        $periode = Periode::where('uuid', $d['periode_uuid'])->firstOrFail();

        return $this->ok($this->bulletins->classement($periode, $classeUuid));
    }
}
