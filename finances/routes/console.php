<?php

use Illuminate\Support\Facades\Schedule;

// Filet de sécurité des paiements en ligne : relecture chez Paiement si une notification s'est perdue.
Schedule::command('finances:synchroniser-paiements')->everyTenMinutes()->withoutOverlapping(30);

// Relances d'échéances (CDC §5) : une fois par jour, en matinée (heure de l'établissement).
Schedule::command('finances:relances')->dailyAt('08:00')->timezone('Africa/Porto-Novo')->withoutOverlapping(60);
