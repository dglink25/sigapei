import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RechercherCompteDto {
  @ApiProperty({ example: 'Jean Dupont', description: 'Nom complet ou identifiant de recuperation configure.' })
  @IsString()
  @MinLength(2)
  indice: string;

  @ApiProperty({ description: 'Jeton CAPTCHA obtenu cote client.' })
  @IsString()
  captchaToken: string;
}
