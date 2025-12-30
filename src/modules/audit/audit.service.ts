import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';
import { audit_logsWhereInput } from 'src/generated/prisma/models';
import { InputJsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener logs de auditoría con filtros
   */
  async getLogs(queryDto: AuditLogsQueryDto) {
    const where: audit_logsWhereInput = {};

    // Filtros
    if (queryDto.action) {
      where.action = queryDto.action;
    }

    if (queryDto.entity_type) {
      where.entity_type = queryDto.entity_type;
    }

    if (queryDto.user_id) {
      where.user_id = queryDto.user_id;
    }

    if (queryDto.from || queryDto.to) {
      where.created_at = {};
      if (queryDto.from) {
        const fromDate = new Date(queryDto.from);
        fromDate.setHours(0, 0, 0, 0);
        where.created_at.gte = fromDate;
      }
      if (queryDto.to) {
        const toDate = new Date(queryDto.to);
        toDate.setHours(23, 59, 59, 999);
        where.created_at.lte = toDate;
      }
    }

    // Obtener logs con paginación
    const logs = await this.prisma.audit_logs.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 100, // Limitar a 100 registros
    });

    return logs.map((log) => {
      const oldValues = log.old_values as Record<string, unknown> | null;
      const newValues = log.new_values as Record<string, unknown> | null;

      return {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id || undefined,
        user: log.user
          ? {
              name: log.user.name,
              role: log.user.role,
            }
          : null,
        changes:
          oldValues || newValues
            ? {
                old: oldValues || undefined,
                new: newValues || undefined,
              }
            : undefined,
        ip_address: log.ip_address || undefined,
        user_agent: log.user_agent || undefined,
        created_at: log.created_at,
      };
    });
  }

  /**
   * Obtener historial de una entidad específica
   */
  async getEntityHistory(entityType: string, entityId: string) {
    const logs = await this.prisma.audit_logs.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      entity_type: entityType,
      entity_id: entityId,
      history: logs.map((log) => {
        const oldValues = log.old_values as Record<string, unknown> | null;
        const newValues = log.new_values as Record<string, unknown> | null;

        return {
          id: log.id,
          action: log.action,
          user: log.user
            ? {
                name: log.user.name,
                role: log.user.role,
              }
            : null,
          changes:
            oldValues || newValues
              ? {
                  old: oldValues || undefined,
                  new: newValues || undefined,
                }
              : undefined,
          ip_address: log.ip_address || undefined,
          created_at: log.created_at,
        };
      }),
    };
  }

  /**
   * Obtener acciones de un usuario específico
   */
  async getUserActions(userId: string, limit = 50) {
    const logs = await this.prisma.audit_logs.findMany({
      where: {
        user_id: userId,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    // Agrupar por acción
    const byAction: Record<string, number> = {};
    logs.forEach((log) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    // Agrupar por entidad
    const byEntity: Record<string, number> = {};
    logs.forEach((log) => {
      byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
    });

    const userName =
      logs.length > 0 && logs[0].user ? logs[0].user.name : 'Unknown';
    const userRole = logs.length > 0 && logs[0].user ? logs[0].user.role : null;

    return {
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      total_actions: logs.length,
      by_action: Object.entries(byAction).map(([action, count]) => ({
        action,
        count,
      })),
      by_entity: Object.entries(byEntity).map(([entity, count]) => ({
        entity_type: entity,
        count,
      })),
      recent_actions: logs.slice(0, 20).map((log) => {
        const oldValues = log.old_values as Record<string, unknown> | null;
        const newValues = log.new_values as Record<string, unknown> | null;

        return {
          id: log.id,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id || undefined,
          changes:
            oldValues || newValues
              ? {
                  old: oldValues || undefined,
                  new: newValues || undefined,
                }
              : undefined,
          ip_address: log.ip_address || undefined,
          created_at: log.created_at,
        };
      }),
    };
  }

  /**
   * Crear log de auditoría
   */
  async createLog(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    return this.prisma.audit_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues as InputJsonValue,
        new_values: newValues as InputJsonValue,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getStatistics(days = 7) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    fromDate.setHours(0, 0, 0, 0);

    const logs = await this.prisma.audit_logs.findMany({
      where: {
        created_at: {
          gte: fromDate,
        },
      },
      select: {
        action: true,
        entity_type: true,
        created_at: true,
      },
    });

    // Total por acción
    const byAction: Record<string, number> = {};
    logs.forEach((log) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    // Total por tipo de entidad
    const byEntity: Record<string, number> = {};
    logs.forEach((log) => {
      byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
    });

    // Actividad por día
    const byDay: Record<string, number> = {};
    logs.forEach((log) => {
      const day = log.created_at.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        days,
      },
      totals: {
        total_logs: logs.length,
        by_action: Object.entries(byAction).map(([action, count]) => ({
          action,
          count,
        })),
        by_entity: Object.entries(byEntity).map(([entity, count]) => ({
          entity_type: entity,
          count,
        })),
      },
      activity_by_day: Object.entries(byDay)
        .map(([date, count]) => ({
          date,
          count,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  }
}
