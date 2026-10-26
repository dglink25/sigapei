import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignerRoleDto {
  @ApiProperty({ description: "UUID du rôle à assigner à l'utilisateur." })
  @IsUUID()
  roleUuid: string;
}
