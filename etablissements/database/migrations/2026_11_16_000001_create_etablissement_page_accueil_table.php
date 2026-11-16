<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table de configuration de la page d'accueil publique d'un établissement.
 *
 * Une seule ligne par établissement (upsert).
 * Chaque section est stockée en JSON dans sa propre colonne pour permettre
 * des mises à jour partielles sans écraser les autres sections.
 *
 * Sections :
 *   hero          → slides (imageUrl, titre, sousTitre, ctaLibelle, ctaUrl)
 *   statistiques  → compteurs animés (icone, valeur, libelle)
 *   apropos       → présentation, mission, vision, devise
 *   galerie       → tableau d'URLs d'images
 *   actualites    → articles (imageUrl, date ISO, titre, extrait)
 *   reseaux       → liens réseaux sociaux (facebook, twitter, linkedin, instagram)
 *
 * Note : les "formations" sont les classes issues de Scolarité,
 * elles sont lues depuis configuration/classes et ne sont pas stockées ici.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('etablissement_page_accueil', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etablissement_id')
                ->unique()
                ->constrained('etablissements')
                ->onDelete('cascade');

            // Sections JSON - null = section non configurée (masquée côté front)
            $table->jsonb('hero')->nullable();
            $table->jsonb('statistiques')->nullable();
            $table->jsonb('apropos')->nullable();
            $table->jsonb('galerie')->nullable();
            $table->jsonb('actualites')->nullable();
            $table->jsonb('reseaux_sociaux')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('etablissement_page_accueil');
    }
};
