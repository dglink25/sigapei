import { Controller, Post, Put, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reclamations')
@Controller('reclamations')
export class ReclamationsController {
 
  @Post()
  @HttpCode(201)
  async ouvrir(@Body() body: Record<string, unknown>) {
    // TODO : valider categorie (pedagogique|discipline|finances|ressources_humaines|autre),
    // inserer dans reclamations, router vers role habilite via role_permissions
    return { message: 'Non implemente' };
  }

 
  @Post(':uuid/messages')
  @HttpCode(201)
  async ajouterMessage(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider contenu obligatoire, inserer dans message_reclamation
    return { message: 'Non implemente' };
  }

  @Put(':uuid/statut')
  async mettreAJourStatut(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider statut (en_cours|resolue|cloturee), notifier via RabbitMQ
    return { message: 'Non implemente' };
  }
}
