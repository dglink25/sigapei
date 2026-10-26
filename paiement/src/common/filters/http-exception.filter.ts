import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Uniformise les erreurs : { success: false, error: { code, message, details? }, path, timestamp }.
 * En production, aucun détail interne (SQL, noms de tables, piles) n'est renvoyé au client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'ERREUR_INTERNE';
    let message = 'Une erreur interne est survenue.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = this.codeDepuisStatut(status);
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message) ? 'Les donnees envoyees sont invalides.' : ((b.message as string) ?? message);
        code = (b.code as string) ?? this.codeDepuisStatut(status);
        details = b.details ?? (Array.isArray(b.message) ? b.message : undefined);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      if (process.env.NODE_ENV !== 'production') message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private codeDepuisStatut(status: number): string {
    const m: Record<number, string> = {
      400: 'REQUETE_INVALIDE', 401: 'NON_AUTHENTIFIE', 403: 'ACCES_REFUSE', 404: 'RESSOURCE_INTROUVABLE',
      409: 'CONFLIT', 422: 'DONNEES_INVALIDES', 429: 'TROP_DE_REQUETES',
    };
    return m[status] ?? 'ERREUR_INTERNE';
  }
}
