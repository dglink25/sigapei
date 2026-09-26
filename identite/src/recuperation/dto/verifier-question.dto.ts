import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifierQuestionDto {
  @ApiProperty()
  @IsString()
  compteUuid: string;

  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  @IsString()
  reponse: string;
}
