<?php

namespace App\Http\Requests\Discipline;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Application d'une sanction a un incident existant (section 8 :
 * POST /incidents/{uuid}/sanction). Une sanction ne peut jamais exister
 * sans incident associe (regle de gestion, section 9).
 */
class StoreSanctionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sanction' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'sanction.required' => 'La sanction est obligatoire.',
            'sanction.max' => 'La sanction ne doit pas dépasser 1000 caractères.',
        ];
    }
}
