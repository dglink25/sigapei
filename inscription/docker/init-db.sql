-- Creation du schema "inscription" et des extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS inscription;
CREATE SCHEMA IF NOT EXISTS scolarite;
CREATE SCHEMA IF NOT EXISTS etablissements;
CREATE SCHEMA IF NOT EXISTS identite;
