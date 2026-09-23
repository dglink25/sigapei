import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { FamilleAuth } from '../role.entity';

export class ModifierRoleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 128)
  libelle?: string;

  @ApiProperty({ required: false, enum: FamilleAuth })
  @IsOptional()
  @IsEnum(FamilleAuth)
  familleAuth?: FamilleAuth;
}
