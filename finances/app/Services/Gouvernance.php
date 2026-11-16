<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Qui peut GÉRER les finances : jamais un intitulé de rôle dans le code, toujours la grille rôle x action de
 * l'établissement (un rôle « comptable », « caissier » ou « économe » se configure sans déploiement).
 * Seule règle fixe : l'administrateur de l'établissement peut tout.
 */
class Gouvernance
{
    public const ADMINISTRATEUR = 'administrateur';

    public const ACTIONS = [
        'consulter_finances' => 'Consulter les factures, règlements et soldes de tous les apprenants',
        'gerer_tarifs' => 'Créer et modifier les formules tarifaires',
        'emettre_factures' => 'Émettre des factures (individuelles ou pour une classe)',
        'annuler_facture' => 'Annuler une facture non réglée',
        'saisir_reglement' => 'Enregistrer un règlement en espèces, virement ou chèque',
        'valider_reglement' => 'Valider ou rejeter un règlement saisi par un autre profil',
        'consulter_rapports' => 'Consulter les rapports financiers',
    ];

    public function __construct(private readonly Journal $journal) {}

    public function peut(string $action): bool
    {
        $u = Contexte::utilisateur();
        if ($u['roleCode'] === self::ADMINISTRATEUR) {
            return true;
        }

        return DB::table('finances.permissions_role')
            ->where(['etablissement_uuid' => Contexte::etablissement(), 'role_code' => $u['roleCode'], 'action' => $action])
            ->exists();
    }

    public function exiger(string $action): void
    {
        if (! $this->peut($action)) {
            throw MetierException::accesRefuse('Action réservée : '.mb_strtolower(self::ACTIONS[$action]).'.', 'ACTION_NON_AUTORISEE');
        }
    }

    public function exigerAdministrateur(): void
    {
        if (Contexte::role() !== self::ADMINISTRATEUR) {
            throw MetierException::accesRefuse("Seul l'administrateur de l'établissement configure les finances.", 'ACTION_NON_AUTORISEE');
        }
    }

    /** @return list<string> */
    public function mesActions(): array
    {
        if (Contexte::role() === self::ADMINISTRATEUR) {
            return array_keys(self::ACTIONS);
        }

        return DB::table('finances.permissions_role')
            ->where(['etablissement_uuid' => Contexte::etablissement(), 'role_code' => Contexte::role()])
            ->orderBy('action')->pluck('action')->all();
    }

    public function grille(): array
    {
        $roles = DB::table('finances.permissions_role')->where('etablissement_uuid', Contexte::etablissement())
            ->orderBy('role_code')->orderBy('action')->get(['role_code', 'action'])->groupBy('role_code')
            ->map(fn ($l, $role) => ['role_code' => $role, 'actions' => $l->pluck('action')->values()])->values();

        return [
            'actions' => collect(self::ACTIONS)->map(fn ($libelle, $code) => compact('code', 'libelle'))->values(),
            'roles' => $roles,
            'administrateur' => ['role_code' => self::ADMINISTRATEUR, 'toutes_les_actions' => true],
        ];
    }

    /** @param list<string> $actions liste COMPLÈTE des actions du rôle (remplace la précédente) */
    public function definir(string $roleCode, array $actions): array
    {
        $this->exigerAdministrateur();
        if (! preg_match('/^[a-z][a-z0-9_-]{1,63}$/', $roleCode) || in_array($roleCode, [self::ADMINISTRATEUR, 'super_admin'], true)) {
            throw ValidationException::withMessages(['role_code' => "Ce rôle ne peut pas être configuré (l'administrateur dispose de toutes les actions)."]);
        }

        return DB::transaction(function () use ($roleCode, $actions) {
            $filtre = ['etablissement_uuid' => Contexte::etablissement(), 'role_code' => $roleCode];
            $avant = DB::table('finances.permissions_role')->where($filtre)->orderBy('action')->pluck('action')->all();
            DB::table('finances.permissions_role')->where($filtre)->delete();
            foreach ($actions as $action) {
                DB::table('finances.permissions_role')->insert($filtre + ['action' => $action, 'accorde_par_uuid' => Contexte::utilisateurUuid()]);
            }
            $this->journal->ecrire('permissions.role.modifiees', 'role', null, ['role_code' => $roleCode, 'avant' => $avant, 'apres' => $actions]);

            return ['role_code' => $roleCode, 'actions' => array_values($actions)];
        });
    }
}
