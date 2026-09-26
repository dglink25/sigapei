import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Uniformise toutes les erreurs de l'API sous la forme :
 * { success: false, error: { code, message, details? }, path, timestamp }
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
      } else if (typeof body === 'object' && body !== null) {
        const anyBody = body as Record<string, unknown>;
        message = (anyBody.message as string) ?? message;
        code = (anyBody.code as string) ?? this.codeFromStatus(status);
        details = anyBody.details ?? anyBody.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'REQUETE_INVALIDE',
      401: 'NON_AUTHENTIFIE',
      403: 'ACCES_REFUSE',
      404: 'RESSOURCE_INTROUVABLE',
      409: 'CONFLIT',
      422: 'DONNEES_INVALIDES',
      429: 'TROP_DE_REQUETES',
      500: 'ERREUR_INTERNE',
    };
    return map[status] ?? 'ERREUR_INTERNE';
  }
}
