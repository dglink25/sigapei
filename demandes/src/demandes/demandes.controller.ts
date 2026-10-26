import { Controller, Get, Post, Put, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Demandes de documents administratifs.
 * CDC section 17 : POST /demandes, GET /demandes/{uuid}, PUT /demandes/{uuid}/traiter,
 *                  PUT /demandes/{uuid}/rejeter
 *
 * Regles metier cles (CDC section 3.1) :
 * - La verification d'eligibilite s'execute cote serveur au moment du traitement.
 * - Tout rejet exige un motif obligatoire.
 * - Le dossier du demandeur n'est jamais recopie dans le schema demandes :
 *   verification via les API /interne de scolarite, finances, evaluations ou rh (Regle n°1).
 */
@ApiTags('Demandes administratives')
@Controller('demandes')
export class DemandesController {
  /**
   * POST /demandes
   * Soumet une nouvelle demande de document (tout profil).
   * Declenche la verification d'eligibilite adaptee au type de document.
   */
  @Post()
  @HttpCode(201)
  async soumettre(@Body() body: Record<string, unknown>) {
    // TODO : valider DTO, verifier eligibilite via ServiceEligibilite,
    // inserer dans demandes_administratives, statut = recue
    return { message: 'Non implemente' };
  }

  /**
   * GET /demandes/{uuid}
   * Consulte le statut et l'historique d'une demande.
   */
  @Get(':uuid')
  async consulter(@Param('uuid') uuid: string) {
    // TODO : retourner la demande avec son statut et les etapes franchies
    return { message: 'Non implemente' };
  }

  /**
   * PUT /demandes/{uuid}/traiter
   * Passe une demande en traitement / genere le document.
   * Necessite la permission "traiter une demande" (CDC section 5.3).
   */
  @Put(':uuid/traiter')
  async traiter(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : verifier permission via role_permissions (Identite),
    // lancer ServiceGeneration en file asynchrone, passer statut en_traitement ou prete
    return { message: 'Non implemente' };
  }

  /**
   * PUT /demandes/{uuid}/rejeter
   * Rejette une demande avec motif obligatoire (CDC section 3.1).
   */
  @Put(':uuid/rejeter')
  async rejeter(@Param('uuid') uuid: string, @Body() body: Record<string, unknown>) {
    // TODO : valider motif obligatoire, passer statut rejetee, notifier via RabbitMQ
    return { message: 'Non implemente' };
  }
}
