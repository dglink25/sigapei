-- Execute automatiquement au premier demarrage du conteneur PostgreSQL.
-- Cree le schema "identite" (proprietaire exclusif de ce microservice dans
-- la base de donnees unique de la plateforme) et les extensions requises
-- pour la generation des colonnes uuid exposees par l'API.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS identite;
