import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Enveloppe toute reponse 2xx sous la forme { success: true, ...data }
 * - Si data est un tableau : { success: true, data: [...] }
 * - Si data est un objet avec "success" : pas de double-wrap
 * - Sinon : { success: true, ...data }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // Tableau : envelopper dans { success: true, data: [...] }
        if (Array.isArray(data)) {
          return { success: true, data };
        }
        return { success: true, ...(data ?? {}) };
      }),
    );
  }
}
