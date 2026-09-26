#!/bin/sh
# Boucle simple declenchant le scheduler Laravel chaque minute, en l'absence
# de demon cron dans l'image (voir README.md). "demandes:relancer-corrections"
# ne s'execute effectivement qu'une fois par jour a 18h59 (voir routes/console.php),
# cette boucle se contente d'appeler `schedule:run` regulierement.
while true; do
  php /app/artisan schedule:run --no-interaction
  sleep 60
done
