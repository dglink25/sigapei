import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/** Enveloppe de succes unique : { success: true, message?, data }. Les fichiers (PDF) passent tels quels. */
@Injectable()
export class ReponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((valeur) => {
        if (valeur instanceof StreamableFile || Buffer.isBuffer(valeur)) return valeur;
        if (valeur && typeof valeur === 'object' && 'success' in valeur) return valeur;
        if (valeur && typeof valeur === 'object' && '__message' in valeur) {
          const { __message, data } = valeur as {
            __message: string;
            data: unknown;
          };
          return { success: true, message: __message, data };
        }
        return { success: true, data: valeur ?? null };
      }),
    );
  }
}

/** Reponse avec message (ex. creation) : return avecMessage('Demande enregistree.', demande). */
export const avecMessage = <T>(message: string, data: T) => ({
  __message: message,
  data,
});
