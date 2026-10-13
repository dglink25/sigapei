<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.contestation_note
 * Guide suprême requirements §14 : ouverte | en_examen | resolue | rejetee
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contestation_note', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->unsignedBigInteger('note_id');
            $table->string('demandeur_uuid');
            $table->string('statut')->default('ouverte');
            $table->text('motif');
            $table->timestamp('date_ouverture');
            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
            $table->foreign('note_id')->references('id')->on('notes');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contestation_note');
    }
};
