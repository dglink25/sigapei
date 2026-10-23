import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { REGEX_ACTION_PERMISSION } from './creer-permission.dto';

const actionDepuisNom = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

export class LignePermissionDto {
  @ApiProperty({ format: 'uuid', description: 'Service (module) concerne.' })
  @IsUUID()
  serviceUuid: string;

  @ApiProperty({ example: 'lire' })
  @Transform(({ value }) => actionDepuisNom(value))
  @Matches(REGEX_ACTION_PERMISSION, {
    message: "L'action doit contenir 2 a 64 caracteres : minuscules, chiffres ou underscore, en commencant par une lettre.",
  })
  action: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autorise?: boolean;
}

/** Remplace d'un bloc la matrice de permissions d'un role (idempotent : les lignes absentes sont supprimees). */
export class RemplacerPermissionsRoleDto {
  @ApiProperty({ type: [LignePermissionDto], description: '1 a 500 permissions (role x service x action).' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LignePermissionDto)
  permissions: LignePermissionDto[];
}
