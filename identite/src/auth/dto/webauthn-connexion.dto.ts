import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppareilInfoDto } from './appareil-info.dto';

export class WebauthnOptionsConnexionDto {
  @ApiProperty({ example: 'MAT-2026-001' })
  @IsString()
  matricule: string;

  @ApiProperty({ description: "Identifiant local persistant de l'appareil (doit deja porter une empreinte enregistree)." })
  @IsString()
  identifiantLocal: string;
}

export class WebauthnVerifierConnexionDto extends WebauthnOptionsConnexionDto {
  @ApiProperty({ description: 'Reponse WebAuthn (AuthenticationResponseJSON) generee par le navigateur/OS.' })
  @IsObject()
  reponse: Record<string, unknown>;

  @ApiPropertyOptional({ type: AppareilInfoDto })
  @ValidateNested()
  @Type(() => AppareilInfoDto)
  appareilInfo?: AppareilInfoDto;
}

export class WebauthnVerifierEnregistrementDto {
  @ApiProperty()
  @IsString()
  identifiantLocal: string;

  @ApiProperty({ description: 'Reponse WebAuthn (RegistrationResponseJSON) generee par le navigateur/OS.' })
  @IsObject()
  reponse: Record<string, unknown>;
}
