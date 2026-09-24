<?php

namespace App\Http\Requests\Presences;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Enregistrement des presences/absences d'un cours pour l'ensemble d'une
 * classe (section 8 : POST /presences). Les apprenants sont references par
 * leur uuid du schema scolarite, jamais par identifiant numerique.
 */
class StorePresencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cours_uuid' => ['required', 'uuid'],
            'date' => ['required', 'date_format:Y-m-d'],
            'apprenants' => ['required', 'array', 'min:1'],
            'apprenants.*.uuid' => ['required', 'uuid', 'distinct'],
            'apprenants.*.statut' => ['required', 'in:present,absent,retard'],
        ];
    }

    public function messages(): array
    {
        return [
            'cours_uuid.required' => 'Le cours est obligatoire.',
            'cours_uuid.uuid' => 'Le uuid du cours est invalide.',
            'date.required' => 'La date est obligatoire.',
            'date.date_format' => 'La date doit respecter le format AAAA-MM-JJ.',
            'apprenants.required' => 'Au moins un apprenant doit être renseigné.',
            'apprenants.*.uuid.required' => 'Le uuid d\'un apprenant est manquant.',
            'apprenants.*.uuid.distinct' => 'Un apprenant est présent en double.',
            'apprenants.*.statut.in' => 'Le statut doit être present, absent ou retard.',
        ];
    }
}
