<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le schéma `rh` est un PRÉREQUIS créé une seule fois avant la première migration
 * (README, §1) : il ne peut pas être créé ici, car la table `migrations` de Laravel
 * y est créée avant toute migration. Pas de CREATE SCHEMA ici : sur une base
 * partagée, le rôle applicatif n'a pas forcément le droit CREATE sur la base, et
 * l'instruction échoue même quand le schéma existe déjà (le contrôle de droit
 * passe avant le IF NOT EXISTS).
 */
return new class extends Migration
{
    public function up(): void
    {
        $existe = DB::selectOne("SELECT 1 AS ok FROM pg_namespace WHERE nspname = 'rh'");
        if ($existe === null) {
            throw new RuntimeException('Le schéma "rh" n\'existe pas : créez-le une fois avant de migrer (README, §1).');
        }
    }

    public function down(): void
    {
        // Rien à annuler : le schéma `rh` est un prérequis, il n'est pas créé ici.
    }
};
