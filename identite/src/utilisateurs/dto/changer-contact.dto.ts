import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DemanderChangementEmailDto {
  @ApiProperty({ example: 'nouveau@exemple.com', description: 'Nouvel e-mail souhaité — un code OTP sera envoyé à cette adresse' })
  @IsEmail()
  @MaxLength(255)
  nouvelEmail: string;
}

export class ConfirmerChangementEmailDto {
  @ApiProperty({ example: 'nouveau@exemple.com' })
  @IsEmail()
  @MaxLength(255)
  nouvelEmail: string;

  @ApiProperty({ example: '482931', description: 'Code OTP reçu par e-mail (6 chiffres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  code: string;
}

export class DemanderChangementTelephoneDto {
  @ApiProperty({ example: '+22997000000', description: 'Nouveau numéro E.164 — un OTP sera envoyé par SMS et WhatsApp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nouveauTelephone: string;
}

export class ConfirmerChangementTelephoneDto {
  @ApiProperty({ example: '+22997000000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nouveauTelephone: string;

  @ApiProperty({ example: '482931', description: 'Code OTP reçu par SMS/WhatsApp (6 chiffres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  code: string;
}

export class VerifierIdentifiantRecuperationDto {
  @ApiProperty({ example: '482931', description: "Code OTP reçu sur l'identifiant de récupération (6 chiffres)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  code: string;
}

export class SupprimerEmpreinteDto {
  @ApiProperty({ example: '482931', description: 'Code OTP pour confirmer l\'identité avant révocation (6 chiffres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  code: string;
}
