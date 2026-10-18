import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { REGEX_CODE_SERVICE } from '../../services/dto/creer-service.dto';

export class VerifierAccesQueryDto {
  @IsUUID()
  utilisateurUuid: string;

  /** Optionnel : sans code, renvoie la liste complete des services accessibles. */
  @IsOptional()
  @IsString()
  @Matches(REGEX_CODE_SERVICE)
  serviceCode?: string;
}
