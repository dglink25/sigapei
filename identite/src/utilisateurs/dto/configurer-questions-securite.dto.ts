import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionReponseDto {
  @ApiProperty({ example: 'premier_etablissement' })
  questionId: string;

  @ApiProperty({ example: 'CEG Akassato' })
  reponse: string;
}

export class ConfigurerQuestionsSecuriteDto {
  @ApiProperty({ type: [QuestionReponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionReponseDto)
  questions: QuestionReponseDto[];
}
