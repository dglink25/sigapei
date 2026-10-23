import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { REGEX_ACTION_PERMISSION } from './creer-permission.dto';

const actionDepuisNom = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

/** Le role et le service sont immuables : seuls l'action et le sens de la permission changent. */
export class ModifierPermissionDto {
  @ApiPropertyOptional({ example: 'valider' })
  @IsOptional()
  @Transform(({ value }) => actionDepuisNom(value))
  @Matches(REGEX_ACTION_PERMISSION, {
    message: "L'action doit contenir 2 a 64 caracteres : minuscules, chiffres ou underscore, en commencant par une lettre.",
  })
  action?: string;

  @ApiPropertyOptional({ description: 'true = accord, false = refus explicite.' })
  @IsOptional()
  @IsBoolean()
  autorise?: boolean;
}
