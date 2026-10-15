import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignerEtablissementsDto {
  @ApiProperty({ type: [String], format: 'uuid', description: "1 a 200 etablissements ; ceux deja assignes sont ignores (listes dans dejaAssignes). Operation atomique." })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  etablissementUuids: string[];
}
