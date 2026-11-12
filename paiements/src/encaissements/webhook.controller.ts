/**
 * Controller Webhooks / IPN
 * Reçoit les notifications des agrégateurs : FedaPay, Kkiapay, CinetPay.
 * - Vérifie la signature avant tout traitement
 * - Répond 200 immédiatement et traite de façon asynchrone
 * - Les doublons sont gérés par l'unicité sur empreinte_corps
 */
import { Controller, Post, Param, Req, Res, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { AgregateurRegistre } from '../agregateurs/agregateur.registre';
import { EncaissementService } from './encaissement.service';

interface AgregateurRow { id: number; code: string; }
interface EvenementRow { id: number; statut: string; }

@Controller('webhooks')
export class WebhookController {
  private readonly log = new Logger(WebhookController.name);

  constructor(
    private readonly ds: DataSource,
    private readonly agregateurs: AgregateurRegistre,
    private readonly encaissementService: EncaissementService,
  ) {}

  @Post(':code')
  @HttpCode(HttpStatus.OK)
  async recevoir(
    @Param('code') code: string,
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ): Promise<Record<string, boolean>> {
    const corpsBrut: Buffer = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from('{}');
    const entetes = req.headers as Record<string, string>;

    let ag;
    try { ag = this.agregateurs.obtenir(code); } catch {
      this.log.warn(`Webhook agrégateur inconnu: ${code}`);
      return { received: false };
    }

    const result = ag.verifierWebhook(corpsBrut, entetes);
    const empreinte = createHash('sha256').update(corpsBrut).digest('hex');
    const ip = req.ip ?? req.socket.remoteAddress ?? null;

    const agregateurRows = await this.ds.query(
      `SELECT id FROM "paiement"."agregateur" WHERE code = $1`, [code],
    ) as AgregateurRow[];
    if (!agregateurRows.length) return { received: true };
    const agregateurId = agregateurRows[0].id;

    let evenementId: number | null = null;
    try {
      const rows = await this.ds.query(
        `INSERT INTO "paiement"."evenement_agregateur"
           (agregateur_id, evenement_externe_id, type, empreinte_corps, corps, entetes, ip, signature_valide, statut)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::inet, $8, 'recu')
         ON CONFLICT (agregateur_id, empreinte_corps)
         DO UPDATE SET tentatives = "paiement"."evenement_agregateur".tentatives + 1
         RETURNING id, statut`,
        [
          agregateurId,
          this.extraireIdExterne(result.corps, code),
          this.extraireTypeEvenement(result.corps, code),
          empreinte,
          result.valide ? JSON.stringify(result.corps) : JSON.stringify({}),
          JSON.stringify({ fwd: entetes['x-forwarded-for'] }),
          ip,
          result.valide,
        ],
      ) as EvenementRow[];

      if (!rows.length) return { received: true };
      const evt = rows[0];
      evenementId = evt.id;
      if (evt.statut === 'traite') return { received: true };
    } catch (err: unknown) {
      this.log.error(`Enregistrement webhook ${code}: ${(err as Error).message}`);
      return { received: true };
    }

    if (!result.valide) {
      this.log.warn(`Webhook ${code} signature invalide: ${result.motif}`);
      await this.ds.query(
        `UPDATE "paiement"."evenement_agregateur" SET statut = 'ignore', erreur = $1 WHERE id = $2`,
        [result.motif, evenementId],
      );
      return { received: true };
    }

    // Traitement asynchrone (ne bloque pas la réponse HTTP)
    this.traiterAsync(code, evenementId, result.corps).catch((err: unknown) => {
      this.log.error(`Traitement webhook ${code} #${evenementId}: ${(err as Error).message}`);
    });

    return { received: true };
  }

  private async traiterAsync(code: string, evenementId: number, corps: Record<string, unknown>): Promise<void> {
    try {
      await this.ds.transaction(async (m) => {
        const refAgregateur = this.extraireReferenceAgregateur(corps, code);
        const statutAgregateur = this.extraireStatutAgregateur(corps, code);
        if (refAgregateur) {
          await this.encaissementService.traiterWebhookEncaissement(code, refAgregateur, statutAgregateur, corps, m);
        }
        await m.query(
          `UPDATE "paiement"."evenement_agregateur" SET statut = 'traite', traite_le = now() WHERE id = $1`,
          [evenementId],
        );
      });
    } catch (err: unknown) {
      await this.ds.query(
        `UPDATE "paiement"."evenement_agregateur"
            SET statut = 'erreur', erreur = $1, tentatives = tentatives + 1 WHERE id = $2`,
        [(err as Error).message, evenementId],
      );
    }
  }

  private extraireIdExterne(corps: Record<string, unknown>, code: string): string | null {
    if (code === 'fedapay') return String((corps['entity'] as Record<string, unknown>)?.['id'] ?? corps['id'] ?? '');
    if (code === 'kkiapay') return String(corps['transactionId'] ?? '');
    if (code === 'cinetpay') return String(corps['cpm_trans_id'] ?? corps['transaction_id'] ?? '');
    return null;
  }

  private extraireTypeEvenement(corps: Record<string, unknown>, code: string): string {
    if (code === 'fedapay') return String(corps['name'] ?? corps['event'] ?? 'unknown');
    if (code === 'kkiapay') return String(corps['event'] ?? (corps['isPaymentSucces'] ? 'transaction.success' : 'transaction.failed'));
    return 'ipn.payment';
  }

  private extraireReferenceAgregateur(corps: Record<string, unknown>, code: string): string | null {
    if (code === 'fedapay') return String((corps['entity'] as Record<string, unknown>)?.['id'] ?? corps['id'] ?? '');
    if (code === 'kkiapay') return String(corps['transactionId'] ?? '');
    if (code === 'cinetpay') return String(corps['cpm_trans_id'] ?? corps['transaction_id'] ?? '');
    return null;
  }

  private extraireStatutAgregateur(corps: Record<string, unknown>, code: string): string {
    if (code === 'fedapay') return String((corps['entity'] as Record<string, unknown>)?.['status'] ?? corps['status'] ?? 'pending');
    if (code === 'kkiapay') return corps['isPaymentSucces'] ? 'SUCCESS' : 'FAILED';
    return String(corps['cpm_result'] ?? corps['status'] ?? 'PENDING');
  }
}
