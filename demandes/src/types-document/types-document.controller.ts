import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Configuration des types de documents.
 * CDC section 17 : POST /types-document
 *
 * CDC section 3.1 : "les regles d'eligibilite sont parametrables par
 * etablissement et par type de document, jamais codees en dur."
 * Necessite la permission "configurer les types de documents" (CDC section 5.3).
 */
@ApiTags('Types de document')
@Controller('types-document')
export class TypesDocumentController {
  /**
   * POST /v1/types-document
   * Configure un type de document, sa categorie de demandeur
   * et ses regles d'eligibilite.
   */
  @Post()
  @HttpCode(201)
  async creer(@Body() body: Record<string, unknown>) {
    // TODO : valider (nom, categorie_demandeur obligatoires),
    // inserer dans types_document avec regles_eligibilite JSON
    return { message: 'Non implemente' };
  }
}
