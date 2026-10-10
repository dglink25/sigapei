#!/bin/sh
set -e

echo "> Generation de la cle d'application si absente"
export APP_KEY="${APP_KEY:-base64:$(php -r 'echo base64_encode(random_bytes(32));')}"

# Regle n°1 - la base est Neon, unique et partagee : on attend qu'elle
# reponde, on ne la cree pas. Le schema `vie_scolaire` doit deja exister
# (cree a la main sur Neon avant la premiere migration) ; une connexion
# qui aboutit ne garantit donc pas que le schema est la.
echo "> Attente de la base Neon..."
php -r '
$host    = getenv("DB_HOST") ?: "127.0.0.1";
$port    = getenv("DB_PORT") ?: "5432";
$db      = getenv("DB_DATABASE") ?: "neondb";
$user    = getenv("DB_USERNAME");
$pass    = getenv("DB_PASSWORD");
$sslmode = getenv("DB_SSLMODE") ?: "require";

if ($user === false || $user === "") {
    fwrite(STDERR, "DB_USERNAME absent : credentials Neon non renseignes.\n");
    exit(1);
}

for ($i = 0; $i < 30; $i++) {
    try {
        new PDO("pgsql:host=$host;port=$port;dbname=$db;sslmode=$sslmode", $user, $pass);
        exit(0);
    } catch (Throwable $e) {
        sleep(2);
    }
}
fwrite(STDERR, "Base Neon indisponible apres 60s.\n");
exit(1);
'

echo "> Schema attendu : ${DB_SCHEMA:-vie_scolaire}"

echo "> Migration de la base..."
php artisan migrate --force --no-interaction

echo "> Lancement de php-fpm"
exec php-fpm
