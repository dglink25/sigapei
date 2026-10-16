<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/*
| Diagnostic de la base, en LECTURE SEULE (aucune écriture, aucune suppression).
| À lancer avant et après une migration sur la base partagée.
*/
Artisan::command('rh:diagnostic-base', function () {
    $hote = (string) config('database.connections.pgsql.host');
    $this->line('Hôte : '.(str_contains($hote, '-pooler') ? 'POOLER (PgBouncer) — à éviter pour les migrations' : 'direct'));

    $info = DB::selectOne("SELECT current_user AS utilisateur, current_setting('search_path') AS search_path,
        has_database_privilege(current_database(), 'CREATE') AS peut_creer_schema");
    $this->line("Utilisateur : {$info->utilisateur} | search_path : {$info->search_path} | droit CREATE sur la base : ".($info->peut_creer_schema ? 'oui' : 'non'));

    foreach (DB::select("SELECT nspname AS schema, pg_get_userbyid(nspowner) AS proprietaire FROM pg_namespace
        WHERE nspname IN ('rh', 'scolarite', 'evaluations') ORDER BY 1") as $s) {
        $this->line("Schéma {$s->schema} : existe (propriétaire {$s->proprietaire})");
    }

    $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'rh' ORDER BY 1");
    $this->line('Tables dans rh : '.(count($tables) ? implode(', ', array_column($tables, 'table_name')) : 'aucune'));

    $fonctions = DB::select("SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'rh'");
    $this->line('Fonctions dans rh : '.(count($fonctions) ? implode(', ', array_column($fonctions, 'proname')) : 'aucune'));

    if (DB::selectOne("SELECT to_regclass('rh.migrations') AS t")->t !== null) {
        $this->line('Migrations enregistrées (rh.migrations) : '.DB::table('rh.migrations')->count());
    }

    $publique = DB::selectOne("SELECT to_regclass('public.migrations') AS t")->t;
    $this->line('Table public.migrations : '.($publique === null ? 'absente (normal)' : 'PRÉSENTE — '.DB::table('public.migrations')->count().' ligne(s), à examiner avant toute action'));
})->purpose('Diagnostic en lecture seule de la base partagée (schémas, tables, droits)');
