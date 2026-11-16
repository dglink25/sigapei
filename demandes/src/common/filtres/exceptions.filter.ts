import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Format d'erreur unique de la plateforme : { success: false, message, error: { code, details? } }.
 * Aucune trace technique n'est jamais renvoyee au client (journalisee seulement).
 */
@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statut = exception.getStatus();
      const corps = exception.getResponse() as any;
      const parDefaut: Record<number, [string, string]> = {
        400: ['REQUETE_INVALIDE', 'Requête invalide.'],
        401: ['NON_AUTHENTIFIE', 'Vous devez être connecté.'],
        403: ['ACCES_REFUSE', 'Accès refusé.'],
        404: ['RESSOURCE_INTROUVABLE', 'Ressource introuvable.'],
        429: ['TROP_DE_REQUETES', 'Trop de requêtes. Patientez un instant.'],
      };
      const [codeDefaut, messageDefaut] = parDefaut[statut] ?? ['REQUETE_REFUSEE', 'Requête refusée.'];
      const code = typeof corps === 'object' && typeof corps.code === 'string' ? corps.code : codeDefaut;
      const message = typeof corps === 'object' && typeof corps.message === 'string' && corps.code ? corps.message : messageDefaut;
      res.status(statut).json({
        success: false,
        message,
        error: {
          code,
          ...(typeof corps === 'object' && corps.details ? { details: corps.details } : {}),
        },
      });
      return;
    }

    this.logger.error(`[EXCEPTION_NON_ATTRAPEE] ${(exception as Error)?.message}`, (exception as Error)?.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.',
      error: { code: 'ERREUR_SERVEUR' },
    });
  }
}
