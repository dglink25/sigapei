import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/** Enveloppe toute réponse 2xx : { success: true, ...data } (un tableau est placé sous la clé "donnees"). */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) return { success: true, donnees: data };
        if (data && typeof data === 'object' && 'success' in data) return data;
        return { success: true, ...(data ?? {}) };
      }),
    );
  }
}
