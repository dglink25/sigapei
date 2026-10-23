import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID, Matches } from 'class-validator';

export const REGEX_ACTION_PERMISSION = /^[a-z][a-z0-9_]{1,63}$/;
const actionDepuisNom = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

export class CreerPermissionDto {
  @ApiProperty({ format: 'uuid', description: 'Role cible (systeme ou personnalise).' })
  @IsUUID()
  roleUuid: string;

  @ApiProperty({ format: 'uuid', description: 'Service (module) sur lequel porte la permission.' })
  @IsUUID()
  serviceUuid: string;

  @ApiProperty({
    example: 'traiter',
    description:
      'Action metier du module (minuscules, chiffres et underscore). Actions standard : lire, creer, modifier, supprimer, traiter, valider, rejeter, archiver.',
  })
  @Transform(({ value }) => actionDepuisNom(value))
  @Matches(REGEX_ACTION_PERMISSION, {
    message: "L'action doit contenir 2 a 64 caracteres : minuscules, chiffres ou underscore, en commencant par une lettre.",
  })
  action: string;

  @ApiPropertyOptional({ default: true, description: 'false = refus explicite de cette action.' })
  @IsOptional()
  @IsBoolean()
  autorise?: boolean;
}
