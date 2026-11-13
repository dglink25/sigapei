import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CATEGORIES_RECLAMATION } from '../../gouvernance/actions';

const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const CATEGORIES = CATEGORIES_RECLAMATION as unknown as string[];

export class OuvrirReclamationDto {
  @ApiProperty({ enum: CATEGORIES }) @IsIn(CATEGORIES) categorie: string;
  @ApiProperty({ maxLength: 150 })
  @Transform(nettoyer)
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  objet: string;
  @ApiProperty({ maxLength: 4000 })
  @Transform(nettoyer)
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;
  @ApiProperty({
    required: false,
    description: 'Apprenant concerne (vous-meme ou votre enfant), facultatif.',
  })
  @IsOptional()
  @IsUUID()
  beneficiaire_apprenant_uuid?: string;
}

export class OuvrirVersUsagerDto extends OuvrirReclamationDto {
  @ApiProperty({
    description: "Compte de l'usager destinataire (parent, membre du personnel...).",
  })
  @IsUUID()
  destinataire_uuid: string;
}

export class MessageDto {
  @ApiProperty({ maxLength: 4000 })
  @Transform(nettoyer)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  contenu: string;
}

export const STATUTS_RECLAMATION = ['ouverte', 'en_cours', 'resolue', 'cloturee'] as const;

export class StatutReclamationDto {
  @ApiProperty({ enum: STATUTS_RECLAMATION })
  @IsIn(STATUTS_RECLAMATION as unknown as string[])
  statut: string;
}

export class FiltresReclamationsDto {
  @ApiProperty({ required: false, enum: STATUTS_RECLAMATION })
  @IsOptional()
  @IsIn(STATUTS_RECLAMATION as unknown as string[])
  statut?: string;
  @ApiProperty({ required: false, enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  categorie?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(60)
  recherche?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  par_page?: number;
}
