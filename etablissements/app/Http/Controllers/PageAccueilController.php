<?php

namespace App\Http\Controllers;

use App\Domain\Etablissement\Etablissement;
use App\Domain\PageAccueil\EtablissementPageAccueil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Gestion de la page d'accueil publique d'un établissement.
 *
 * Routes protégées par secret.interne + contexte.tenant :
 *   GET   /interne/mon-etablissement/page-accueil           → lire
 *   PUT   /interne/mon-etablissement/page-accueil/{section} → mettre à jour une section
 *   POST  /interne/mon-etablissement/page-accueil/images    → upload image
 */
class PageAccueilController extends Controller
{
    /** Sections autorisées et leurs règles de validation. */
    private const SECTIONS = [
        'hero' => [
            'hero'               => 'nullable|array|max:10',
            'hero.*.imageUrl'    => 'nullable|string|url|max:500',
            'hero.*.titre'       => 'required|string|max:120',
            'hero.*.sousTitre'   => 'nullable|string|max:200',
            'hero.*.ctaLibelle'  => 'nullable|string|max:40',
            'hero.*.ctaUrl'      => 'nullable|string|max:300',
            'hero.*.pages'       => 'nullable|array',
            'hero.*.pages.*'     => 'string|in:toutes,presentation,formations,actualites,galerie,contact',
        ],
        'statistiques' => [
            'statistiques'          => 'nullable|array|max:10',
            'statistiques.*.icone'  => 'required|string|max:30',
            'statistiques.*.valeur' => 'required|integer|min:0',
            'statistiques.*.libelle'=> 'required|string|max:60',
        ],
        'apropos' => [
            'apropos'          => 'nullable|array',
            'apropos.texte'    => 'nullable|string|max:2000',
            'apropos.mission'  => 'nullable|string|max:800',
            'apropos.vision'   => 'nullable|string|max:800',
            'apropos.devise'   => 'nullable|string|max:200',
        ],
        'galerie' => [
            'galerie'   => 'nullable|array|max:50',
            'galerie.*' => 'required|string|url|max:500',
        ],
        'actualites' => [
            'actualites'            => 'nullable|array|max:20',
            'actualites.*.imageUrl' => 'nullable|string|url|max:500',
            'actualites.*.date'     => 'required|date_format:Y-m-d',
            'actualites.*.titre'    => 'required|string|max:160',
            'actualites.*.extrait'  => 'nullable|string|max:400',
        ],
        'reseaux-sociaux' => [
            'reseauxSociaux'            => 'nullable|array',
            'reseauxSociaux.facebook'   => 'nullable|string|url|max:300',
            'reseauxSociaux.twitter'    => 'nullable|string|url|max:300',
            'reseauxSociaux.linkedin'   => 'nullable|string|url|max:300',
            'reseauxSociaux.instagram'  => 'nullable|string|url|max:300',
        ],
    ];

    /** Lire la configuration complète de la page d'accueil. */
    public function lire(Request $request): JsonResponse
    {
        $etablissementId = $request->header('X-Tenant-Uuid');
        $etab = Etablissement::where('uuid', $etablissementId)->firstOrFail();

        $page = EtablissementPageAccueil::where('etablissement_id', $etab->id)->first();

        return response()->json([
            'success' => true,
            'accueil' => $page ? $this->formater($page) : $this->vide(),
        ]);
    }

    /** Mettre à jour une section spécifique. */
    public function mettreAJourSection(Request $request, string $section): JsonResponse
    {        if (! isset(self::SECTIONS[$section])) {
            return response()->json([
                'success' => false,
                'error'   => ['code' => 'SECTION_INCONNUE', 'message' => "Section « {$section} » inconnue."],
            ], 422);
        }

        $data = $request->validate(self::SECTIONS[$section]);

        $etablissementId = $request->header('X-Tenant-Uuid');
        $etab = Etablissement::where('uuid', $etablissementId)->firstOrFail();

        // Colonne DB = snake_case de la section
        $colonne = $section === 'reseaux-sociaux' ? 'reseaux_sociaux' : $section;
        // Clé JSON = camelCase (ce que le front envoie)
        $cleJson = $section === 'reseaux-sociaux' ? 'reseauxSociaux' : $section;

        $page = EtablissementPageAccueil::updateOrCreate(
            ['etablissement_id' => $etab->id],
            [$colonne => $data[$cleJson] ?? null],
        );

        // Invalider le cache de l'accueil public
        Cache::forget("accueil:etablissement:{$etab->slug}");

        return response()->json([
            'success' => true,
            'section' => $section,
            'accueil' => $this->formater($page),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Upload d'une image pour la page d'accueil (hero, galerie, actualités). */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $etablissementId = $request->header('X-Tenant-Uuid');
        $etab = Etablissement::where('uuid', $etablissementId)->firstOrFail();

        $file     = $request->file('image');
        $ext      = $file->extension();
        $nom      = 'page-accueil/' . $etab->slug . '/' . Str::uuid() . '.' . $ext;

        Storage::disk(config('filesystems.default', 'local'))->put($nom, file_get_contents($file));

        $appUrl  = rtrim(env('APP_URL', 'http://localhost:4002'), '/');
        $imageUrl = $appUrl . '/v1/page-accueil/images/' . $nom;

        return response()->json(['success' => true, 'imageUrl' => $imageUrl]);
    }

    /** Servir une image stockée pour la page d'accueil (accès public). */
    public function servirImage(string $chemin)
    {
        $disk = Storage::disk(config('filesystems.default', 'local'));

        if (! $disk->exists($chemin)) {
            abort(404);
        }

        $contenu  = $disk->get($chemin);
        $mime     = $disk->mimeType($chemin) ?: 'image/jpeg';

        return response($contenu, 200)
            ->header('Content-Type', $mime)
            ->header('Cache-Control', 'public, max-age=86400');
    }
    private function formater(EtablissementPageAccueil $page): array
    {
        return [
            'hero'          => $page->hero          ?? [],
            'statistiques'  => $page->statistiques  ?? [],
            'apropos'       => $page->apropos        ?? ['texte' => '', 'mission' => '', 'vision' => '', 'devise' => ''],
            'galerie'       => $page->galerie        ?? [],
            'actualites'    => $page->actualites     ?? [],
            'reseauxSociaux'=> $page->reseaux_sociaux ?? [],
        ];
    }

    private function vide(): array
    {
        return [
            'hero'          => [],
            'statistiques'  => [],
            'apropos'       => ['texte' => '', 'mission' => '', 'vision' => '', 'devise' => ''],
            'galerie'       => [],
            'actualites'    => [],
            'reseauxSociaux'=> [],
        ];
    }
}
