import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmerRecuperationDto {
  @ApiProperty()
  @IsString()
  compteUuid: string;

  @ApiProperty()
  @IsString()
  @Length(6, 12)
  code: string;
}
