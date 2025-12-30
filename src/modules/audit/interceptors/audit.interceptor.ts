import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';

/**
 * Interceptor para auditoría automática
 * Se puede aplicar a controllers específicos para capturar acciones
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // Capturar antes de ejecutar
    const before = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Capturar después de ejecutar exitosamente
          const after = Date.now();
          const duration = after - before;

          // Determinar acción basada en método HTTP
          let action = 'UNKNOWN';
          if (method === 'POST') action = 'CREATE';
          else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
          else if (method === 'DELETE') action = 'DELETE';
          else if (method === 'GET' && url.includes('/login')) action = 'LOGIN';

          // Extraer tipo de entidad de la URL
          const entityType = this.extractEntityType(url);

          // Extraer ID de entidad si existe
          const entityId = this.extractEntityId(url, data);

          // Solo registrar si es una acción relevante
          if (
            action !== 'UNKNOWN' &&
            entityType &&
            !url.includes('/auth') &&
            !url.includes('/audit')
          ) {
            this.auditService
              .createLog(
                user?.id || null,
                action,
                entityType,
                entityId,
                null, // old_values - se debe implementar en cada controller
                null, // new_values - se debe implementar en cada controller
                ip || null,
                headers['user-agent'] || null,
              )
              .catch((err) => {
                console.error('Error creating audit log:', err);
              });
          }
        },
        error: (error) => {
          // Log de errores también si es necesario
          console.error('Action failed:', error.message);
        },
      }),
    );
  }

  private extractEntityType(url: string): string | null {
    const parts = url.split('/').filter(Boolean);
    if (parts.length > 0) {
      // Remover prefijos como 'api', 'v1'
      const filtered = parts.filter((p) => !['api', 'v1'].includes(p));
      return filtered[0] || null;
    }
    return null;
  }

  private extractEntityId(url: string, data: unknown): string | null {
    // Intentar extraer UUID de la URL
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = url.match(uuidRegex);
    if (match) {
      return match[0];
    }

    // Intentar extraer ID de la respuesta
    if (data && typeof data === 'object' && 'data' in data) {
      const responseData = (data as { data: unknown }).data;
      if (
        responseData &&
        typeof responseData === 'object' &&
        'id' in responseData
      ) {
        return (responseData as { id: string }).id;
      }
    }

    return null;
  }
}
