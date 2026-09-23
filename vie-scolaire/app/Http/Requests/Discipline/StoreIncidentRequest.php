<?php

namespace App\Http\Requests\Discipline;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Signalement d'un incident disciplinaire (section 8 : POST /incidents).
 */
class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'apprenant_uuid' => ['required', 'uuid'],
            'type' => ['required', 'in:retard,comportement,absence_non_justifiee_repetee,autre'],
            'description' => ['required', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'apprenant_uuid.required' => 'L\'apprenant est obligatoire.',
            'apprenant_uuid.uuid' => 'Le uuid de l\'apprenant est invalide.',
            'type.required' => 'Le type d\'incident est obligatoire.',
            'type.in' => 'Type d\'incident invalide.',
            'description.required' => 'La description est obligatoire.',
            'description.max' => 'La description ne doit pas dépasser 2000 caractères.',
        ];
    }
}
