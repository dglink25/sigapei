import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AppareilInfoDto {
  @ApiProperty({ description: 'Identifiant local persistant genere par le client (app/navigateur).' })
  @IsString()
  identifiantLocal: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomAppareil?: string;

  @ApiProperty({ required: false, example: 'mobile | tablette | ordinateur' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, example: 'Android 14' })
  @IsOptional()
  @IsString()
  os?: string;
}
