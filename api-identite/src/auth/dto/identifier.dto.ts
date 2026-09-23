import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class IdentifierDto {
  @ApiProperty({ example: '+22997000000 ou jean@ecole.bj ou MAT-2026-001' })
  @IsString()
  @MinLength(3)
  identifiant: string;
}
