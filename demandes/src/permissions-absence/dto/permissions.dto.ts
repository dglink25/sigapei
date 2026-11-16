import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SoumettrePermissionDto {
  @ApiProperty({
    description: 'Apprenant concerne (vous-meme ou votre enfant).',
  })
  @IsUUID()
  apprenant_uuid: string;
  @ApiProperty({ example: '2026-11-03' })
  @IsDateString({ strict: true })
  date_debut: string;
  @ApiProperty({ example: '2026-11-05' })
  @IsDateString({ strict: true })
  date_fin: string;
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(nettoyer)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  motif: string;
}

export class DeciderPermissionDto {
  @ApiProperty({ enum: ['validee', 'rejetee'] })
  @IsIn(['validee', 'rejetee'])
  decision: 'validee' | 'rejetee';

  @ApiProperty({
    required: false,
    description: 'Obligatoire en cas de rejet (10 caracteres minimum).',
  })
  @ValidateIf((o) => o.decision === 'rejetee' || o.motif !== undefined)
  @Transform(nettoyer)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  motif?: string;
}

export class FiltresPermissionsDto {
  @ApiProperty({
    required: false,
    enum: ['en_attente', 'validee', 'rejetee', 'annulee'],
  })
  @IsOptional()
  @IsIn(['en_attente', 'validee', 'rejetee', 'annulee'])
  statut?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  apprenant_uuid?: string;
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
