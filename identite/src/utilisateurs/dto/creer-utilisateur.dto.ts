import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreerUtilisateurDto {
  @ApiProperty({ description: 'Nom complet.' })
  @IsString()
  @Length(2, 255)
  nomComplet: string;

  @ApiProperty({ required: false, description: 'Adresse e-mail (unique).' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Téléphone E.164 (unique).' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ description: "UUID du rôle à assigner." })
  @IsUUID()
  roleUuid: string;

  @ApiProperty({
    required: false,
    description: "UUID du tenant (établissement). Obligatoire pour tout rôle autre que super_admin. " +
      "L'admin de l'établissement ne peut créer que dans son propre tenant.",
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
