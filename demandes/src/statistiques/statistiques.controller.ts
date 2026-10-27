import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Base } from '../common/base/base.service';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { GouvernanceService } from '../gouvernance/gouvernance.service';

@ApiTags('Statistiques')
@ApiBearerAuth()
@Controller('statistiques')
export class StatistiquesController {
  constructor(
    private readonly base: Base,
    private readonly gouvernance: GouvernanceService,
  ) {}

  /** Tableau de bord des gestionnaires (CDC §11) : demandes en attente, anciennete de la plus vieille, repartition. */
  @Get()
  @ApiOperation({
    summary: 'Indicateurs du module (permission consulter_statistiques).',
  })
  async indicateurs(@Utilisateur() u: UtilisateurCourant) {
    await this.gouvernance.exiger(u, 'consulter_statistiques');
    const t = u.tenantId;
    const [parStatut, attente, parType, permissions, reclamations, delai] = await Promise.all([
      this.base.lignes(
        `SELECT statut, count(*)::int AS nombre FROM demandes.demandes_administratives WHERE tenant_id = $1 GROUP BY statut`,
        [t],
      ),
      this.base.ligne(
        `SELECT count(*)::int AS nombre, count(*) FILTER (WHERE priorite)::int AS prioritaires,
                floor(extract(epoch FROM now() - min(created_at)) / 3600)::int AS plus_ancienne_heures
           FROM demandes.demandes_administratives WHERE tenant_id = $1 AND statut IN ('recue','en_traitement')`,
        [t],
      ),
      this.base.lignes(
        `SELECT ty.uuid, ty.nom, count(d.id)::int AS nombre
           FROM demandes.types_document ty LEFT JOIN demandes.demandes_administratives d ON d.type_document_id = ty.id
          WHERE ty.tenant_id = $1 GROUP BY ty.uuid, ty.nom ORDER BY nombre DESC, ty.nom`,
        [t],
      ),
      this.base.ligne(
        `SELECT count(*) FILTER (WHERE statut = 'en_attente')::int AS en_attente FROM demandes.permissions_absence WHERE tenant_id = $1`,
        [t],
      ),
      this.base.lignes(`SELECT statut, count(*)::int AS nombre FROM demandes.reclamations WHERE tenant_id = $1 GROUP BY statut`, [t]),
      this.base.ligne(
        `SELECT round(avg(extract(epoch FROM prete_le - created_at)) / 3600)::int AS heures
           FROM demandes.demandes_administratives WHERE tenant_id = $1 AND statut = 'prete' AND prete_le > now() - interval '90 days'`,
        [t],
      ),
    ]);
    return {
      demandes: {
        par_statut: Object.fromEntries(parStatut.map((s: any) => [s.statut, s.nombre])),
        a_traiter: attente?.nombre ?? 0,
        prioritaires: attente?.prioritaires ?? 0,
        plus_ancienne_en_attente_heures: attente?.plus_ancienne_heures ?? null,
        delai_moyen_traitement_heures_90j: delai?.heures ?? null,
        par_type: parType,
      },
      permissions_absence: { en_attente: permissions?.en_attente ?? 0 },
      reclamations: {
        par_statut: Object.fromEntries(reclamations.map((s: any) => [s.statut, s.nombre])),
      },
    };
  }
}
