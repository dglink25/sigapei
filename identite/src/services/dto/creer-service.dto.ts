import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export const REGEX_CODE_SERVICE = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const nettoyer = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreerServiceDto {
  @ApiProperty({ example: 'scolarite', description: 'Code stable et immuable (minuscules, chiffres, - et _).' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(REGEX_CODE_SERVICE, {
    message: 'Le code doit contenir 2 a 64 caracteres : minuscules, chiffres, tiret ou underscore.',
  })
  code: string;

  @ApiProperty({ example: 'Scolarite' })
  @Transform(nettoyer)
  @IsString()
  @Length(2, 255)
  nom: string;

  @ApiPropertyOptional({ example: 'Gestion des classes, notes et bulletins.' })
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @MaxLength(1000)
  description?: string;
}
