import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListerUtilisateursServiceDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le e-mail.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: "Filtre : true = avec acces, false = sans acces." })
  @IsOptional()
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    obj[key] === undefined ? undefined : obj[key] === 'true' || obj[key] === true,
  )
  @IsBoolean()
  autorise?: boolean;
}
