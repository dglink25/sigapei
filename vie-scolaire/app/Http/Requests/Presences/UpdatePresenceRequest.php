<?php

namespace App\Http\Requests\Presences;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Correction d'une presence deja enregistree (section 8 : PUT /presences/{uuid}).
 * La correction est journalisee a posteriori dans audit_log.
 */
class UpdatePresenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'statut' => ['required', 'in:present,absent,retard'],
            'motif' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'statut.required' => 'Le statut corrigé est obligatoire.',
            'statut.in' => 'Le statut doit être present, absent ou retard.',
            'motif.max' => 'Le motif ne doit pas dépasser 500 caractères.',
        ];
    }
}
