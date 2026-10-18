import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListerJournalDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid', description: "Filtre sur un etablissement." })
  @IsOptional()
  @IsUUID()
  etablissementUuid?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtre sur un service.' })
  @IsOptional()
  @IsUUID()
  serviceUuid?: string;
}
