import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignerServicesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  etablissementUuid: string;

  @ApiProperty({ type: [String], format: 'uuid', description: "1 a 50 services ; ceux deja assignes sont ignores (listes dans dejaAssignes)." })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  serviceUuids: string[];
}
