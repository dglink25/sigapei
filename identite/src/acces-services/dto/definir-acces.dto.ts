import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

export class DefinirAccesDto {
  @ApiProperty({ example: true, description: "true = accorde l'acces, false = le revoque." })
  @IsBoolean()
  autorise: boolean;
}

export class AccordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  utilisateurUuid: string;

  @ApiProperty()
  @IsBoolean()
  autorise: boolean;
}

export class DefinirAccesLotDto {
  @ApiProperty({ type: () => [AccordDto], description: '1 a 200 accords, appliques dans une seule transaction (tout ou rien).' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AccordDto)
  accords: AccordDto[];
}
