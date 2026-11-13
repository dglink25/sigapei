import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export const CATEGORIES_DEMANDEUR = ['apprenant', 'personnel', 'tout_profil'] as const;

export class ReglesEligibiliteDto {
  @ApiProperty({
    required: false,
    description: 'Apprenant : dossier actif dans Scolarite a la date de la demande.',
  })
  @IsOptional()
  @IsBoolean()
  dossier_actif?: boolean;

  @ApiProperty({
    required: false,
    description: 'Apprenant : au moins un bulletin publie (cloture) dans Evaluations.',
  })
  @IsOptional()
  @IsBoolean()
  bulletins_publies?: boolean;

  @ApiProperty({
    required: false,
    description: 'Personnel : dossier RH actif.',
  })
  @IsOptional()
  @IsBoolean()
  contrat_actif?: boolean;

  @ApiProperty({
    required: false,
    description: 'Apprenant : aucune échéance passée impayée (Finances).',
  })
  @IsOptional()
  @IsBoolean()
  solde_a_jour?: boolean;
}

export class ModeleDto {
  @ApiProperty({ required: false, example: 'College Les Palmiers - Cotonou' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  en_tete?: string;

  @ApiProperty({ required: false, example: 'CERTIFICAT DE SCOLARITÉ' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titre?: string;

  @ApiProperty({
    required: false,
    description:
      'Texte du document. Variables : {{nom_complet}}, {{matricule}}, {{classe}}, {{date_naissance}}, {{fonction}}, {{date_du_jour}}, {{reference}}.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  corps?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mentions?: string;
  @ApiProperty({ required: false, example: 'Le Directeur' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  signataire?: string;
  @ApiProperty({ required: false, example: 'Cotonou' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lieu?: string;
}

export class CreerTypeDocumentDto {
  @ApiProperty({
    example: 'certificat_scolarite',
    description: 'Code stable (minuscules, chiffres, _ ou -).',
  })
  @Matches(/^[a-z][a-z0-9_-]{2,59}$/)
  code: string;

  @ApiProperty({ example: 'Certificat de scolarité' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nom: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CATEGORIES_DEMANDEUR })
  @IsIn(CATEGORIES_DEMANDEUR as unknown as string[])
  categorie_demandeur: string;

  @ApiProperty({ required: false, type: ReglesEligibiliteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReglesEligibiliteDto)
  regles_eligibilite?: ReglesEligibiliteDto;

  @ApiProperty({
    required: false,
    description: 'Document delivre automatiquement des que la demande est eligible.',
  })
  @IsOptional()
  @IsBoolean()
  traitement_automatique?: boolean;

  @ApiProperty({
    required: false,
    description: 'Delai indicatif de traitement affiche au demandeur (jours).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  delai_indicatif_jours?: number;

  @ApiProperty({ required: false, type: ModeleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModeleDto)
  modele?: ModeleDto;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() actif?: boolean;
}

export class ModifierTypeDocumentDto extends PartialType(CreerTypeDocumentDto) {}
