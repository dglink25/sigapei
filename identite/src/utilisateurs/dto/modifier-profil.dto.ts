import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ModifierProfilDto {
  @ApiPropertyOptional({ example: 'Jean Dupont', description: 'Nom complet à afficher' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomComplet?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photo.jpg', description: 'URL de la photo de profil' })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  photoUrl?: string;
}
