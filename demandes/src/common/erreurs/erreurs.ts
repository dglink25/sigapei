import { HttpException, HttpStatus } from '@nestjs/common';

/** Erreur metier au format plateforme : { success: false, message, error: { code, details? } }. */
export class ErreurMetier extends HttpException {
  constructor(statut: HttpStatus, code: string, message: string, details?: Record<string, unknown>) {
    super({ code, message, details }, statut);
  }

  static introuvable(message = 'Ressource introuvable.') {
    return new ErreurMetier(HttpStatus.NOT_FOUND, 'RESSOURCE_INTROUVABLE', message);
  }

  static accesRefuse(message = "Vous n'avez pas accès à cette ressource.", code = 'ACCES_REFUSE') {
    return new ErreurMetier(HttpStatus.FORBIDDEN, code, message);
  }

  static conflit(code: string, message: string, details?: Record<string, unknown>) {
    return new ErreurMetier(HttpStatus.CONFLICT, code, message, details);
  }

  static invalide(champ: string, message: string) {
    return new ErreurMetier(HttpStatus.UNPROCESSABLE_ENTITY, 'DONNEES_INVALIDES', message, { [champ]: [message] });
  }
}

/** Un microservice amont ne repond pas ou ne fournit pas le contrat attendu : 503, jamais un acces accorde par defaut. */
export class DependanceIndisponible extends HttpException {
  constructor(public readonly detailInterne: string) {
    super(
      {
        code: 'SERVICE_DEPENDANT_INDISPONIBLE',
        message: 'Un service de la plateforme est momentanément indisponible. Réessayez plus tard.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
