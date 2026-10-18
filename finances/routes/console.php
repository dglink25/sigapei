<?php

use Illuminate\Support\Facades\Schedule;

// Vérification quotidienne des échéances + déclenchement hibernation (CDC §4.3)
Schedule::command('finances:verifier-echeances')->dailyAt('01:00');
// Relances automatiques avant/après échéance (CDC §5)
Schedule::command('finances:relancer-impayes')->dailyAt('09:00');
