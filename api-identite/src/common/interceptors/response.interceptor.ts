import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Enveloppe toute reponse 2xx sous la forme { success: true, ...data }
 * sauf si le controleur a deja renvoye un champ "success" (evite le double-wrap).
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return { success: true, ...(data ?? {}) };
      }),
    );
  }
}
