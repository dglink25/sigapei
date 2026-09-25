-- Creation du schema "scolarite" et des extensions necessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS scolarite;
CREATE SCHEMA IF NOT EXISTS finances;
CREATE SCHEMA IF NOT EXISTS identite;
CREATE SCHEMA IF NOT EXISTS etablissements;
