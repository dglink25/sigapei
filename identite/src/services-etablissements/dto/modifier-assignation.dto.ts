import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatutService } from '../../services/service.entity';

const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ModifierAssignationDto {
  @ApiPropertyOptional({ enum: StatutService })
  @IsOptional()
  @IsEnum(StatutService)
  status?: StatutService;

  @ApiPropertyOptional({ description: 'Motif du blocage ; efface automatiquement a la reactivation.' })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(255)
  motif?: string;
}

export class BloquerAssignationDto {
  @ApiPropertyOptional({ description: 'Motif du blocage (affichable cote back-office).' })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(255)
  motif?: string;
}
