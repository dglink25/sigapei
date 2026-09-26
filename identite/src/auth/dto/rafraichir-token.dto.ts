import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RafraichirTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
