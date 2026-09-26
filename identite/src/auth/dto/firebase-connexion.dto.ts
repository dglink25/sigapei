import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppareilInfoDto } from './appareil-info.dto';

export class FirebaseConnexionDto {
  @ApiProperty({ description: "Jeton d'identite (ID token) Firebase issu de la connexion Google ou GitHub cote client." })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({ type: AppareilInfoDto })
  @ValidateNested()
  @Type(() => AppareilInfoDto)
  appareil: AppareilInfoDto;
}
