<?php

namespace App\Http\Controllers;

use App\Exceptions\MetierException;
use App\Models\Bulletin;
use App\Models\Periode;
use App\Services\BulletinService;
use App\Services\ControleAcces;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Bulletins et classements (CDC Tableau 7) - lecture seule. */
class BulletinsController extends Controller
{
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
     * GET /v1/bulletins/apprenant/{uuid}/pdf?periode_uuid= - URL signée et expirante (CDC §8.2).
     * Le PDF est produit après la clôture et stocké par le service Documents de la plateforme.
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

        if ($bulletin->pdf_document_uuid === null) {
            throw MetierException::conflit('Le PDF de ce bulletin n\'est pas encore disponible.', 'PDF_EN_ATTENTE');
        }

        return $this->ok(['document_uuid' => $bulletin->pdf_document_uuid, 'version' => $bulletin->version]);
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
