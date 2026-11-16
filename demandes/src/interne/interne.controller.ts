import { Controller, Get, Headers, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Base } from '../common/base/base.service';
import { SansContexteUtilisateur } from '../common/decorators/public.decorator';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { ACTIONS, LISTE_ACTIONS, ROLE_ADMINISTRATEUR } from '../gouvernance/actions';
import { EtablissementsClient } from '../integrations/etablissements.client';
import { PermissionsAbsenceService } from '../permissions-absence/permissions-absence.service';

/** Endpoints internes (X-Internal-Secret + X-Tenant-Id), jamais exposes au front. */
@ApiTags('Interne')
@ApiHeader({ name: 'X-Internal-Secret', required: true })
@ApiHeader({
  name: 'X-Tenant-Id',
  required: true,
  description: "Identifiant ou uuid de l'etablissement",
})
@SansContexteUtilisateur()
@SkipThrottle()
@UseGuards(InternalSecretGuard)
@Controller('interne')
export class InterneController {
  constructor(
    private readonly permissions: PermissionsAbsenceService,
    private readonly etablissements: EtablissementsClient,
    private readonly base: Base,
  ) {}

  /** Vie scolaire (CDC §6.2, §19.7) : l'apprenant est-il permissionnaire a cette date ? */
  @Get('permission-active/:apprenant_uuid')
  @ApiOperation({
    summary: "Vie scolaire : permission d'absence validee couvrant la date (AAAA-MM-JJ, aujourd'hui par defaut).",
  })
  async permissionActive(
    @Headers('x-tenant-id') tenantRef: string | undefined,
    @Param(
      'apprenant_uuid',
      new ParseUUIDPipe({
        exceptionFactory: () => ErreurMetier.invalide('apprenant_uuid', 'Identifiant invalide.'),
      }),
    )
    apprenant: string,
    @Query('date') date?: string,
  ) {
    return this.permissions.active(await this.tenant(tenantRef), apprenant, this.date(date));
  }

  /** Identite (CDC §17) : actions de gestion accordees a un role dans ce module. */
  @Get('permissions-role/:role_code')
  @ApiOperation({
    summary: 'Identite : actions de gestion accordees a un role dans ce module.',
  })
  async permissionsRole(@Headers('x-tenant-id') tenantRef: string | undefined, @Param('role_code') roleCode: string) {
    const tenant = await this.tenant(tenantRef);
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(roleCode)) throw ErreurMetier.invalide('role_code', 'Code de rôle invalide.');
    const actions: string[] =
      roleCode === ROLE_ADMINISTRATEUR
        ? [...LISTE_ACTIONS]
        : (
            await this.base.lignes(`SELECT action FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2 ORDER BY action`, [
              tenant,
              roleCode,
            ])
          ).map((r: any) => r.action);
    return {
      role_code: roleCode,
      module: 'demandes',
      actions: actions.map((a) => ({
        code: a,
        libelle: ACTIONS[a as keyof typeof ACTIONS],
      })),
    };
  }

  private async tenant(ref?: string): Promise<number> {
    const t = await this.etablissements.resoudre(ref);
    if (t === null) throw ErreurMetier.invalide('X-Tenant-Id', "En-tête X-Tenant-Id invalide (identifiant ou uuid de l'établissement).");
    return t;
  }

  private date(date?: string): string {
    const d = date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) throw ErreurMetier.invalide('date', 'Date invalide (AAAA-MM-JJ).');
    return d;
  }
}
