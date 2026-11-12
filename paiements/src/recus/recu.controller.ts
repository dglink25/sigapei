import {
  Controller, Get, Post, Param, Query, Res, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { RecuService } from './recu.service';

@Controller()
export class RecuController {
  constructor(private readonly service: RecuService) {}

  /** Lien de téléchargement sécurisé (token dans URL + OTP optionnel pour invités) */
  @Get('recus/telecharger/:jeton')
  async telecharger(
    @Param('jeton') jeton: string,
    @Query('code') code: string | undefined,
    @Res() res: Response,
  ) {
    const { pdfBytes, nomFichier } = await this.service.telechargerRecu(jeton, code);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Cache-Control', 'no-store');
    res.end(pdfBytes);
  }

  /** Affichage inline (ouvrir dans le navigateur) */
  @Get('recus/afficher/:jeton')
  async afficher(
    @Param('jeton') jeton: string,
    @Query('code') code: string | undefined,
    @Res() res: Response,
  ) {
    const { pdfBytes, numero } = await this.service.telechargerRecu(jeton, code);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recu-${numero}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(pdfBytes);
  }

  /** Vérification publique de l'authenticité d'un reçu */
  @Get('paiement/verif/:code')
  async verifier(@Param('code') code: string) {
    return this.service.verifierRecu(code);
  }

  /** Liste les reçus d'un établissement */
  @Get('etablissements/:etablissementUuid/recus')
  async lister(
    @Param('etablissementUuid') etablissementUuid: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
  ) {
    const p = Math.max(1, page ?? 1);
    const l = Math.min(100, Math.max(1, limite ?? 20));
    const rows = await this.service['ds'].query(
      `SELECT uuid, numero, type, montant, devise, signataire, signe_le, created_at
         FROM "paiement"."recu"
        WHERE etablissement_uuid = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [etablissementUuid, l, (p - 1) * l],
    );
    const [{ total }] = await this.service['ds'].query(
      `SELECT COUNT(*)::int AS total FROM "paiement"."recu" WHERE etablissement_uuid = $1`,
      [etablissementUuid],
    );
    return { recus: rows, pagination: { page: p, limite: l, total, pages: Math.ceil(total / l) } };
  }
}
