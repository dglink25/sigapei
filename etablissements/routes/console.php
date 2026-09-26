<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Relance automatique quotidienne des corrections en attente (section 7.3),
// chaque jour a 18h59, tant que le dossier n'est pas repasse a "soumise".
Schedule::command('demandes:relancer-corrections')->dailyAt('18:59');
