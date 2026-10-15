<?php

namespace App\Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(InscriptionSeeder::class);
    }
}
