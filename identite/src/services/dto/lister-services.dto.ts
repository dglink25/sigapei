import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StatutService } from '../service.entity';

export class ListerServicesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le code.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: StatutService })
  @IsOptional()
  @IsEnum(StatutService)
  status?: StatutService;
}
