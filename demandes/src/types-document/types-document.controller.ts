import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { avecMessage } from '../common/filtres/reponse.interceptor';
import { CreerTypeDocumentDto, ModifierTypeDocumentDto } from './dto/type-document.dto';
import { TypesDocumentService } from './types-document.service';

@ApiTags('Types de document')
@ApiBearerAuth()
@Controller('types-document')
export class TypesDocumentController {
  constructor(private readonly types: TypesDocumentService) {}

  @Get()
  @ApiOperation({
    summary: "Types de documents de l'etablissement (actifs ; tous pour un gestionnaire avec ?tous=1).",
  })
  @ApiQuery({ name: 'tous', required: false })
  lister(@Utilisateur() u: UtilisateurCourant, @Query('tous') tous?: string) {
    return this.types.lister(u, tous === '1' || tous === 'true');
  }

  @Post()
  @ApiOperation({
    summary: 'Cree un type de document (permission configurer_types).',
  })
  async creer(@Utilisateur() u: UtilisateurCourant, @Body() dto: CreerTypeDocumentDto) {
    return avecMessage('Type de document créé.', await this.types.creer(u, dto));
  }

  @Post('initialiser')
  @ApiOperation({
    summary: 'Ajoute les types standards absents (certificat de scolarite, attestation de travail...). Idempotent.',
  })
  async initialiser(@Utilisateur() u: UtilisateurCourant) {
    const r = await this.types.initialiser(u);
    return avecMessage(r.crees ? `${r.crees} type(s) de document ajouté(s).` : 'Les types standards sont déjà présents.', r.types);
  }

  @Patch(':uuid')
  @ApiOperation({
    summary: 'Modifie un type de document : regles, modele, activation (permission configurer_types).',
  })
  async modifier(
    @Utilisateur() u: UtilisateurCourant,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: ModifierTypeDocumentDto,
  ) {
    return avecMessage('Type de document mis à jour.', await this.types.modifier(u, uuid, dto));
  }
}
