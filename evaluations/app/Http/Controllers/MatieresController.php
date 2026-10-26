<?php

namespace App\Http\Controllers;

use App\Exceptions\MetierException;
use App\Models\CoefficientMatiere;
use App\Models\Matiere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Référentiel des matières et coefficients par niveau (CDC §5, §13.1). */
class MatieresController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['actives' => ['nullable', 'boolean']]);

        return $this->page(
            Matiere::with('coefficients')
                ->when($request->boolean('actives', true), fn ($q) => $q->where('active', true))
                ->orderBy('nom')
                ->paginate($this->parPage($request))
        );
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_-]+$/'],
            'nom' => ['required', 'string', 'max:150'],
            'coefficient_defaut' => ['required', 'decimal:0,2', 'gt:0', 'max:99'],
        ]);

        if (Matiere::where('code', $d['code'])->exists()) {
            throw MetierException::conflit('Une matière avec ce code existe déjà.', 'CODE_DEJA_UTILISE');
        }

        $matiere = Matiere::create($d + ['active' => true]);

        return $this->ok($matiere->fresh(), 'Matière créée.', 201);
    }

    public function modifier(Request $request, Matiere $matiere): JsonResponse
    {
        $d = $request->validate([
            'nom' => ['sometimes', 'string', 'max:150'],
            'coefficient_defaut' => ['sometimes', 'decimal:0,2', 'gt:0', 'max:99'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $matiere->update($d);

        return $this->ok($matiere->fresh('coefficients'), 'Matière mise à jour.');
    }

    /** PUT /v1/matieres/{uuid}/coefficients - remplace les coefficients par niveau. */
    public function coefficients(Request $request, Matiere $matiere): JsonResponse
    {
        $d = $request->validate([
            'coefficients' => ['present', 'array', 'max:60'],
            'coefficients.*.cycle' => ['required', Rule::in(['primaire', 'secondaire', 'universitaire'])],
            'coefficients.*.niveau' => ['required', 'string', 'max:50'],
            'coefficients.*.coefficient' => ['required', 'decimal:0,2', 'gt:0', 'max:99'],
        ]);

        $cles = array_map(fn ($c) => $c['cycle'].'|'.$c['niveau'], $d['coefficients']);
        if (count($cles) !== count(array_unique($cles))) {
            throw MetierException::conflit('Un même niveau apparaît deux fois.', 'NIVEAU_EN_DOUBLE');
        }

        DB::transaction(function () use ($matiere, $d) {
            CoefficientMatiere::where('matiere_id', $matiere->id)->delete();
            foreach ($d['coefficients'] as $c) {
                $coef = new CoefficientMatiere($c);
                $coef->matiere_id = $matiere->id;
                $coef->save();
            }
        });

        return $this->ok($matiere->fresh('coefficients'), 'Coefficients enregistrés.');
    }
}
