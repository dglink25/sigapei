import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { FamilleAuth } from '../role.entity';

/** Code stable : minuscules, chiffres, tiret ou underscore (2 a 64 caracteres), comme le code service. */
export const REGEX_CODE_ROLE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export class CreerRoleDto {
  @ApiProperty({ example: 'agent_securite', description: 'Code stable et immuable (minuscules, chiffres, - et _).' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(REGEX_CODE_ROLE, {
    message: 'Le code doit contenir 2 a 64 caracteres : minuscules, chiffres, tiret ou underscore.',
  })
  code: string;

  @ApiProperty({ example: 'Agent de securite' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 128)
  libelle: string;

  @ApiProperty({
    enum: FamilleAuth,
    default: FamilleAuth.PERSONNEL_ADMIN,
    description:
      'Par defaut personnel_admin : le role herite du parcours e-mail/telephone/matricule+empreinte du personnel administratif.',
  })
  @IsOptional()
  @IsEnum(FamilleAuth)
  familleAuth?: FamilleAuth;

  @ApiProperty({ required: false, description: 'Laisser vide pour un role global (reserve super administrateur).' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
