import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PrintersService } from '../printers/printers.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import {
  order_item_status,
  order_status,
  user_role,
} from 'src/generated/prisma/enums';
import { BulkCreateOrderItemsDto } from './dto/bulk-create-order-items.dto';
import { OrderItemCreatedDto } from './dto/order-item-response.dto';
import { CancelOrderItemDto } from './dto/cancel-order-item.dto';
import { SendToKitchenDto } from './dto/send-to-kitchen.dto';
import { KitchenDisplayQueryDto } from './dto/kitchen-display-query.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';

@Injectable()
export class OrderItemsService {
  private readonly logger = new Logger(OrderItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly printersService: PrintersService,
  ) {}

  async addItem(
    orderId: string,
    userId: string,
    createOrderItemDto: CreateOrderItemDto,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status !== order_status.ABIERTA) {
      throw new BadRequestException(
        'Solo se pueden agregar items a órdenes abiertas',
      );
    }

    const product = await this.prisma.products.findUnique({
      where: { id: createOrderItemDto.product_id },
      include: {
        variant_groups: {
          where: { is_required: true },
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.is_active || !product.is_available) {
      throw new BadRequestException(
        `El producto ${product.name} no está disponible`,
      );
    }

    if (product.variant_groups.length > 0) {
      if (
        !createOrderItemDto.variants ||
        createOrderItemDto.variants.length === 0
      ) {
        throw new BadRequestException(
          `El producto ${product.name} requiere seleccionar variantes`,
        );
      }
    }

    const variantsTotal = createOrderItemDto.variants
      ? createOrderItemDto.variants.reduce(
          (sum, v) => sum + v.price_modifier,
          0,
        )
      : 0;

    const unitPrice = Number(product.price);
    // TODO: ver en mismos porductos ingresados de menra diferente
    const lineTotal = (unitPrice + variantsTotal) * createOrderItemDto.quantity;

    const orderItem = await this.prisma.order_items.create({
      data: {
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        product_short_name: product.short_name,
        quantity: createOrderItemDto.quantity,
        unit_price: unitPrice,
        variants_snapshot: JSON.stringify(createOrderItemDto.variants) || [],
        variants_total: variantsTotal,
        line_total: lineTotal,
        status: order_item_status.PENDIENTE,
        area_preparacion: product.area_preparacion,
        notes: createOrderItemDto.notes,
        created_by: userId,
      },
    });

    await this.ordersService.recalculateTotal(orderId);

    const updatedOrder = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { subtotal: true },
    });

    return {
      success: true,
      message: 'Item agregado exitosamente',
      data: {
        id: orderItem.id,
        product_name: orderItem.product_name,
        product_short_name: orderItem.product_short_name,
        quantity: orderItem.quantity,
        unit_price: Number(orderItem.unit_price),
        variants_total: Number(orderItem.variants_total),
        line_total: Number(orderItem.line_total),
        status: orderItem.status,
        area: orderItem.area_preparacion,
        notes: orderItem.notes,
        variants_snapshot: orderItem.variants_snapshot,
      },
      order_subtotal: Number(updatedOrder?.subtotal || 0),
    };
  }

