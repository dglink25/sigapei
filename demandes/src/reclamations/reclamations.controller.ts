import { Controller, Post, Put, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Reclamations bidirectionnelles.
 * CDC section 17 : POST /reclamations, POST /reclamations/{uuid}/messages,
 *                  PUT /reclamations/{uuid}/statut
 *
 * CDC section 10.1 : ouvert a tout utilisateur (parent, apprenant,
 * enseignant, personnel) ou par l'etablissement lui-meme.
 */
@ApiTags('Reclamations')
@Controller('reclamations')
export class ReclamationsController {
  /**
   * POST /v1/reclamations
   * Ouvre une nouvelle reclamation (tout profil).
   */
  @Post()
  @HttpCode(201)
  async ouvrir(@Body() body: Record<string, unknown>) {
    // TODO : valider categorie (pedagogique|discipline|finances|ressources_humaines|autre),
    // inserer dans reclamations, router vers role habilite via role_permissions
    return { message: 'Non implemente' };
  }

  /**
   * POST /v1/reclamations/{uuid}/messages
   * Ajoute un message au fil de la reclamation.
   */
  @Post(':uuid/messages')
  @HttpCode(201)
  async ajouterMessage(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider contenu obligatoire, inserer dans message_reclamation
    return { message: 'Non implemente' };
  }

  /**
   * PUT /v1/reclamations/{uuid}/statut
   * Met a jour le statut d'une reclamation.
   * Necessite la permission "repondre a une reclamation" (CDC section 5.3).
   */
  @Put(':uuid/statut')
  async mettreAJourStatut(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider statut (en_cours|resolue|cloturee), notifier via RabbitMQ
    return { message: 'Non implemente' };
  }
}
