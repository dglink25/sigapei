import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Parametres de pagination communs aux listes (page 1-based, 20 elements par defaut, 100 max). */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}

export function lirePagination(dto: PaginationDto): { page: number; limite: number; offset: number } {
  const page = dto.page ?? 1;
  const limite = dto.limite ?? 20;
  return { page, limite, offset: (page - 1) * limite };
}

export function metaPagination(page: number, limite: number, total: number) {
  return { page, limite, total, pages: Math.max(1, Math.ceil(total / limite)) };
}

/** Echappe les jokers LIKE/ILIKE saisis par l'utilisateur (\, %, _). */
export function echapperLike(valeur: string): string {
  return valeur.replace(/[\\%_]/g, (c) => `\\${c}`);
}
