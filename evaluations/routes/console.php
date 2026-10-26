<?php

use App\Common\Tenant\Contexte;
use App\Models\ContestationNote;
use App\Services\ContestationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

/*
| Escalade des contestations sans réponse après le délai paramétré (CDC §9).
| Tourne tenant par tenant pour que chaque requête reste filtrée.
*/
Artisan::command('evaluations:escalader-contestations', function (ContestationService $service) {
    $tenants = ContestationNote::withoutGlobalScope('tenant')
        ->whereIn('statut', ['ouverte', 'en_examen'])->whereNull('escaladee_le')
        ->distinct()->pluck('tenant_id');

    $total = 0;
    foreach ($tenants as $tenantId) {
        $total += Contexte::executerPour((int) $tenantId, fn () => $service->escaladerEnRetard());
    }

    $this->info("{$total} contestation(s) escaladée(s).");
})->purpose('Escalade les contestations de notes restées sans réponse');

Schedule::command('evaluations:escalader-contestations')->hourly()->withoutOverlapping()->onOneServer();

/*
| Diagnostic de la base, en LECTURE SEULE (aucune écriture, aucune suppression).
| À lancer avant et après une migration sur la base partagée.
*/
Artisan::command('evaluations:diagnostic-base', function () {
    $hote = (string) config('database.connections.pgsql.host');
    $this->line('Hôte : '.(str_contains($hote, '-pooler') ? 'POOLER (PgBouncer) - à éviter pour les migrations' : 'direct'));

    $info = DB::selectOne("SELECT current_user AS utilisateur, current_setting('search_path') AS search_path,
        has_database_privilege(current_database(), 'CREATE') AS peut_creer_schema");
    $this->line("Utilisateur : {$info->utilisateur} | search_path : {$info->search_path} | droit CREATE sur la base : ".($info->peut_creer_schema ? 'oui' : 'non'));

    foreach (DB::select("SELECT nspname AS schema, pg_get_userbyid(nspowner) AS proprietaire FROM pg_namespace
        WHERE nspname IN ('evaluations', 'finances', 'demandes') ORDER BY 1") as $s) {
        $this->line("Schéma {$s->schema} : existe (propriétaire {$s->proprietaire})");
    }

    $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'evaluations' ORDER BY 1");
    $this->line('Tables dans evaluations : '.(count($tables) ? implode(', ', array_column($tables, 'table_name')) : 'aucune'));

    $fonctions = DB::select("SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'evaluations'");
    $this->line('Fonctions dans evaluations : '.(count($fonctions) ? implode(', ', array_column($fonctions, 'proname')) : 'aucune'));

    if (DB::selectOne("SELECT to_regclass('evaluations.migrations') AS t")->t !== null) {
        $this->line('Migrations enregistrées (evaluations.migrations) : '.DB::table('evaluations.migrations')->count());
    }

    $publique = DB::selectOne("SELECT to_regclass('public.migrations') AS t")->t;
    $this->line('Table public.migrations : '.($publique === null ? 'absente (normal)' : 'PRÉSENTE - '.DB::table('public.migrations')->count().' ligne(s), à examiner avant toute action'));
})->purpose('Diagnostic en lecture seule de la base partagée (schémas, tables, droits)');
