import { INestApplication, UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ExceptionsFilter } from './filtres/exceptions.filter';
import { ReponseInterceptor } from './filtres/reponse.interceptor';

/** Messages de validation en francais, jamais les messages techniques anglais de class-validator. */
const MESSAGES: Record<string, string> = {
  isNotEmpty: 'Ce champ est obligatoire.',
  isDefined: 'Ce champ est obligatoire.',
  isUuid: 'Identifiant invalide.',
  isIn: 'Valeur non autorisée.',
  isEnum: 'Valeur non autorisée.',
  isString: 'Texte attendu.',
  isBoolean: 'Valeur oui/non attendue.',
  isInt: 'Nombre entier attendu.',
  min: 'Valeur trop petite.',
  max: 'Valeur trop grande.',
  maxLength: 'Texte trop long.',
  minLength: 'Texte trop court.',
  isDateString: 'Date invalide (format AAAA-MM-JJ).',
  matches: 'Format invalide.',
  isArray: 'Liste attendue.',
  arrayMaxSize: 'Liste trop longue.',
  arrayMinSize: 'Liste trop courte.',
  isObject: 'Objet attendu.',
  whitelistValidation: "Ce champ n'est pas autorisé.",
  nestedValidation: 'Contenu invalide.',
};

function aplatir(erreurs: ValidationError[], prefixe = ''): Record<string, string[]> {
  const sortie: Record<string, string[]> = {};
  for (const e of erreurs) {
    const champ = prefixe ? `${prefixe}.${e.property}` : e.property;
    if (e.constraints) {
      sortie[champ] = Object.keys(e.constraints).map((nom) => MESSAGES[nom] ?? 'Valeur invalide.');
    }
    if (e.children?.length) Object.assign(sortie, aplatir(e.children, champ));
  }
  return sortie;
}

/** Configuration commune (production et tests) : validation stricte, format d'erreur et de reponse uniques. */
export function configurerApplication(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (erreurs) => {
        const details = aplatir(erreurs);
        const premier = Object.values(details)[0]?.[0] ?? 'Données invalides.';
        return new UnprocessableEntityException({
          code: 'DONNEES_INVALIDES',
          message: premier,
          details,
        });
      },
    }),
  );
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ReponseInterceptor());
}
