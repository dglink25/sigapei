import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { StatutService } from '../service.entity';

const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Le code est immuable : il n'est volontairement pas modifiable. */
export class ModifierServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @Length(2, 255)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: StatutService, description: 'inactive = bloque partout, pour tous les etablissements.' })
  @IsOptional()
  @IsEnum(StatutService)
  status?: StatutService;
}
