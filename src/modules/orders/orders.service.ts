import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { order_status } from 'src/generated/prisma/enums';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CloseOrderDto } from './dto/close-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderHistoryDto } from './dto/order-history.dto';
import { ordersWhereInput } from 'src/generated/prisma/models';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const table = await this.prisma.tables.findUnique({
      where: { id: createOrderDto.table_id },
      include: {
        floor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    const activeOrder = await this.prisma.orders.findFirst({
      where: {
        table_id: createOrderDto.table_id,
        status: {
          in: ['ABIERTA', 'CERRADA'],
        },
      },
    });

    if (activeOrder) {
      throw new ConflictException(
        `La mesa #${table.number} ya tiene una orden activa (#${activeOrder.daily_number})`,
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrder = await this.prisma.orders.findFirst({
      where: {
        order_date: today,
      },
      orderBy: { daily_number: 'desc' },
      select: { daily_number: true },
    });

    const dailyNumber = (lastOrder?.daily_number || 0) + 1;

    try {
      const order = await this.prisma.orders.create({
        data: {
          daily_number: dailyNumber,
          order_date: today,
          user_id: userId,
          table_id: createOrderDto.table_id,
          diners_count: createOrderDto.diners_count,
          notes: createOrderDto.notes,
          status: order_status.ABIERTA,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          table: {
            select: {
              number: true,
              name: true,
              floor: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        success: true,
        message: `Orden #${order.daily_number} creada para la mesa #${order.table.number} (${order.table.floor.name})`,
        data: {
          id: order.id,
          daily_number: order.daily_number,
          order_date: order.order_date.toISOString().split('T')[0],
          table_number: order.table.number,
          table_name: order.table.name,
          floor_name: order.table.floor.name,
          diners_count: order.diners_count,
          user: order.user.name,
          status: order.status,
          created_at: order.created_at,
          message: `Orden #${order.daily_number} creada exitosamente para Mesa ${order.table.number} (${order.table.floor.name})`,
        },
      };
    } catch (error) {
      this.logger.error('Error interno al crear la orden', error);
      throw new BadRequestException('Error interno al crear la orden');
    }
  }

  /**
   * Listar órdenes activas
   */
  async findActive() {
    const orders = await this.prisma.orders.findMany({
      where: {
        status: {
          in: ['ABIERTA', 'CERRADA'],
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        table: {
          select: {
            number: true,
            name: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            order_items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order) => this.mapToListItem(order));
  }

  /**
   * Obtener orden activa de una mesa
   */
  async findByTableId(tableId: string) {
    const order = await this.prisma.orders.findFirst({
      where: {
        table_id: tableId,
        status: {
          in: ['ABIERTA', 'CERRADA'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                area_preparacion: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!order) {
      return null;
    }

    return this.mapToResponse(order);
  }

  /**
   * Obtener órdenes activas del usuario/mesero
   */
  async findMyOrders(userId: string) {
    const orders = await this.prisma.orders.findMany({
      where: {
        user_id: userId,
        status: {
          in: ['ABIERTA', 'CERRADA'],
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        table: {
          select: {
            number: true,
            name: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            order_items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order) => this.mapToListItem(order));
  }

  /**
   * Obtener detalle de una orden
   */
  async findOne(id: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                area_preparacion: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID "${id}" no encontrada`);
    }

    return this.mapToResponse(order);
  }

  /**
   * Actualizar orden (solo si está ABIERTA)
   */
  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const existingOrder = await this.prisma.orders.findUnique({
      where: { id },
      select: { status: true, table_id: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Orden con ID "${id}" no encontrada`);
    }

    if (existingOrder.status !== order_status.ABIERTA) {
      throw new BadRequestException(
        'Solo se pueden actualizar órdenes abiertas',
      );
    }

    // Si se cambia la mesa, validar que no haya orden activa en la nueva mesa
    if (
      updateOrderDto.table_id &&
      updateOrderDto.table_id !== existingOrder.table_id
    ) {
      const conflictOrder = await this.prisma.orders.findFirst({
        where: {
          table_id: updateOrderDto.table_id,
          status: {
            in: ['ABIERTA', 'CERRADA'],
          },
          id: { not: id },
        },
        include: {
          table: {
            select: {
              number: true,
            },
          },
        },
      });

      if (conflictOrder) {
        throw new ConflictException(
          `La mesa #${conflictOrder.table.number} ya tiene una orden activa (#${conflictOrder.daily_number})`,
        );
      }
    }

    const order = await this.prisma.orders.update({
      where: { id },
      data: updateOrderDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                area_preparacion: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return this.mapToResponse(order);
  }

  /**
   * Cerrar orden (lista para pagar)
   */
  async close(id: string, closeOrderDto?: CloseOrderDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { status: true, notes: true },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID "${id}" no encontrada`);
    }

    if (order.status !== order_status.ABIERTA) {
      throw new BadRequestException('Solo se pueden cerrar órdenes abiertas');
    }

    // Verificar que tenga items
    const itemsCount = await this.prisma.order_items.count({
      where: {
        order_id: id,
        is_cancelled: false,
      },
    });

    if (itemsCount === 0) {
      throw new BadRequestException(
        'No se puede cerrar una orden sin items activos',
      );
    }

    const updatedOrder = await this.prisma.orders.update({
      where: { id },
      data: {
        status: order_status.CERRADA,
        notes: closeOrderDto?.notes
          ? `${order.notes || ''}\n--- CIERRE ---\n${closeOrderDto.notes}`
          : order.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                area_preparacion: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return this.mapToResponse(updatedOrder);
  }

  /**
   * Cancelar orden completa
   */
  async cancel(id: string, cancelOrderDto: CancelOrderDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID "${id}" no encontrada`);
    }

    if (order.status === order_status.CANCELADA) {
      throw new BadRequestException('La orden ya está cancelada');
    }

    if (order.status === order_status.PAGADA) {
      throw new BadRequestException('No se puede cancelar una orden pagada');
    }

    // Cancelar todos los items NO cancelados ni pagados
    await this.prisma.order_items.updateMany({
      where: {
        order_id: id,
        is_cancelled: false,
        is_paid: false,
      },
      data: {
        is_cancelled: true,
        cancelled_at: new Date(),
        cancel_reason: cancelOrderDto.reason,
      },
    });

    // Recalcular totales
    await this.recalculateTotal(id);

    const cancelledOrder = await this.prisma.orders.update({
      where: { id },
      data: {
        status: order_status.CANCELADA,
        notes: `CANCELADA: ${cancelOrderDto.reason}`,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                area_preparacion: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return this.mapToResponse(cancelledOrder);
  }

  /**
   * Obtener historial
   */
  async getHistory(filters: OrderHistoryDto) {
    const where: ordersWhereInput = {};

    if (filters.from || filters.to) {
      where.order_date = {};
      if (filters.from) {
        where.order_date.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.order_date.lte = new Date(filters.to);
      }
    }

    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.table_id) {
      where.table_id = filters.table_id;
    }

    const orders = await this.prisma.orders.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        table: {
          select: {
            number: true,
            name: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            order_items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return orders.map((order) => this.mapToListItem(order));
  }

  /**
   * Recalcular totales de la orden
   */
  async recalculateTotal(orderId: string): Promise<void> {
    // Subtotal: items NO cancelados
    const subtotalResult = await this.prisma.order_items.aggregate({
      where: {
        order_id: orderId,
        is_cancelled: false,
      },
      _sum: {
        line_total: true,
      },
    });

    const subtotal = Number(subtotalResult._sum.line_total || 0);

    // Total cancelado: items cancelados
    const cancelledResult = await this.prisma.order_items.aggregate({
      where: {
        order_id: orderId,
        is_cancelled: true,
      },
      _sum: {
        line_total: true,
      },
    });

    const totalCancelled = Number(cancelledResult._sum.line_total || 0);

    // Total pagado: suma de payments
    const paidResult = await this.prisma.payments.aggregate({
      where: { order_id: orderId },
      _sum: { amount: true },
    });

    const totalPaid = Number(paidResult._sum.amount || 0);
    const totalPending = Math.max(0, subtotal - totalPaid);

    // Contar pagos para is_split_payment
    const paymentCount = await this.prisma.payments.count({
      where: { order_id: orderId },
    });

    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        subtotal,
        total_cancelled: totalCancelled,
        total_paid: totalPaid,
        total_pending: totalPending,
        is_split_payment: paymentCount > 1,
        split_payment_count: paymentCount,
      },
    });
  }

  /**
   * Marcar como pagada
   */
  async markAsPaid(orderId: string): Promise<void> {
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        status: order_status.PAGADA,
      },
    });
  }

  /**
   * Resumen
   */
  async getSummary(filters?: OrderHistoryDto) {
    const where: ordersWhereInput = {};

    if (filters?.from || filters?.to) {
      where.order_date = {};
      if (filters.from) {
        where.order_date.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.order_date.lte = new Date(filters.to);
      }
    }

    const totalOrders = await this.prisma.orders.count({ where });

    const activeOrders = await this.prisma.orders.count({
      where: {
        ...where,
        status: {
          in: ['ABIERTA', 'CERRADA'],
        },
      },
    });

    const closedOrders = await this.prisma.orders.count({
      where: { ...where, status: order_status.CERRADA },
    });

    const cancelledOrders = await this.prisma.orders.count({
      where: { ...where, status: order_status.CANCELADA },
    });

    const salesAgg = await this.prisma.orders.aggregate({
      where: {
        ...where,
        status: {
          in: ['CERRADA', 'PAGADA'],
        },
      },
      _sum: { subtotal: true },
      _avg: { subtotal: true, diners_count: true },
    });

    return {
      total_orders: totalOrders,
      active_orders: activeOrders,
      closed_orders: closedOrders,
      cancelled_orders: cancelledOrders,
      total_sales: Number(salesAgg._sum.subtotal || 0),
      average_ticket: Number(salesAgg._avg.subtotal || 0),
      average_diners: Number(salesAgg._avg.diners_count || 0),
    };
  }

  private mapToResponse(order: any) {
    const orderItems = order.order_items.map((item: any) => ({
      id: item.id,
      product_name: item.product_name,
      product_short_name: item.product_short_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      variants_total: Number(item.variants_total),
      line_total: Number(item.line_total),
      variants_snapshot: item.variants_snapshot,
      status: item.status,
      area_preparacion: item.product.area_preparacion,
      notes: item.notes,
      is_cancelled: item.is_cancelled,
      is_paid: item.is_paid,
      created_at: item.created_at,
      sent_to_kitchen_at: item.sent_to_kitchen_at,
      printed_at: item.printed_at,
      cancelled_at: item.cancelled_at,
      paid_at: item.paid_at,
    }));

    return {
      id: order.id,
      daily_number: order.daily_number,
      order_date: order.order_date.toISOString().split('T')[0],
      table: {
        id: order.table.id,
        number: order.table.number,
        name: order.table.name,
        capacity: order.table.capacity,
        floor_name: order.table.floor.name,
      },
      diners_count: order.diners_count,
      user: {
        id: order.user.id,
        name: order.user.name,
      },
      status: order.status,
      subtotal: Number(order.subtotal),
      total_cancelled: Number(order.total_cancelled),
      total_paid: Number(order.total_paid),
      total_pending: Number(order.total_pending),
      is_split_payment: order.is_split_payment,
      split_payment_count: order.split_payment_count,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_items: orderItems,
    };
  }

  private mapToListItem(order: any) {
    const now = new Date();
    const durationHours =
      (now.getTime() - order.created_at.getTime()) / (1000 * 60 * 60);

    return {
      id: order.id,
      daily_number: order.daily_number,
      order_date: order.order_date.toISOString().split('T')[0],
      table_number: order.table.number,
      table_name: order.table.name,
      floor_name: order.table.floor.name,
      diners_count: order.diners_count,
      user_name: order.user.name,
      status: order.status,
      subtotal: Number(order.subtotal),
      total_pending: Number(order.total_pending),
      is_split_payment: order.is_split_payment,
      items_count: order._count.order_items,
      created_at: order.created_at,
      duration_hours: Number(durationHours.toFixed(2)),
    };
  }
}
