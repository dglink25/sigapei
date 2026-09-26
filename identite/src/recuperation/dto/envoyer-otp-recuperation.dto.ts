import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EnvoyerOtpRecuperationDto {
  @ApiProperty()
  @IsString()
  compteUuid: string;
}
