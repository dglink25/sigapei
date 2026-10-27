import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SoumettreDemandeDto {
  @ApiProperty() @IsUUID() type_document_uuid: string;

  @ApiProperty({
    required: false,
    description: "Apprenant concerne (vous-meme ou votre enfant) : obligatoire pour un document d'apprenant.",
  })
  @IsOptional()
  @IsUUID()
  beneficiaire_apprenant_uuid?: string;

  @ApiProperty({
    required: false,
    description: "Precisions pour le service (motif, nombre d'exemplaires...).",
  })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}

export class MotifDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(nettoyer)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  motif: string;
}

export class TraiterDemandeDto {
  @ApiProperty({
    required: false,
    description: 'Texte du document a la place du modele (demande libre, cas particulier).',
  })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  corps?: string;

  @ApiProperty({
    required: false,
    description: 'Nom imprime si le dossier ne le fournit pas (demande libre).',
  })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nom_complet?: string;
}

export class PrioriteDto {
  @ApiProperty() @IsBoolean() priorite: boolean;
}

export const STATUTS_DEMANDE = ['recue', 'bloquee', 'en_traitement', 'prete', 'rejetee', 'annulee'] as const;

export class FiltresDemandesDto {
  @ApiProperty({ required: false, enum: STATUTS_DEMANDE })
  @IsOptional()
  @IsIn(STATUTS_DEMANDE as unknown as string[])
  statut?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  type_document_uuid?: string;
  @ApiProperty({
    required: false,
    description: 'Recherche par reference (DA-2026-...)',
  })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(30)
  recherche?: string;
  @ApiProperty({ required: false, enum: ['recentes', 'anciennes', 'priorite'] })
  @IsOptional()
  @IsIn(['recentes', 'anciennes', 'priorite'])
  tri?: string;
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
