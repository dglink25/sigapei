import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { CATEGORIES_RECLAMATION, LISTE_ACTIONS } from '../actions';

export class PerimetreDto {
  @ApiProperty({
    required: false,
    isArray: true,
    enum: CATEGORIES_RECLAMATION,
    description: 'Reclamations : categories traitees (toutes si absent).',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(CATEGORIES_RECLAMATION as unknown as string[], { each: true })
  categories?: string[];
}

export class PermissionDto {
  @ApiProperty({ enum: LISTE_ACTIONS })
  @IsIn(LISTE_ACTIONS)
  action: string;

  @ApiProperty({ required: false, type: PerimetreDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerimetreDto)
  perimetre?: PerimetreDto;
}

export class DefinirPermissionsDto {
  @ApiProperty({
    type: [PermissionDto],
    description: 'Liste COMPLETE des actions accordees au role (remplace la precedente).',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
