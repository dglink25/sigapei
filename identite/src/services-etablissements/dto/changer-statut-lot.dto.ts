import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { StatutService } from '../../services/service.entity';

export class ChangerStatutLotDto {
  @ApiProperty({ type: [String], format: 'uuid', description: '1 a 200 assignations (uuid).' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  assignationUuids: string[];

  @ApiProperty({ enum: StatutService, description: 'inactive = bloquer, active = reactiver.' })
  @IsEnum(StatutService)
  status: StatutService;

  @ApiPropertyOptional({ description: 'Motif du blocage (ignore pour une reactivation).' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  motif?: string;
}
