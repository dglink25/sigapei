import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { FamilleAuth } from '../role.entity';

export class CreerRoleDto {
  @ApiProperty({ example: 'agent_securite' })
  @IsString()
  @Length(2, 64)
  code: string;

  @ApiProperty({ example: 'Agent de securite' })
  @IsString()
  @Length(2, 128)
  libelle: string;

  @ApiProperty({
    enum: FamilleAuth,
    default: FamilleAuth.PERSONNEL_ADMIN,
    description:
      "Par defaut personnel_admin : le role herite du parcours e-mail/telephone/matricule+empreinte du personnel administratif.",
  })
  @IsOptional()
  @IsEnum(FamilleAuth)
  familleAuth?: FamilleAuth;

  @ApiProperty({ required: false, description: 'Laisser vide pour un role global (reserve super administrateur).' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
