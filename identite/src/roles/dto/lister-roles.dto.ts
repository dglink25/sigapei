import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FamilleAuth } from '../role.entity';

export class ListerRolesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Recherche sur le code ou le libelle.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: FamilleAuth, description: "Filtre sur la famille d'authentification." })
  @IsOptional()
  @IsEnum(FamilleAuth)
  familleAuth?: FamilleAuth;

  @ApiPropertyOptional({ description: 'Cible un etablissement (reserve au super_admin ; ignore sinon).' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
