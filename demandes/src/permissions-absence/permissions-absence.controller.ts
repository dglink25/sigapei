import { Controller, Post, Put, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Permissions d'absence.
 * CDC section 17 : POST /permissions-absence,
 *                  PUT /permissions-absence/{uuid}/decision
 *
 * CDC section 6.2 : une fois validee, Vie scolaire consulte
 * l'endpoint interne /interne/permission-active pour qualifier l'absence.
 */
@ApiTags('Permissions d\'absence')
@Controller('permissions-absence')
export class PermissionsAbsenceController {
  /**
   * POST /v1/permissions-absence
   * Soumet une demande de permission d'absence (parent ou apprenant autonome).
   */
  @Post()
  @HttpCode(201)
  async soumettre(@Body() body: Record<string, unknown>) {
    // TODO : valider DTO (apprenant_uuid, periode_debut, periode_fin, motif),
    // inserer dans permissions_absence, statut = en_attente, notifier via RabbitMQ
    return { message: 'Non implemente' };
  }

  /**
   * PUT /v1/permissions-absence/{uuid}/decision
   * Valide ou rejette une permission d'absence.
   * Necessite la permission "valider une permission d'absence" (CDC section 5.3).
   */
  @Put(':uuid/decision')
  async decision(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider decision (validee|rejetee) + motif si rejet,
    // mettre a jour permissions_absence, notifier parent + apprenant via RabbitMQ
    return { message: 'Non implemente' };
  }
}
