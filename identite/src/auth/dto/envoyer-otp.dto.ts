import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EnvoyerOtpDto {
  @ApiProperty({ example: '+22997000000 ou jean@ecole.bj' })
  @IsString()
  @MinLength(3)
  identifiant: string;

  @ApiProperty({ description: 'Jeton CAPTCHA obtenu cote client (reCAPTCHA v3 / hCaptcha).' })
  @IsString()
  captchaToken: string;
}
