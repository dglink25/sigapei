<?php

namespace App\Http\Controllers;

use App\Exceptions\MetierException;
use App\Models\Grade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Référentiel des grades / corps (paramétrage établissement). */
class GradesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'actives' => ['nullable', 'boolean'],
            'recherche' => ['nullable', 'string', 'max:100'],
        ]);

        $grades = Grade::query()
            ->when($request->boolean('actives'), fn ($q) => $q->where('active', true))
            ->when($request->filled('recherche'), function ($q) use ($request) {
                $terme = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->query('recherche')).'%';
                $q->where(fn ($s) => $s->where('libelle', 'ilike', $terme)->orWhere('code', 'ilike', $terme));
            })
            ->orderBy('libelle')
            ->paginate($this->parPage($request));

        return $this->page($grades);
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_-]+$/'],
            'libelle' => ['required', 'string', 'max:150'],
            'categorie' => ['nullable', 'string', 'max:50'],
            'echelon_min' => ['nullable', 'integer', 'min:0', 'max:99'],
            'echelon_max' => ['nullable', 'integer', 'min:0', 'max:99', 'gte:echelon_min'],
        ]);

        if (Grade::where('code', $d['code'])->exists()) {
            throw MetierException::conflit('Un grade avec ce code existe déjà.', 'CODE_DEJA_UTILISE');
        }

        $grade = Grade::create($d + ['active' => true]);

        return $this->ok($grade->fresh(), 'Grade créé.', 201);
    }

    public function modifier(Request $request, Grade $grade): JsonResponse
    {
        $d = $request->validate([
            'libelle' => ['sometimes', 'string', 'max:150'],
            'categorie' => ['sometimes', 'nullable', 'string', 'max:50'],
            'echelon_min' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'echelon_max' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $min = $d['echelon_min'] ?? $grade->echelon_min;
        $max = $d['echelon_max'] ?? $grade->echelon_max;
        if ($max < $min) {
            throw MetierException::conflit("L'échelon maximum ne peut pas être inférieur au minimum.", 'ECHELONS_INCOHERENTS');
        }

        $grade->update($d);

        return $this->ok($grade->fresh(), 'Grade mis à jour.');
    }
}
