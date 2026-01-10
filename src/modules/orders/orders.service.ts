import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
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
import { CashRegistersService } from '../cash-registers/cash-registers.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashRegistersService: CashRegistersService,
  ) {}

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
      const order = await this.prisma.$transaction(async (tx) => {
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

        await this.prisma.tables.update({
          where: { id: createOrderDto.table_id },
          data: { status: 'OCUPADA' },
        });

        return order;
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
          in: [
            'ABIERTA',
            'CERRADA',
            'EN_PAGO_DIVIDIDO',
            'PARCIALMENTE_PAGADA',
            'CANCELADA',
            'PAGADA',
          ],
        },
      },
      include: {
        order_items: true,
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

    return {
      success: true,
      message: 'lista de ordenes obtenida',
      data: orders.map((order) => this.mapToListItem(order)),
    };
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
      throw new NotFoundException(
        'No hay orden activa en la mesa especificada',
      );
    }

    return {
      success: true,
      message: 'Orden activa encontrada',
      data: this.mapToResponse(order),
    };
  }

  async findMyOrders(userId: string) {
    try {
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

      return {
        success: true,
        message: 'Órdenes del mesero obtenidas',
        data: orders.map((order) => this.mapToListItem(order)),
      };
    } catch (error) {
      this.logger.error(
        'Error interno al obtener las órdenes del mesero',
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener las órdenes del mesero',
      );
    }
  }

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
      throw new NotFoundException('Orden no encontrada');
    }

    return {
      success: true,
      message: 'Detalle de la orden obtenido exitosamente',
      data: this.mapToResponse(order),
    };
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
    // const itemsCount = await this.prisma.order_items.count({
    //   where: {
    //     order_id: id,
    //     is_cancelled: false,
    //   },
    // });

    // if (itemsCount === 0) {
    //   throw new BadRequestException(
    //     'No se puede cerrar una orden sin items activos',
    //   );
    // }

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
   * - Solo órdenes SIN pagos previos
   * - Requiere caja abierta
   * - Crea movimiento de caja para trazabilidad
   */
  async cancel(
    orderId: string,
    userId: string,
    cancelOrderDto: CancelOrderDto,
    cashId: string,
  ) {
    // 1. Obtener orden con campos necesarios
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        total_paid: true,
        daily_number: true,
        subtotal: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // 2. Validar estado
    if (order.status === order_status.CANCELADA) {
      throw new BadRequestException('La orden ya está cancelada');
    }

    if (order.status === order_status.PAGADA) {
      throw new BadRequestException('No se puede cancelar una orden pagada');
    }

    // 3. VALIDAR: No permitir si hay pagos realizados
    if (Number(order.total_paid) > 0) {
      throw new BadRequestException(
        'No se puede cancelar una orden con pagos realizados. Debe anular los pagos primero.',
      );
    }

    // const hasOpenCash =
    //   await this.cashRegistersService.hasOpenCashRegister(userId);

    // const count = await this.prisma.cash_registers.count({
    //   where: {
    //     user_id: userId,
    //     status: 'ABIERTA',
    //   },
    // });

    // 4. Obtener caja abierta del usuario
    const openCashRegister = await this.prisma.cash_registers.findFirst({
      where: {
        user_id: userId,
        status: 'ABIERTA',
      },
    });

    if (!openCashRegister) {
      throw new BadRequestException(
        'Debe tener una caja abierta para cancelar órdenes',
      );
    }

    // 5. Transacción atómica
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // 5.1 Cancelar todos los items NO cancelados ni pagados
      await tx.order_items.updateMany({
        where: {
          order_id: orderId,
          is_cancelled: false,
          is_paid: false,
        },
        data: {
          is_cancelled: true,
          cancelled_at: new Date(),
          cancel_reason: cancelOrderDto.reason,
          cancelled_by: userId,
        },
      });

      // 5.2 Crear movimiento de caja (TRAZABILIDAD - monto 0)
      await tx.cash_movements.create({
        data: {
          cash_register_id: openCashRegister.id,
          type: 'EGRESO',
          amount: 0,
          description: `Cancelación - Orden #${order.daily_number}: ${cancelOrderDto.reason}`,
          is_automatic: true,
          created_by: userId,
        },
      });

      // 5.3 Actualizar orden
      const updated = await tx.orders.update({
        where: { id: orderId },
        data: {
          status: order_status.CANCELADA,
          total_cancelled: order.subtotal,
          total_pending: 0,
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

      // 5.4 LIBERAR MESA
      await tx.tables.update({
        where: { id: updated.table.id },
        data: { status: 'LIBRE' },
      });

      return updated;
    });

    return this.mapToResponse(cancelledOrder);
  }

  async cancelOrderWithWaiter(orderId: string) {
    const orderFound = await this.prisma.orders.findFirst({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        order_items: true,
      },
    });

    if (!orderFound) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (orderFound.status === 'CANCELADA') {
      throw new BadRequestException('La orden ya está cancelada');
    }

    if (orderFound.status === order_status.PAGADA) {
      throw new BadRequestException('No se puede cancelar una orden pagada');
    }

    if (Number(orderFound.total_paid) > 0) {
      throw new BadRequestException(
        'No se puede cancelar una orden con pagos realizados. Debe anular los pagos primero.',
      );
    }
  }

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

    try {
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

      return {
        success: true,
        message: 'Historial de órdenes obtenido exitosamente',
        data: orders.map((order) => this.mapToListItem(order)),
      };
    } catch (error) {
      this.logger.error(
        'Error interno al obtener el historial de órdenes',
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener el historial de órdenes',
      );
    }
  }

  // /**
  //  * Recalcular totales de la orden
  //  */
  // async recalculateTotal(orderId: string) {
  //   // Subtotal: items NO cancelados
  //   const subtotalResult = await this.prisma.order_items.aggregate({
  //     where: {
  //       order_id: orderId,
  //       is_cancelled: false,
  //     },
  //     _sum: {
  //       line_total: true,
  //     },
  //   });

  //   const subtotal = Number(subtotalResult._sum.line_total || 0);

  //   // Total cancelado: items cancelados
  //   const cancelledResult = await this.prisma.order_items.aggregate({
  //     where: {
  //       order_id: orderId,
  //       is_cancelled: true,
  //     },
  //     _sum: {
  //       line_total: true,
  //     },
  //   });

  //   const totalCancelled = Number(cancelledResult._sum.line_total || 0);

  //   // Total pagado: suma de amount_paid de order_items (para pagos parciales)
  //   const itemsPaidResult = await this.prisma.order_items.aggregate({
  //     where: {
  //       order_id: orderId,
  //       is_cancelled: false,
  //     },
  //     _sum: {
  //       amount_paid: true,
  //     },
  //   });

  //   const totalPaid = Number(itemsPaidResult._sum.amount_paid || 0);
  //   const totalPending = Math.max(0, subtotal - totalPaid);

  //   // Contar pagos para is_split_payment
  //   const paymentCount = await this.prisma.payments.count({
  //     where: { order_id: orderId },
  //   });

  //   // Verificar si hay items parcialmente pagados
  //   const partialPaymentsCount = await this.prisma.order_items.count({
  //     where: {
  //       order_id: orderId,
  //       is_cancelled: false,
  //       amount_paid: { gt: 0 },
  //       is_paid: false,
  //     },
  //   });

  //   // Determinar estado de la orden
  //   let newStatus: order_status;
  //   if (totalPending === 0) {
  //     newStatus = order_status.PAGADA;
  //   } else if (partialPaymentsCount > 0 || paymentCount > 1) {
  //     newStatus = order_status.EN_PAGO_DIVIDIDO;
  //   } else if (totalPaid > 0) {
  //     newStatus = order_status.PARCIALMENTE_PAGADA;
  //   } else {
  //     newStatus = order_status.ABIERTA; // o mantener el estado actual
  //   }

  //   await this.prisma.orders.update({
  //     where: { id: orderId },
  //     data: {
  //       subtotal,
  //       total_cancelled: totalCancelled,
  //       total_paid: totalPaid,
  //       total_pending: totalPending,
  //       is_split_payment: paymentCount > 1,
  //       split_payment_count: paymentCount,
  //       status: newStatus,
  //     },
  //   });
  // }

  /**
   * Recalcular totales de la orden
   * NOTA: Este método SOLO actualiza totales numéricos, NO cambia el estado de la orden
   */
  async recalculateTotal(orderId: string): Promise<void> {
    // 1. Subtotal: items NO cancelados
    const subtotalResult = await this.prisma.order_items.aggregate({
      where: {
        order_id: orderId,
        is_cancelled: false,
      },
      _sum: {
        line_total: true,
      },
    });
    const subtotal = Number(subtotalResult._sum.line_total ?? 0);

    // 2. Total cancelado: items cancelados
    const cancelledResult = await this.prisma.order_items.aggregate({
      where: {
        order_id: orderId,
        is_cancelled: true,
      },
      _sum: {
        line_total: true,
      },
    });
    const totalCancelled = Number(cancelledResult._sum.line_total ?? 0);

    // 3. Total pagado: suma de amount_paid de items NO cancelados
    const paidResult = await this.prisma.order_items.aggregate({
      where: {
        order_id: orderId,
        is_cancelled: false,
      },
      _sum: {
        amount_paid: true,
      },
    });
    const totalPaid = Number(paidResult._sum.amount_paid ?? 0);

    // 4. Total pendiente
    const totalPending = Math.max(0, subtotal - totalPaid);

    // 5. Contar pagos
    const paymentCount = await this.prisma.payments.count({
      where: { order_id: orderId },
    });

    // 6. Actualizar SOLO totales (NO el estado)
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
   * Marcar items como pagados (para pagos parciales)
   */
  // async updateItemPayments(
  //   orderId: string,
  //   itemUpdates: Array<{
  //     item_id: string;
  //     quantity_paid: number;
  //     amount_paid: number;
  //     is_fully_paid: boolean;
  //   }>,
  // ): Promise<void> {
  //   const updatePromises = itemUpdates.map((update) =>
  //     this.prisma.order_items.update({
  //       where: { id: update.item_id },
  //       data: {
  //         quantity_paid: update.quantity_paid,
  //         amount_paid: update.amount_paid,
  //         is_paid: update.is_fully_paid,
  //         paid_at: update.is_fully_paid ? new Date() : undefined,
  //       },
  //     }),
  //   );

  //   await Promise.all(updatePromises);

  //   // Recalcular totales después de actualizar items
  //   await this.recalculateTotal(orderId);
  // }

  /**
   * Verificar si items tienen saldo disponible para pago parcial
   */
  async checkItemAvailability(
    orderId: string,
    itemAllocations: Array<{
      item_id: string;
      quantity: number;
    }>,
  ): Promise<{ available: boolean; items: any[] }> {
    const itemIds = itemAllocations.map((alloc) => alloc.item_id);

    const items = await this.prisma.order_items.findMany({
      where: {
        id: { in: itemIds },
        order_id: orderId,
        is_cancelled: false,
      },
      select: {
        id: true,
        quantity: true,
        quantity_paid: true,
        amount_paid: true,
        line_total: true,
        unit_price: true,
        product_name: true,
      },
    });

    const availability = items.map((item) => {
      const allocation = itemAllocations.find(
        (alloc) => alloc.item_id === item.id,
      );
      const remainingQuantity = item.quantity - item.quantity_paid;
      const remainingAmount =
        Number(item.line_total) - Number(item.amount_paid);

      return {
        item_id: item.id,
        product_name: item.product_name,
        available: remainingQuantity >= allocation!.quantity,
        remaining_quantity: remainingQuantity,
        remaining_amount: remainingAmount,
        requested_quantity: allocation!.quantity,
      };
    });

    const allAvailable = availability.every((item) => item.available);

    return {
      available: allAvailable,
      items: availability,
    };
  }

  /**
   * Obtener progreso de pagos de una orden
   */
  async getPaymentProgress(orderId: string): Promise<any> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          where: { is_cancelled: false },
          include: {
            payment_items: {
              include: {
                payment: {
                  select: {
                    id: true,
                    payment_number: true,
                    amount: true,
                    payment_method: true,
                    payer_name: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            processor: {
              select: { name: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const itemsProgress = order.order_items.map((item) => {
      const totalPayments = item.payment_items.reduce(
        (sum, pi) => sum + Number(pi.amount),
        0,
      );

      return {
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        quantity_paid: item.quantity_paid,
        amount: Number(item.line_total),
        amount_paid: Number(item.amount_paid),
        remaining_amount: Number(item.line_total) - Number(item.amount_paid),
        is_fully_paid: item.is_paid,
        payments: item.payment_items.map((pi) => ({
          payment_id: pi.payment.id,
          payment_number: pi.payment.payment_number,
          amount: Number(pi.amount),
          quantity_paid: pi.quantity_paid,
          payment_method: pi.payment.payment_method,
          payer_name: pi.payment.payer_name,
          created_at: pi.payment.created_at,
        })),
      };
    });

    const paymentsHistory = order.payments.map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number,
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
      payer_name: payment.payer_name,
      processed_by: payment.processor.name,
      created_at: payment.created_at,
    }));

    const payment_percentage =
      Number(order.subtotal) > 0
        ? (Number(order.total_paid) / Number(order.subtotal)) * 100
        : 0;

    return {
      order_id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      total_amount: Number(order.subtotal),
      total_paid: Number(order.total_paid),
      total_pending: Number(order.total_pending),
      payment_percentage: payment_percentage,
      is_split_payment: order.is_split_payment,
      split_payment_count: order.split_payment_count,
      items: itemsProgress,
      payments_history: paymentsHistory,
    };
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
      order_items: order.order_items,
    };
  }
}
