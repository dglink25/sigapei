import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppareilInfoDto } from './appareil-info.dto';

export class VerifierOtpDto {
  @ApiProperty({ example: '+22997000000 ou jean@ecole.bj' })
  @IsString()
  @MinLength(3)
  identifiant: string;

  @ApiProperty({ description: 'Code recu (6 chiffres par SMS/WhatsApp, 12 caracteres par e-mail).' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ type: AppareilInfoDto })
  @ValidateNested()
  @Type(() => AppareilInfoDto)
  appareil: AppareilInfoDto;
}