  /**
   * Agregar múltiples items
   */
  async addBulkItems(
    orderId: string,
    userId: string,
    bulkCreateOrderItemsDto: BulkCreateOrderItemsDto,
  ) {
    const createdItems: OrderItemCreatedDto[] = [];

    for (const itemDto of bulkCreateOrderItemsDto.items) {
      const result = await this.addItem(orderId, userId, itemDto);
      createdItems.push(result.data);
    }

    // Obtener subtotal final
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { subtotal: true },
    });

    return {
      items_added: createdItems.length,
      items: createdItems,
      order_subtotal: Number(order?.subtotal || 0),
    };
  }

  /**
   * Actualizar estado del item
   */
  async updateStatus(
    itemId: string,
    userId: string,
    userRole: user_role,
    updateOrderItemStatusDto: UpdateOrderItemStatusDto,
  ) {
    const item = await this.prisma.order_items.findUnique({
      where: { id: itemId },
      select: { status: true, is_cancelled: true, is_paid: true },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID "${itemId}" no encontrado`);
    }

    if (item.is_cancelled) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un item cancelado',
      );
    }

    if (item.is_paid) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un item pagado',
      );
    }

    // Validar transiciones de estado según rol
    this.validateStatusTransition(
      item.status,
      updateOrderItemStatusDto.status,
      userRole,
    );

    // Actualizar estado
    const updatedItem = await this.prisma.order_items.update({
      where: { id: itemId },
      data: {
        status: updateOrderItemStatusDto.status,
      },
    });

    return {
      id: updatedItem.id,
      status: updatedItem.status,
      message: 'Estado actualizado exitosamente',
    };
  }

  /**
   * Cancelar item
   */
  async cancelItem(
    itemId: string,
    userId: string,
    cancelOrderItemDto: CancelOrderItemDto,
  ) {
    const item = await this.prisma.order_items.findUnique({
      where: { id: itemId },
      select: {
        is_cancelled: true,
        is_paid: true,
        order_id: true,
        sent_to_kitchen_at: true,
        creator: {
          select: { name: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID "${itemId}" no encontrado`);
    }

    if (item.is_cancelled) {
      throw new BadRequestException('El item ya está cancelado');
    }

    if (item.is_paid) {
      throw new BadRequestException(
        'No se puede cancelar un item que ya fue pagado',
      );
    }

    // Si ya fue enviado a cocina, requiere motivo
    if (item.sent_to_kitchen_at && !cancelOrderItemDto.reason) {
      throw new BadRequestException(
        'Se requiere un motivo para cancelar items que ya fueron enviados a cocina',
      );
    }

    // Obtener nombre del usuario que cancela
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Cancelar item
    const cancelledItem = await this.prisma.order_items.update({
      where: { id: itemId },
      data: {
        is_cancelled: true,
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancel_reason: cancelOrderItemDto.reason,
      },
    });

    // Recalcular total de la orden
    await this.ordersService.recalculateTotal(item.order_id);

    // Obtener nuevo subtotal
    const order = await this.prisma.orders.findUnique({
      where: { id: item.order_id },
      select: { subtotal: true },
    });

    return {
      id: cancelledItem.id,
      is_cancelled: cancelledItem.is_cancelled,
      cancelled_at: cancelledItem.cancelled_at!,
      cancelled_by: user?.name || 'Desconocido',
      cancel_reason: cancelledItem.cancel_reason!,
      order_subtotal: Number(order?.subtotal || 0),
    };
  }

  /**
   * Eliminar item (solo si está PENDIENTE)
   */
  async deleteItem(
    itemId: string,
  ): Promise<{ message: string; order_subtotal: number }> {
    const item = await this.prisma.order_items.findUnique({
      where: { id: itemId },
      select: { status: true, order_id: true },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID "${itemId}" no encontrado`);
    }

    if (item.status !== order_item_status.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden eliminar items con estado PENDIENTE',
      );
    }

    // Eliminar item
    await this.prisma.order_items.delete({
      where: { id: itemId },
    });

    // Recalcular total de la orden
    await this.ordersService.recalculateTotal(item.order_id);

    // Obtener nuevo subtotal
    const order = await this.prisma.orders.findUnique({
      where: { id: item.order_id },
      select: { subtotal: true },
    });

    return {
      message: 'Item eliminado exitosamente',
      order_subtotal: Number(order?.subtotal || 0),
    };
  }

  /**
   * Validar transición de estados
   */
  private validateStatusTransition(
    currentStatus: order_item_status,
    newStatus: order_item_status,
    userRole: user_role,
  ): void {
    const transitions: Record<
      order_item_status,
      { allowed: order_item_status[]; roles: user_role[] }[]
    > = {
      PENDIENTE: [
        {
          allowed: ['ENVIADO'],
          roles: ['ADMIN', 'CAJERO', 'MESERO'],
        },
      ],
      ENVIADO: [
        {
          allowed: ['EN_PREPARACION'],
          roles: ['ADMIN', 'CAJERO', 'COCINERO', 'BARTENDER'],
        },
      ],
      EN_PREPARACION: [
        {
          allowed: ['LISTO'],
          roles: ['ADMIN', 'CAJERO', 'COCINERO', 'BARTENDER'],
        },
      ],
      LISTO: [
        {
          allowed: ['ENTREGADO'],
          roles: ['ADMIN', 'CAJERO', 'MESERO'],
        },
      ],
      ENTREGADO: [],
    };

    const allowedTransitions = transitions[currentStatus];

    if (!allowedTransitions || allowedTransitions.length === 0) {
      throw new BadRequestException(
        `No se puede cambiar el estado desde "${currentStatus}"`,
      );
    }

    const validTransition = allowedTransitions.find(
      (t) => t.allowed.includes(newStatus) && t.roles.includes(userRole),
    );

    if (!validTransition) {
      throw new ForbiddenException(
        `No tiene permisos para cambiar de "${currentStatus}" a "${newStatus}"`,
      );
    }
  }

  /**
   * Enviar items a cocina/bar
   */
  async sendToKitchen(sendToKitchenDto: SendToKitchenDto) {
    // Verificar que la orden existe y está abierta
    const order = await this.prisma.orders.findUnique({
      where: { id: sendToKitchenDto.order_id },
      select: { status: true },
    });

    if (!order) {
      throw new NotFoundException(
        `Orden con ID "${sendToKitchenDto.order_id}" no encontrada`,
      );
    }

    if (order.status !== order_status.ABIERTA) {
      throw new BadRequestException(
        'Solo se pueden enviar items de órdenes abiertas',
      );
    }

    // Obtener items
    const items = await this.prisma.order_items.findMany({
      where: {
        id: { in: sendToKitchenDto.item_ids },
        order_id: sendToKitchenDto.order_id,
      },
      include: {
        product: {
          select: {
            area_preparacion: true,
          },
        },
      },
    });

    if (items.length === 0) {
      throw new NotFoundException('No se encontraron items para enviar');
    }

    // Validar que todos los items estén PENDIENTE
    const invalidItems = items.filter(
      (item) => item.status !== order_item_status.PENDIENTE,
    );
    if (invalidItems.length > 0) {
      throw new BadRequestException(
        'Solo se pueden enviar items con estado PENDIENTE',
      );
    }

    const printJobs: any[] = [];
    const now = new Date();

    // Agrupar por área de preparación
    const itemsByArea = items.reduce(
      (acc, item) => {
        const area = item.product.area_preparacion;
        if (!acc[area]) {
          acc[area] = [];
        }
        acc[area].push(item);
        return acc;
      },
      {} as Record<string, typeof items>,
    );

    // Enviar a impresoras por área
    for (const [area, areaItems] of Object.entries(itemsByArea)) {
      // Buscar impresora por defecto para el área
      const printer = await this.printersService.findDefaultByArea(area as any);

      // Actualizar items
      const itemIds = areaItems.map((i) => i.id);
      await this.prisma.order_items.updateMany({
        where: { id: { in: itemIds } },
        data: {
          status: order_item_status.ENVIADO,
          sent_to_kitchen_at: now,
          printer_id: printer?.id,
          printed_at: printer ? now : null,
        },
      });

      printJobs.push({
        printer: printer?.name || `Área ${area} (sin impresora)`,
        area,
        items_count: areaItems.length,
        status: printer ? 'SENT' : 'NO_PRINTER',
      });

      // TODO: Aquí se puede agregar lógica de impresión real
      // if (printer) {
      //   await this.printersService.printKitchenOrder(printer, orderData);
      // }
    }

    return {
      sent_count: items.length,
      print_jobs: printJobs,
      message: `${items.length} items enviados a preparación`,
    };
  }

  /**
   * Obtener items para pantalla de cocina/bar
   */
  async getKitchenDisplay(queryDto: KitchenDisplayQueryDto) {
    const area = queryDto.area || 'COCINA';

    const items = await this.prisma.order_items.findMany({
      where: {
        area_preparacion: area,
        status: {
          in: ['ENVIADO', 'EN_PREPARACION', 'LISTO'],
        },
        is_cancelled: false,
      },
      include: {
        order: {
          select: {
            daily_number: true,
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
        },
      },
      orderBy: {
        sent_to_kitchen_at: 'asc',
      },
    });

    const now = new Date();

    const data = items.map((item) => {
      const sentAt = item.sent_to_kitchen_at!;
      const minutesWaiting = Math.floor(
        (now.getTime() - sentAt.getTime()) / (1000 * 60),
      );

      // Determinar prioridad
      let priority = 'NORMAL';
      if (minutesWaiting > 30) {
        priority = 'URGENT';
      } else if (minutesWaiting > 15) {
        priority = 'DELAYED';
      }

      // Formatear variantes
      let variantsText = '';
      if (item.variants_snapshot && Array.isArray(item.variants_snapshot)) {
        variantsText = item.variants_snapshot
          .map((v: any) => `${v.option_name}`)
          .join(', ');
      }

      return {
        id: item.id,
        order_number: item.order.daily_number,
        table: `Mesa ${item.order.table.number}${item.order.table.name ? ` - ${item.order.table.name}` : ''}`,
        floor: item.order.table.floor.name,
        product_name: item.product_name,
        short_name: item.product_short_name,
        quantity: item.quantity,
        variants: variantsText || undefined,
        notes: item.notes,
        status: item.status,
        minutes_waiting: minutesWaiting,
        priority,
        sent_at: sentAt,
      };
    });

    // Calcular resumen
    const summary = {
      total_pending: data.length,
      urgent: data.filter((item) => item.priority === 'URGENT').length,
      delayed: data.filter((item) => item.priority === 'DELAYED').length,
    };

    return {
      data,
      summary,
    };
  }
}
