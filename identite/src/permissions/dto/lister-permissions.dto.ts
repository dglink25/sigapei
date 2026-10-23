import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { REGEX_ACTION_PERMISSION } from './creer-permission.dto';

const booleen = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};
const actionDepuisNom = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

export class ListerPermissionsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtre sur un role.' })
  @IsOptional()
  @IsUUID()
  roleUuid?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtre sur un service.' })
  @IsOptional()
  @IsUUID()
  serviceUuid?: string;

  @ApiPropertyOptional({ example: 'valider', description: 'Filtre sur une action.' })
  @IsOptional()
  @Transform(({ value }) => actionDepuisNom(value))
  @Matches(REGEX_ACTION_PERMISSION, {
    message: "L'action doit contenir 2 a 64 caracteres : minuscules, chiffres ou underscore, en commencant par une lettre.",
  })
  action?: string;

  @ApiPropertyOptional({ description: 'Filtre sur le sens de la permission (accord / refus).' })
  @IsOptional()
  @Transform(booleen)
  @IsBoolean()
  autorise?: boolean;

  @ApiPropertyOptional({ description: 'Recherche sur le role, le service ou l\'action.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
