import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CashMovementsService } from '../cash-movements/cash-movements.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  cash_movement_type,
  comprobante_type,
  order_status,
  payment_method,
  table_status,
} from 'src/generated/prisma/enums';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly cashMovementsService: CashMovementsService,
    private readonly salesService: SalesService,
  ) {}

  /**
   * Procesar pago simple (completo)
   */
  async createPayment(
    userId: string,
    cashRegisterId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    // Verificar que la orden existe
    const order = await this.prisma.orders.findUnique({
      where: { id: createPaymentDto.order_id },
      include: {
        table: true,
        order_items: {
          where: { is_cancelled: false },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Orden con ID "${createPaymentDto.order_id}" no encontrada`,
      );
    }

    // Validar estado de la orden

    const allowedStatuses: order_status[] = [
      order_status.CERRADA,
      order_status.PARCIALMENTE_PAGADA,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Solo se pueden procesar pagos de órdenes CERRADA o PARCIALMENTE_PAGADA',
      );
    }

    // Validar que hay items
    if (order.order_items.length === 0) {
      throw new BadRequestException('La orden no tiene items para pagar');
    }

    // Validar monto
    const totalPending = Number(order.total_pending);
    if (createPaymentDto.amount > totalPending) {
      throw new BadRequestException(
        `El monto (${createPaymentDto.amount}) excede el pendiente (${totalPending})`,
      );
    }

    // Validar efectivo
    if (createPaymentDto.payment_method === payment_method.EFECTIVO) {
      if (!createPaymentDto.amount_received) {
        throw new BadRequestException(
          'Se requiere amount_received para pagos en efectivo',
        );
      }
      if (createPaymentDto.amount_received < createPaymentDto.amount) {
        throw new BadRequestException(
          'El monto recibido es menor al monto a pagar',
        );
      }
    }

    // Validar factura requiere cliente
    if (
      createPaymentDto.generate_document &&
      createPaymentDto.document_type === comprobante_type.FACTURA
    ) {
      if (!createPaymentDto.client_id) {
        throw new BadRequestException(
          'Se requiere client_id para generar FACTURA',
        );
      }
    }

    // Obtener número de pago
    const paymentCount = await this.prisma.payments.count({
      where: { order_id: order.id },
    });
    const paymentNumber = paymentCount + 1;

    // Calcular vuelto
    const changeGiven =
      createPaymentDto.payment_method === payment_method.EFECTIVO &&
      createPaymentDto.amount_received
        ? createPaymentDto.amount_received - createPaymentDto.amount
        : null;

    // Crear pago
    const payment = await this.prisma.payments.create({
      data: {
        order_id: order.id,
        cash_register_id: cashRegisterId,
        payment_number: paymentNumber,
        amount: createPaymentDto.amount,
        payment_method: createPaymentDto.payment_method,
        amount_received: createPaymentDto.amount_received,
        change_given: changeGiven,
        payer_notes: createPaymentDto.payer_notes,
        processed_by: userId,
      },
    });

    // Registrar movimiento de caja
    await this.cashMovementsService.createAutomatic(
      cashRegisterId,
      cash_movement_type.INGRESO,
      createPaymentDto.amount,
      `Pago - Orden #${order.daily_number}`,
      payment.id,
    );

    // Marcar items como pagados
    await this.prisma.order_items.updateMany({
      where: {
        order_id: order.id,
        is_cancelled: false,
        is_paid: false,
      },
      data: {
        is_paid: true,
        paid_at: new Date(),
        payment_id: payment.id,
      },
    });

    // Recalcular totales de la orden
    await this.ordersService.recalculateTotal(order.id);

    // Verificar si la orden quedó completamente pagada
    const updatedOrder = await this.prisma.orders.findUnique({
      where: { id: order.id },
      select: { total_pending: true },
    });

    let orderStatus = order.status;
    if (Number(updatedOrder!.total_pending) === 0) {
      // Marcar orden como PAGADA
      await this.ordersService.markAsPaid(order.id);
      orderStatus = order_status.PAGADA;

      // Cambiar estado de la mesa a LIMPIEZA
      await this.prisma.tables.update({
        where: { id: order.table_id },
        data: { status: table_status.LIMPIEZA },
      });
    }

    // Generar comprobante si se solicitó
    let sale: any = null;
    if (createPaymentDto.generate_document) {
      sale = await this.salesService.generateFromPayment(
        payment.id,
        createPaymentDto.document_type!,
        createPaymentDto.client_id,
        userId,
        cashRegisterId,
      );
    }

    // Obtener orden actualizada
    const finalOrder = await this.prisma.orders.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        status: true,
        total_paid: true,
        total_pending: true,
        is_split_payment: true,
        split_payment_count: true,
      },
    });

    return {
      payment: {
        id: payment.id,
        payment_number: payment.payment_number,
        amount: Number(payment.amount),
        payment_method: payment.payment_method,
        amount_received: payment.amount_received
          ? Number(payment.amount_received)
          : undefined,
        change_given: payment.change_given
          ? Number(payment.change_given)
          : undefined,
      },
      sale: sale
        ? {
            id: sale.id,
            tipo_comprobante: sale.tipo_comprobante,
            numero_completo: sale.numero_completo,
            precio_venta_total: Number(sale.precio_venta_total),
            monto_igv: Number(sale.monto_igv),
            valor_venta: Number(sale.valor_venta),
          }
        : undefined,
      order: {
        id: finalOrder!.id,
        status: orderStatus,
        total_paid: Number(finalOrder!.total_paid),
        total_pending: Number(finalOrder!.total_pending),
        is_split_payment: finalOrder!.is_split_payment,
        split_payment_count: finalOrder!.split_payment_count,
      },
      table: {
        id: order.table_id,
        new_status:
          orderStatus === order_status.PAGADA
            ? table_status.LIMPIEZA
            : order.table.status,
      },
      message: sale
        ? `Pago procesado. Comprobante: ${sale.numero_completo}`
        : 'Pago procesado exitosamente',
    };
  }

  /**
   * Procesar pago dividido (split payment)
   */
  async createSplitPayment(
    userId: string,
    cashRegisterId: string,
    createSplitPaymentDto: CreateSplitPaymentDto,
  ) {
    // Verificar que la orden existe
    const order = await this.prisma.orders.findUnique({
      where: { id: createSplitPaymentDto.order_id },
      include: {
        table: true,
        order_items: {
          where: { is_cancelled: false },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Orden con ID "${createSplitPaymentDto.order_id}" no encontrada`,
      );
    }

    // Validar estado de la orden
    const allowedStatuses: order_status[] = [
      order_status.CERRADA,
      order_status.PARCIALMENTE_PAGADA,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Solo se pueden procesar pagos de órdenes CERRADA o PARCIALMENTE_PAGADA',
      );
    }

    // Validar que todos los items existen y pertenecen a la orden
    const allItemIds = createSplitPaymentDto.payments.flatMap(
      (p) => p.item_ids,
    );
    const items = await this.prisma.order_items.findMany({
      where: {
        id: { in: allItemIds },
        order_id: order.id,
        is_cancelled: false,
      },
    });

    if (items.length !== allItemIds.length) {
      throw new BadRequestException(
        'Algunos items no existen o no pertenecen a la orden',
      );
    }

    // Validar que ningún item esté ya pagado
    const paidItems = items.filter((item) => item.is_paid);
    if (paidItems.length > 0) {
      throw new BadRequestException('Algunos items ya están pagados');
    }

    // Validar que no haya items duplicados
    const uniqueItemIds = new Set(allItemIds);
    if (uniqueItemIds.size !== allItemIds.length) {
      throw new BadRequestException('Hay items duplicados en los pagos');
    }

    // Validar que el total de los pagos coincida con los items
    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.line_total),
      0,
    );
    const paymentsTotal = createSplitPaymentDto.payments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    if (Math.abs(itemsTotal - paymentsTotal) > 0.01) {
      throw new BadRequestException(
        `El total de pagos (${paymentsTotal}) no coincide con el total de items (${itemsTotal})`,
      );
    }

    const paymentResults: any = [];
    const existingPaymentCount = await this.prisma.payments.count({
      where: { order_id: order.id },
    });

    // Procesar cada pago
    for (let i = 0; i < createSplitPaymentDto.payments.length; i++) {
      const paymentDto = createSplitPaymentDto.payments[i];
      const paymentNumber = existingPaymentCount + i + 1;

      // Calcular vuelto
      const changeGiven =
        paymentDto.payment_method === payment_method.EFECTIVO &&
        paymentDto.amount_received
          ? paymentDto.amount_received - paymentDto.amount
          : null;

      // Crear pago
      const payment = await this.prisma.payments.create({
        data: {
          order_id: order.id,
          cash_register_id: cashRegisterId,
          payment_number: paymentNumber,
          amount: paymentDto.amount,
          payment_method: paymentDto.payment_method,
          amount_received: paymentDto.amount_received,
          change_given: changeGiven,
          payer_name: paymentDto.payer_name,
          payer_notes: paymentDto.payer_notes,
          processed_by: userId,
        },
      });

      // Registrar movimiento de caja
      await this.cashMovementsService.createAutomatic(
        cashRegisterId,
        cash_movement_type.INGRESO,
        paymentDto.amount,
        `Pago dividido - ${paymentDto.payer_name} - Orden #${order.daily_number}`,
        payment.id,
      );

      // Marcar items específicos como pagados
      await this.prisma.order_items.updateMany({
        where: {
          id: { in: paymentDto.item_ids },
        },
        data: {
          is_paid: true,
          paid_at: new Date(),
          payment_id: payment.id,
        },
      });

      // Generar comprobante si se solicitó
      let sale: any = null;
      if (paymentDto.generate_document) {
        sale = await this.salesService.generateFromPayment(
          payment.id,
          paymentDto.document_type!,
          paymentDto.client_id,
          userId,
          cashRegisterId,
        );
      }

      paymentResults.push({
        payment_number: paymentNumber,
        payer_name: paymentDto.payer_name,
        amount: paymentDto.amount,
        change_given: changeGiven || undefined,
        sale_number: sale?.numero_completo,
      });
    }

    // Recalcular totales de la orden
    await this.ordersService.recalculateTotal(order.id);

    // Marcar orden como PAGADA y split payment
    await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        status: order_status.PAGADA,
        is_split_payment: true,
        split_payment_count: paymentResults.length,
      },
    });

    // Cambiar estado de la mesa a LIMPIEZA
    await this.prisma.tables.update({
      where: { id: order.table_id },
      data: { status: table_status.LIMPIEZA },
    });

    // Obtener orden actualizada
    const finalOrder = await this.prisma.orders.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        status: true,
        total_paid: true,
        total_pending: true,
        is_split_payment: true,
        split_payment_count: true,
      },
    });

    return {
      order: {
        id: finalOrder!.id,
        status: finalOrder!.status,
        total_paid: Number(finalOrder!.total_paid),
        total_pending: Number(finalOrder!.total_pending),
        is_split_payment: finalOrder!.is_split_payment,
        split_payment_count: finalOrder!.split_payment_count,
      },
      payments: paymentResults,
      message: `${paymentResults.length} pagos procesados exitosamente`,
    };
  }

  /**
   * Obtener pagos de una orden
   */
  async findByOrder(orderId: string) {
    const payments = await this.prisma.payments.findMany({
      where: { order_id: orderId },
      include: {
        processor: {
          select: { name: true },
        },
        sale: {
          select: {
            id: true,
            tipo_comprobante: true,
            numero_completo: true,
            precio_venta_total: true,
            monto_igv: true,
            valor_venta: true,
          },
        },
      },
      orderBy: { payment_number: 'asc' },
    });

    return payments.map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number,
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
      amount_received: payment.amount_received
        ? Number(payment.amount_received)
        : undefined,
      change_given: payment.change_given
        ? Number(payment.change_given)
        : undefined,
      payer_name: payment.payer_name || undefined,
      payer_notes: payment.payer_notes || undefined,
      processed_by: payment.processor.name,
      created_at: payment.created_at,
      sale: payment.sale
        ? {
            id: payment.sale.id,
            tipo_comprobante: payment.sale.tipo_comprobante,
            numero_completo: payment.sale.numero_completo,
            precio_venta_total: Number(payment.sale.precio_venta_total),
            monto_igv: Number(payment.sale.monto_igv),
            valor_venta: Number(payment.sale.valor_venta),
          }
        : undefined,
    }));
  }

  /**
   * Obtener detalle de un pago
   */
  async findOne(id: string) {
    const payment = await this.prisma.payments.findUnique({
      where: { id },
      include: {
        processor: {
          select: { name: true },
        },
        sale: {
          select: {
            id: true,
            tipo_comprobante: true,
            numero_completo: true,
            precio_venta_total: true,
            monto_igv: true,
            valor_venta: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID "${id}" no encontrado`);
    }

    return {
      id: payment.id,
      payment_number: payment.payment_number,
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
      amount_received: payment.amount_received
        ? Number(payment.amount_received)
        : undefined,
      change_given: payment.change_given
        ? Number(payment.change_given)
        : undefined,
      payer_name: payment.payer_name || undefined,
      payer_notes: payment.payer_notes || undefined,
      processed_by: payment.processor.name,
      created_at: payment.created_at,
      sale: payment.sale
        ? {
            id: payment.sale.id,
            tipo_comprobante: payment.sale.tipo_comprobante,
            numero_completo: payment.sale.numero_completo,
            precio_venta_total: Number(payment.sale.precio_venta_total),
            monto_igv: Number(payment.sale.monto_igv),
            valor_venta: Number(payment.sale.valor_venta),
          }
        : undefined,
    };
  }
}
