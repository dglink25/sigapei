import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum TypeIdentifiantDto {
  EMAIL = 'email',
  TELEPHONE = 'telephone',
}

export class AjouterIdentifiantRecuperationDto {
  @ApiProperty({ enum: TypeIdentifiantDto })
  @IsEnum(TypeIdentifiantDto)
  type: TypeIdentifiantDto;

  @ApiProperty()
  @IsString()
  valeur: string;
}
