<?php

namespace App\Domain\Etablissement;

use Illuminate\Support\Str;

/**
 * Genere le matricule de l'etablissement (section 7.5), algorithme exact :
 *  1. decomposer le nom en mots, en ignorant les mots generiques non
 *     significatifs ;
 *  2. retenir le mot le plus court restant (le premier rencontre en cas
 *     d'egalite) ;
 *  3. normaliser (minuscules, sans accents/caracteres speciaux) ;
 *  4. generer un code numerique aleatoire a 4 chiffres (1000-9999) ;
 *  5. concatener sans separateur ;
 *  6. verifier l'unicite ; en cas de collision, regenerer uniquement le code.
 */
class MatriculeService
{
    private const MOTS_GENERIQUES = [
        'ecole', 'complexe', 'scolaire', 'institut', 'groupe', 'college',
        'lycee', 'universite', 'de', 'des', 'du', 'la', 'le', 'les', 'et',
    ];

    public function genererDepuisNom(string $nom): string
    {
        $motRetenu = $this->retenirMotSignificatifLePlusCourt($nom);

        do {
            $code = random_int(1000, 9999);
            $matricule = $motRetenu.$code;
        } while (Etablissement::where('matricule', $matricule)->exists());

        return $matricule;
    }

    private function retenirMotSignificatifLePlusCourt(string $nom): string
    {
        $motsBruts = preg_split('/\s+/', trim($nom)) ?: [];

        $motsSignificatifs = array_values(array_filter($motsBruts, function ($mot) {
            $normalise = $this->normaliser($mot);

            return $normalise !== '' && ! in_array($normalise, self::MOTS_GENERIQUES, true);
        }));

        if (empty($motsSignificatifs)) {
            // Filet de securite si le nom n'est compose que de mots generiques.
            $motsSignificatifs = $motsBruts !== [] ? $motsBruts : ['etablissement'];
        }

        $motRetenu = $motsSignificatifs[0];
        foreach ($motsSignificatifs as $mot) {
            if (mb_strlen($this->normaliser($mot)) < mb_strlen($this->normaliser($motRetenu))) {
                $motRetenu = $mot;
            }
        }

        return $this->normaliser($motRetenu);
    }

    private function normaliser(string $mot): string
    {
        $sansAccents = Str::ascii($mot);

        return strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $sansAccents));
    }
}
