import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
import { CreateIncrementalPaymentDto } from './dto/create-incremental-payment.dto';
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
   * Procesar pago completo de una orden
   * - Valida que la orden esté en estado correcto (CERRADA o PARCIALMENTE_PAGADA)
   * - Valida el monto del pago
   * - Crea el registro de pago
   * - Registra movimiento de caja (INGRESO)
   * - Marca todos los items como pagados
   * - Recalcula totales de la orden
   * - Actualiza estado de orden a PAGADA
   * - Libera la mesa (LIBRE)
   *
   * TODO: Método autocontenido, sin dependencias de otros servicios
   */
  async createPayment2(
    userId: string,
    cashRegisterId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      console.log('════════════════════════════════════════════════════════');
      console.log('🔷 INICIO - PROCESAMIENTO DE PAGO COMPLETO');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Datos recibidos:', {
        userId,
        cashRegisterId,
        orderId: createPaymentDto.order_id,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.payment_method,
        amountReceived: createPaymentDto.amount_received,
      });
      console.log('');

      // ============================================
      // PASO 1: OBTENER Y VALIDAR LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📦 PASO 1: Obtener y validar orden');
      console.log('──────────────────────────────────────────────────────');

      const order = await tx.orders.findUnique({
        where: { id: createPaymentDto.order_id },
        include: {
          table: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
          order_items: {
            where: {
              is_cancelled: false, // Solo items NO cancelados
            },
            select: {
              id: true,
              product_name: true,
              quantity: true,
              line_total: true,
              is_paid: true,
            },
          },
        },
      });

      if (!order) {
        console.log('❌ ERROR: Orden no encontrada');
        throw new NotFoundException('Orden no encontrada');
      }

      console.log('✅ Orden encontrada:', {
        orderId: order.id,
        dailyNumber: order.daily_number,
        status: order.status,
        tableNumber: order.table.number,
        tableStatus: order.table.status,
        totalItems: order.order_items.length,
        subtotal: Number(order.subtotal),
        totalPaid: Number(order.total_paid),
        totalPending: Number(order.total_pending),
      });
      console.log('');

      // ============================================
      // PASO 2: VALIDAR ESTADO DE LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔍 PASO 2: Validar estado de orden');
      console.log('──────────────────────────────────────────────────────');

      const allowedStatuses: order_status[] = [
        order_status.CERRADA,
        order_status.PARCIALMENTE_PAGADA,
      ];

      if (!allowedStatuses.includes(order.status)) {
        console.log('❌ ERROR: Estado de orden no válido para pago');
        console.log('Estado actual:', order.status);
        console.log('Estados permitidos:', allowedStatuses);
        throw new BadRequestException(
          `No se puede procesar pago. La orden está en estado: ${order.status}. Solo se permiten pagos en órdenes CERRADA o PARCIALMENTE_PAGADA`,
        );
      }

      console.log('✅ Estado de orden válido:', order.status);
      console.log('');

      // ============================================
      // PASO 3: VALIDAR QUE HAY ITEMS PARA PAGAR
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📋 PASO 3: Validar items de la orden');
      console.log('──────────────────────────────────────────────────────');

      if (order.order_items.length === 0) {
        console.log('❌ ERROR: No hay items activos en la orden');
        throw new BadRequestException(
          'La orden no tiene items activos para pagar',
        );
      }

      // Contar items ya pagados vs pendientes
      const itemsPaid = order.order_items.filter((item) => item.is_paid);
      const itemsPending = order.order_items.filter((item) => !item.is_paid);

      console.log('📊 Resumen de items:', {
        totalItems: order.order_items.length,
        itemsPaid: itemsPaid.length,
        itemsPending: itemsPending.length,
      });

      if (itemsPending.length === 0) {
        console.log('❌ ERROR: No hay items pendientes de pago');
        throw new BadRequestException(
          'Todos los items de esta orden ya están pagados',
        );
      }

      console.log('');
      console.log('📦 Detalle de items pendientes:');
      itemsPending.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.product_name} x${item.quantity} = S/ ${Number(item.line_total).toFixed(2)}`,
        );
      });
      console.log('');

      // ============================================
      // PASO 4: VALIDAR MONTO DEL PAGO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💰 PASO 4: Validar monto del pago');
      console.log('──────────────────────────────────────────────────────');

      const totalPending = Number(order.total_pending);

      console.log('💵 Montos:', {
        montoPendiente: `S/ ${totalPending.toFixed(2)}`,
        montoRecibido: `S/ ${createPaymentDto.amount.toFixed(2)}`,
        diferencia: `S/ ${(createPaymentDto.amount - totalPending).toFixed(2)}`,
      });

      if (createPaymentDto.amount < totalPending) {
        console.log('⚠️  ADVERTENCIA: El monto es menor al pendiente');
        throw new BadRequestException(
          `El monto recibido (S/ ${createPaymentDto.amount.toFixed(2)}) es menor al total pendiente (S/ ${totalPending.toFixed(2)})`,
        );
      }

      if (createPaymentDto.amount > totalPending) {
        console.log('⚠️  ADVERTENCIA: El monto excede al pendiente');
        throw new BadRequestException(
          `El monto recibido (S/ ${createPaymentDto.amount.toFixed(2)}) excede el total pendiente (S/ ${totalPending.toFixed(2)})`,
        );
      }

      console.log('✅ Monto validado correctamente');
      console.log('');

      // ============================================
      // PASO 5: VALIDAR PAGO EN EFECTIVO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💵 PASO 5: Validar pago en efectivo');
      console.log('──────────────────────────────────────────────────────');

      let changeGiven: number | null = null;

      if (createPaymentDto.payment_method === payment_method.EFECTIVO) {
        console.log('🪙 Método de pago: EFECTIVO');

        if (!createPaymentDto.amount_received) {
          console.log('❌ ERROR: Falta monto recibido para efectivo');
          throw new BadRequestException(
            'Para pagos en EFECTIVO se requiere especificar el monto recibido',
          );
        }

        if (createPaymentDto.amount_received < createPaymentDto.amount) {
          console.log('❌ ERROR: Monto recibido insuficiente');
          console.log('Monto recibido:', createPaymentDto.amount_received);
          console.log('Monto a pagar:', createPaymentDto.amount);
          throw new BadRequestException(
            `El monto recibido (S/ ${createPaymentDto.amount_received.toFixed(2)}) es menor al monto a pagar (S/ ${createPaymentDto.amount.toFixed(2)})`,
          );
        }

        // Calcular vuelto
        changeGiven =
          createPaymentDto.amount_received - createPaymentDto.amount;

        console.log('💰 Cálculo de vuelto:', {
          montoRecibido: `S/ ${createPaymentDto.amount_received.toFixed(2)}`,
          montoAPagar: `S/ ${createPaymentDto.amount.toFixed(2)}`,
          vuelto: `S/ ${changeGiven.toFixed(2)}`,
        });
      } else {
        console.log('💳 Método de pago:', createPaymentDto.payment_method);
        console.log('ℹ️  No se requiere vuelto para pagos no efectivo');
      }

      console.log('✅ Validación de efectivo completada');
      console.log('');

      // ============================================
      // PASO 6: OBTENER NÚMERO DE PAGO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔢 PASO 6: Obtener número de pago');
      console.log('──────────────────────────────────────────────────────');

      const paymentCount = await tx.payments.count({
        where: { order_id: order.id },
      });

      const paymentNumber = paymentCount + 1;

      console.log('📊 Numeración de pago:', {
        pagosExistentes: paymentCount,
        numeroNuevoPago: paymentNumber,
      });
      console.log('');

      // ============================================
      // PASO 7: CREAR REGISTRO DE PAGO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💾 PASO 7: Crear registro de pago');
      console.log('──────────────────────────────────────────────────────');

      const payment = await tx.payments.create({
        data: {
          order_id: order.id,
          cash_register_id: cashRegisterId,
          payment_number: paymentNumber,
          amount: createPaymentDto.amount,
          payment_method: createPaymentDto.payment_method,
          amount_received: createPaymentDto.amount_received || null,
          change_given: changeGiven,
          payer_notes: createPaymentDto.payer_notes || null,
          processed_by: userId,
        },
      });

      console.log('✅ Pago creado exitosamente:', {
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        amount: `S/ ${Number(payment.amount).toFixed(2)}`,
        paymentMethod: payment.payment_method,
        amountReceived: payment.amount_received
          ? `S/ ${Number(payment.amount_received).toFixed(2)}`
          : null,
        changeGiven: payment.change_given
          ? `S/ ${Number(payment.change_given).toFixed(2)}`
          : null,
        processedBy: payment.processed_by,
        createdAt: payment.created_at,
      });
      console.log('');

      // ============================================
      // PASO 8: REGISTRAR MOVIMIENTO DE CAJA (INGRESO)
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💰 PASO 8: Registrar movimiento de caja (INGRESO)');
      console.log('──────────────────────────────────────────────────────');

      const cashMovement = await tx.cash_movements.create({
        data: {
          cash_register_id: cashRegisterId,
          type: cash_movement_type.INGRESO,
          amount: createPaymentDto.amount,
          description: `Pago completo - Orden #${order.daily_number} - Mesa #${order.table.number}`,
          is_automatic: true,
          payment_id: payment.id,
          created_by: userId,
        },
      });

      console.log('✅ Movimiento de caja creado:', {
        movementId: cashMovement.id,
        tipo: 'INGRESO',
        monto: `S/ ${Number(cashMovement.amount).toFixed(2)}`,
        descripcion: cashMovement.description,
        isAutomatic: cashMovement.is_automatic,
        paymentId: payment.id,
      });
      console.log('');

      // ============================================
      // PASO 8.5: MARCAR ITEMS COMO PAGADOS (ANTES de generar comprobante)
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('✅ PASO 8.5: Marcar items como pagados');
      console.log('──────────────────────────────────────────────────────');

      console.log('🔄 Actualizando items individualmente...');
      for (const item of itemsPending) {
        await tx.order_items.update({
          where: { id: item.id },
          data: {
            is_paid: true,
            paid_at: new Date(),
            payment_id: payment.id,
            quantity_paid: item.quantity,
            amount_paid: item.line_total,
          },
        });
        console.log(
          `  ✓ ${item.product_name}: cantidad=${item.quantity}, monto=S/ ${Number(item.line_total).toFixed(2)}`,
        );
      }

      console.log('✅ Items marcados como pagados:', {
        itemsActualizados: itemsPending.length,
        paymentId: payment.id,
      });
      console.log('');

      // ============================================
      // PASO 8.6: GENERAR COMPROBANTE (SALE)
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📄 PASO 8.6: Generar comprobante de venta');
      console.log('──────────────────────────────────────────────────────');

      // SIEMPRE generar comprobante - TICKET por defecto si no se especifica otro
      const documentType =
        createPaymentDto.generate_document && createPaymentDto.document_type
          ? createPaymentDto.document_type
          : comprobante_type.TICKET;

      let sale;
      try {
        console.log('📝 Generando comprobante:', {
          tipo: documentType,
          paymentId: payment.id,
          clientId: createPaymentDto.client_id,
        });

        sale = await this.salesService.generateFromPayment(
          payment.id,
          documentType,
          createPaymentDto.client_id,
          userId,
          cashRegisterId,
          tx,
        );

        console.log('✅ Comprobante generado:', {
          id: sale.id,
          numeroCompleto: sale.numero_completo,
          total: `S/ ${Number(sale.precio_venta_total).toFixed(2)}`,
        });
      } catch (error) {
        console.log('⚠️ Error al generar comprobante:', error.message);
        throw new InternalServerErrorException(
          `Error al generar comprobante: ${error.message}`,
        );
      }

      console.log('');

      // // ============================================
      // // PASO 9: ACTUALIZAR TOTALES DE LA CAJA
      // // ============================================
      // console.log('──────────────────────────────────────────────────────');
      // console.log('🔄 PASO 9: Actualizar totales de la caja registradora');
      // console.log('──────────────────────────────────────────────────────');

      // // Obtener caja actual
      // const cashRegister = await tx.cash_registers.findUnique({
      //   where: { id: cashRegisterId },
      //   select: {
      //     initial_amount: true,
      //     total_sales: true,
      //     total_income: true,
      //     total_expense: true,
      //     expected_amount: true,
      //   },
      // });

      // console.log('📊 Estado actual de caja:', {
      //   initialAmount: `S/ ${Number(cashRegister!.initial_amount).toFixed(2)}`,
      //   totalSales: `S/ ${Number(cashRegister!.total_sales).toFixed(2)}`,
      //   totalIncome: `S/ ${Number(cashRegister!.total_income).toFixed(2)}`,
      //   totalExpense: `S/ ${Number(cashRegister!.total_expense).toFixed(2)}`,
      //   expectedAmount: `S/ ${Number(cashRegister!.expected_amount).toFixed(2)}`,
      // });

      // // Calcular nuevos totales de la caja
      // const ingresos = await tx.cash_movements.aggregate({
      //   where: {
      //     cash_register_id: cashRegisterId,
      //     type: cash_movement_type.INGRESO,
      //   },
      //   _sum: { amount: true },
      // });

      // const egresos = await tx.cash_movements.aggregate({
      //   where: {
      //     cash_register_id: cashRegisterId,
      //     type: cash_movement_type.EGRESO,
      //   },
      //   _sum: { amount: true },
      // });

      // const totalIncome = Number(ingresos._sum.amount || 0);
      // const totalExpense = Number(egresos._sum.amount || 0);
      // const expectedAmount =
      //   Number(cashRegister!.initial_amount) + totalIncome - totalExpense;

      // console.log('🧮 Cálculo de nuevos totales:', {
      //   initialAmount: `S/ ${Number(cashRegister!.initial_amount).toFixed(2)}`,
      //   sumaIngresos: `S/ ${totalIncome.toFixed(2)}`,
      //   sumaEgresos: `S/ ${totalExpense.toFixed(2)}`,
      //   expectedAmountCalculado: `S/ ${expectedAmount.toFixed(2)}`,
      // });

      // // Actualizar caja registradora
      // await tx.cash_registers.update({
      //   where: { id: cashRegisterId },
      //   data: {
      //     total_income: totalIncome,
      //     total_expense: totalExpense,
      //     expected_amount: expectedAmount,
      //   },
      // });

      // console.log('✅ Totales de caja actualizados:', {
      //   totalIncome: `S/ ${totalIncome.toFixed(2)}`,
      //   totalExpense: `S/ ${totalExpense.toFixed(2)}`,
      //   expectedAmount: `S/ ${expectedAmount.toFixed(2)}`,
      // });
      // console.log('');

      // ============================================
      // PASO 9: ACTUALIZAR TOTALES DE LA CAJA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔄 PASO 9: Actualizar totales de la caja registradora');
      console.log('──────────────────────────────────────────────────────');

      // 9.1: Obtener total de VENTAS (de tabla sales)
      console.log('\n📊 9.1: Calculando total de ventas...');
      const salesTotal = await tx.sales.aggregate({
        where: { cash_register_id: cashRegisterId },
        _sum: { precio_venta_total: true },
      });
      const totalSales = Number(salesTotal._sum.precio_venta_total || 0);
      console.log(
        'Total ventas (de tabla sales):',
        `S/ ${totalSales.toFixed(2)}`,
      );

      // 9.2: Obtener total de INGRESOS MANUALES (is_automatic = false)
      console.log('\n💵 9.2: Calculando total de ingresos manuales...');
      const incomeTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: cashRegisterId,
          type: cash_movement_type.INGRESO,
          is_automatic: false, // ✅ SOLO MANUALES
        },
        _sum: { amount: true },
      });
      const totalIncome = Number(incomeTotal._sum.amount || 0);
      console.log('Total ingresos manuales:', `S/ ${totalIncome.toFixed(2)}`);

      // 9.3: Obtener total de EGRESOS
      console.log('\n💸 9.3: Calculando total de egresos...');
      const expenseTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: cashRegisterId,
          type: cash_movement_type.EGRESO,
        },
        _sum: { amount: true },
      });
      const totalExpense = Number(expenseTotal._sum.amount || 0);
      console.log('Total egresos:', `S/ ${totalExpense.toFixed(2)}`);

      // 9.4: Obtener monto inicial
      const cashRegisterData = await tx.cash_registers.findUnique({
        where: { id: cashRegisterId },
        select: { initial_amount: true },
      });

      const initialAmount = Number(cashRegisterData!.initial_amount);

      // 9.5: Calcular monto esperado
      const expectedAmount =
        initialAmount + totalSales + totalIncome - totalExpense;

      console.log('\n🧮 9.5: Cálculo de monto esperado:', {
        initial: `S/ ${initialAmount.toFixed(2)}`,
        sales: `+ S/ ${totalSales.toFixed(2)}`,
        income: `+ S/ ${totalIncome.toFixed(2)}`,
        expense: `- S/ ${totalExpense.toFixed(2)}`,
        result: `= S/ ${expectedAmount.toFixed(2)}`,
      });

      // 9.6: Actualizar caja registradora
      await tx.cash_registers.update({
        where: { id: cashRegisterId },
        data: {
          total_sales: totalSales,
          total_income: totalIncome,
          total_expense: totalExpense,
          expected_amount: expectedAmount,
        },
      });

      console.log('✅ Totales de caja actualizados:', {
        totalSales: `S/ ${totalSales.toFixed(2)}`,
        totalIncome: `S/ ${totalIncome.toFixed(2)}`,
        totalExpense: `S/ ${totalExpense.toFixed(2)}`,
        expectedAmount: `S/ ${expectedAmount.toFixed(2)}`,
      });
      console.log('');

      // ============================================
      // PASO 10: RECALCULAR TOTALES DE LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔄 PASO 10: Recalcular totales de la orden');
      console.log('──────────────────────────────────────────────────────');

      // Calcular subtotal (items NO cancelados)
      const subtotalResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: false,
        },
        _sum: {
          line_total: true,
        },
      });

      const subtotal = Number(subtotalResult._sum.line_total || 0);

      console.log('💰 Subtotal calculado:', {
        subtotal: `S/ ${subtotal.toFixed(2)}`,
        itemsContados: order.order_items.length,
      });

      // Calcular total cancelado (items cancelados)
      const cancelledResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: true,
        },
        _sum: {
          line_total: true,
        },
      });

      const totalCancelled = Number(cancelledResult._sum.line_total || 0);

      console.log('❌ Total cancelado:', `S/ ${totalCancelled.toFixed(2)}`);

      // Calcular total pagado (suma de amount_paid de items)
      const itemsPaidResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: false,
        },
        _sum: {
          amount_paid: true,
        },
      });

      const totalPaid = Number(itemsPaidResult._sum.amount_paid || 0);

      console.log('✅ Total pagado:', `S/ ${totalPaid.toFixed(2)}`);

      // Calcular total pendiente
      const totalPendingCalculated = Math.max(0, subtotal - totalPaid);

      console.log(
        '⏳ Total pendiente:',
        `S/ ${totalPendingCalculated.toFixed(2)}`,
      );

      // Contar pagos
      const paymentCountFinal = await tx.payments.count({
        where: { order_id: order.id },
      });

      console.log('📊 Total de pagos registrados:', paymentCountFinal);

      // Verificar si hay items parcialmente pagados
      const partialPaymentsCount = await tx.order_items.count({
        where: {
          order_id: order.id,
          is_cancelled: false,
          amount_paid: { gt: 0 },
          is_paid: false,
        },
      });

      console.log('🔢 Items parcialmente pagados:', partialPaymentsCount);

      // Actualizar orden con totales calculados
      await tx.orders.update({
        where: { id: order.id },
        data: {
          subtotal,
          total_cancelled: totalCancelled,
          total_paid: totalPaid,
          total_pending: totalPendingCalculated,
          is_split_payment: paymentCountFinal > 1,
          split_payment_count: paymentCountFinal,
        },
      });

      console.log('✅ Orden actualizada con nuevos totales:', {
        subtotal: `S/ ${subtotal.toFixed(2)}`,
        totalCancelled: `S/ ${totalCancelled.toFixed(2)}`,
        totalPaid: `S/ ${totalPaid.toFixed(2)}`,
        totalPending: `S/ ${totalPendingCalculated.toFixed(2)}`,
        isSplitPayment: paymentCountFinal > 1,
        splitPaymentCount: paymentCountFinal,
      });
      console.log('');

      // ============================================
      // PASO 12: VERIFICAR ESTADO FINAL
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔍 PASO 12: Verificar estado final de la orden');
      console.log('──────────────────────────────────────────────────────');

      // Validar que la orden quedó completamente pagada
      if (totalPendingCalculated !== 0) {
        console.log('❌ ERROR CRÍTICO: La orden no quedó completamente pagada');
        console.log('Total pendiente:', totalPendingCalculated);
        console.log('Total pagado:', totalPaid);
        console.log('Subtotal:', subtotal);
        throw new InternalServerErrorException(
          `Error: La orden no quedó completamente pagada después del procesamiento. Pendiente: S/ ${totalPendingCalculated.toFixed(2)}`,
        );
      }

      console.log('✅ Verificación exitosa: total_pending = 0');
      console.log('');

      // ============================================
      // PASO 13: MARCAR ORDEN COMO PAGADA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('✅ PASO 13: Marcar orden como PAGADA');
      console.log('──────────────────────────────────────────────────────');

      await tx.orders.update({
        where: { id: order.id },
        data: {
          status: order_status.PAGADA,
        },
      });

      console.log('✅ Estado de orden actualizado:', {
        estadoAnterior: order.status,
        estadoNuevo: order_status.PAGADA,
      });
      console.log('');

      // ============================================
      // PASO 14: LIBERAR LA MESA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🪑 PASO 14: Liberar mesa');
      console.log('──────────────────────────────────────────────────────');

      await tx.tables.update({
        where: { id: order.table_id },
        data: { status: table_status.LIBRE },
      });

      console.log('✅ Mesa liberada:', {
        tableId: order.table_id,
        tableNumber: order.table.number,
        estadoAnterior: order.table.status,
        estadoNuevo: table_status.LIBRE,
      });
      console.log('');

      // ============================================
      // RESUMEN FINAL
      // ============================================
      console.log('════════════════════════════════════════════════════════');
      console.log('✅ PAGO COMPLETADO EXITOSAMENTE');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Resumen de la transacción:');
      console.log('  • Orden #:', order.daily_number);
      console.log('  • Mesa #:', order.table.number);
      console.log('  • Pago #:', payment.payment_number);
      console.log(
        '  • Monto pagado:',
        `S/ ${Number(payment.amount).toFixed(2)}`,
      );
      console.log('  • Método:', payment.payment_method);
      if (changeGiven !== null) {
        console.log('  • Vuelto:', `S/ ${changeGiven.toFixed(2)}`);
      }
      console.log('  • Items pagados:', itemsPending.length);
      console.log('  • Estado orden:', order_status.PAGADA);
      console.log('  • Estado mesa:', table_status.LIBRE);
      console.log('  • Caja esperada:', `S/ ${expectedAmount.toFixed(2)}`);
      console.log('════════════════════════════════════════════════════════');
      console.log('');

      return {
        message: `Pago procesado exitosamente. Orden #${order.daily_number} completamente pagada. Mesa #${order.table.number} liberada.`,
        payment: {
          id: payment.id,
          payment_number: payment.payment_number,
          amount: Number(payment.amount),
          payment_method: payment.payment_method,
          change_given: changeGiven,
        },
        order: {
          id: order.id,
          daily_number: order.daily_number,
          status: order_status.PAGADA,
          subtotal: subtotal,
          total_paid: totalPaid,
          total_pending: totalPendingCalculated,
        },
        table: {
          id: order.table_id,
          number: order.table.number,
          status: table_status.LIBRE,
        },
        cash_register: {
          id: cashRegisterId,
          expected_amount: expectedAmount,
        },
      };
    });
  }

  /**
   * Procesar pagos incrementales (pagos parciales por items)
   *
   * Permite que diferentes personas paguen diferentes cantidades de items:
   * - Puede pagar items completos
   * - Puede pagar cantidades parciales de un mismo item
   * - Crea registros en payment_items para rastrear qué porción se pagó
   * - Acumula amount_paid y quantity_paid en order_items
   * - Marca is_paid=true cuando un item está completamente pagado
   * - Actualiza totales de orden y caja
   * - Libera mesa cuando todo está pagado
   *
   * @param userId - ID del usuario procesando el pago
   * @param cashRegisterId - ID de la caja registradora activa
   * @param createIncrementalPaymentDto - Array de pagos con sus asignaciones de items
   */
  async createIncrementalPayment2(
    userId: string,
    cashRegisterId: string,
    createIncrementalPaymentDto: CreateIncrementalPaymentDto,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      console.log('════════════════════════════════════════════════════════');
      console.log('🔷 INICIO - PROCESAMIENTO DE PAGOS INCREMENTALES');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Datos recibidos:', {
        userId,
        cashRegisterId,
        orderId: createIncrementalPaymentDto.order_id,
        totalPagos: createIncrementalPaymentDto.payments.length,
      });
      console.log('');

      // ============================================
      // PASO 1: OBTENER Y VALIDAR LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📦 PASO 1: Obtener y validar orden');
      console.log('──────────────────────────────────────────────────────');

      const order = await tx.orders.findUnique({
        where: { id: createIncrementalPaymentDto.order_id },
        include: {
          table: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
          order_items: {
            where: { is_cancelled: false },
            select: {
              id: true,
              product_name: true,
              quantity: true,
              line_total: true,
              unit_price: true,
              is_paid: true,
              quantity_paid: true,
              amount_paid: true,
            },
          },
        },
      });

      if (!order) {
        console.log('❌ ERROR: Orden no encontrada');
        throw new NotFoundException('Orden no encontrada');
      }

      console.log('✅ Orden encontrada:', {
        orderId: order.id,
        dailyNumber: order.daily_number,
        status: order.status,
        tableNumber: order.table.number,
        totalItems: order.order_items.length,
        subtotal: Number(order.subtotal),
        totalPaid: Number(order.total_paid),
        totalPending: Number(order.total_pending),
      });
      console.log('');

      // ============================================
      // PASO 2: VALIDAR ESTADO DE LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔍 PASO 2: Validar estado de orden');
      console.log('──────────────────────────────────────────────────────');

      const allowedStatuses: order_status[] = [
        order_status.CERRADA,
        order_status.PARCIALMENTE_PAGADA,
        order_status.EN_PAGO_DIVIDIDO,
      ];

      if (!allowedStatuses.includes(order.status)) {
        console.log('❌ ERROR: Estado de orden no válido');
        console.log('Estado actual:', order.status);
        console.log('Estados permitidos:', allowedStatuses);
        throw new BadRequestException(
          `No se pueden procesar pagos incrementales. Estado actual: ${order.status}`,
        );
      }

      console.log('✅ Estado de orden válido:', order.status);
      console.log('');

      // ============================================
      // PASO 3: VALIDAR QUE HAY ITEMS
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📋 PASO 3: Validar items de la orden');
      console.log('──────────────────────────────────────────────────────');

      if (order.order_items.length === 0) {
        console.log('❌ ERROR: No hay items en la orden');
        throw new BadRequestException('La orden no tiene items para pagar');
      }

      console.log('📊 Items en la orden:');
      order.order_items.forEach((item, index) => {
        const remaining = item.quantity - item.quantity_paid;
        const remainingAmount =
          Number(item.line_total) - Number(item.amount_paid);
        console.log(`  ${index + 1}. ${item.product_name}`);
        console.log(`     - Cantidad total: ${item.quantity}`);
        console.log(`     - Cantidad pagada: ${item.quantity_paid}`);
        console.log(`     - Cantidad disponible: ${remaining}`);
        console.log(
          `     - Monto total: S/ ${Number(item.line_total).toFixed(2)}`,
        );
        console.log(
          `     - Monto pagado: S/ ${Number(item.amount_paid).toFixed(2)}`,
        );
        console.log(
          `     - Monto disponible: S/ ${remainingAmount.toFixed(2)}`,
        );
        console.log(
          `     - Estado: ${item.is_paid ? '✅ Pagado' : '⏳ Pendiente'}`,
        );
      });
      console.log('');

      // ============================================
      // PASO 4: EXTRAER TODOS LOS ITEM IDS A VALIDAR
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔍 PASO 4: Extraer y validar items solicitados');
      console.log('──────────────────────────────────────────────────────');

      const allItemIds = createIncrementalPaymentDto.payments.flatMap(
        (payment) => payment.item_allocations.map((alloc) => alloc.item_id),
      );

      console.log('📝 Items solicitados para pago:', allItemIds.length);
      console.log('Items únicos:', new Set(allItemIds).size);
      console.log('');

      // ============================================
      // PASO 5: VALIDAR CADA PAGO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('✅ PASO 5: Validar cada pago del array');
      console.log('──────────────────────────────────────────────────────');

      for (let i = 0; i < createIncrementalPaymentDto.payments.length; i++) {
        const payment = createIncrementalPaymentDto.payments[i];
        console.log(
          `\n🔸 Validando Pago ${i + 1}/${createIncrementalPaymentDto.payments.length}`,
        );
        console.log(`   Pagador: ${payment.payer_name}`);
        console.log(`   Método: ${payment.payment_method}`);
        console.log(`   Monto: S/ ${payment.amount.toFixed(2)}`);

        // Validar efectivo
        if (payment.payment_method === payment_method.EFECTIVO) {
          if (!payment.amount_received) {
            console.log('❌ ERROR: Falta monto recibido para efectivo');
            throw new BadRequestException(
              `Pago ${i + 1}: Se requiere amount_received para pagos en efectivo`,
            );
          }
          if (payment.amount_received < payment.amount) {
            console.log('❌ ERROR: Monto recibido insuficiente');
            throw new BadRequestException(
              `Pago ${i + 1}: Monto recibido (S/ ${payment.amount_received}) menor que monto a pagar (S/ ${payment.amount})`,
            );
          }
          console.log(
            `   ✅ Efectivo validado - Vuelto: S/ ${(payment.amount_received - payment.amount).toFixed(2)}`,
          );
        }

        // Validar items del pago
        console.log(
          `   📦 Validando ${payment.item_allocations.length} item(s):`,
        );
        for (const alloc of payment.item_allocations) {
          const item = order.order_items.find((i) => i.id === alloc.item_id);

          if (!item) {
            console.log(`   ❌ ERROR: Item ${alloc.item_id} no encontrado`);
            throw new BadRequestException(
              `Item ${alloc.item_id} no pertenece a esta orden`,
            );
          }

          const remainingQty = item.quantity - item.quantity_paid;
          const remainingAmt =
            Number(item.line_total) - Number(item.amount_paid);

          console.log(`      - ${item.product_name}`);
          console.log(
            `        Solicitado: ${alloc.quantity} x S/ ${alloc.amount.toFixed(2)}`,
          );
          console.log(
            `        Disponible: ${remainingQty} x S/ ${remainingAmt.toFixed(2)}`,
          );

          if (alloc.quantity > remainingQty) {
            console.log(`      ❌ ERROR: Cantidad excede disponible`);
            throw new BadRequestException(
              `${item.product_name}: Solicitado ${alloc.quantity}, disponible ${remainingQty}`,
            );
          }

          if (alloc.amount > remainingAmt) {
            console.log(`      ❌ ERROR: Monto excede disponible`);
            throw new BadRequestException(
              `${item.product_name}: Solicitado S/ ${alloc.amount}, disponible S/ ${remainingAmt.toFixed(2)}`,
            );
          }

          console.log(`      ✅ Validado`);
        }
      }

      console.log('\n✅ Todos los pagos validados correctamente');
      console.log('');

      // ============================================
      // PASO 6: OBTENER NÚMERO INICIAL DE PAGOS
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔢 PASO 6: Obtener número de pagos existentes');
      console.log('──────────────────────────────────────────────────────');

      const existingPaymentCount = await tx.payments.count({
        where: { order_id: order.id },
      });

      console.log('📊 Pagos existentes:', existingPaymentCount);
      console.log(
        '📊 Nuevos pagos a crear:',
        createIncrementalPaymentDto.payments.length,
      );
      console.log('');

      // ============================================
      // PASO 7: PROCESAR CADA PAGO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💾 PASO 7: Procesar cada pago incrementalmente');
      console.log('──────────────────────────────────────────────────────');

      const paymentResults: any[] = [];

      for (let i = 0; i < createIncrementalPaymentDto.payments.length; i++) {
        const paymentDto = createIncrementalPaymentDto.payments[i];
        const paymentNumber = existingPaymentCount + i + 1;

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(
          `💰 PROCESANDO PAGO ${i + 1}/${createIncrementalPaymentDto.payments.length}`,
        );
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log('Pagador:', paymentDto.payer_name);
        console.log('Método:', paymentDto.payment_method);
        console.log('Monto:', `S/ ${paymentDto.amount.toFixed(2)}`);
        console.log('Número de pago:', `#${paymentNumber}`);

        // Calcular vuelto
        const changeGiven =
          paymentDto.payment_method === payment_method.EFECTIVO &&
          paymentDto.amount_received
            ? paymentDto.amount_received - paymentDto.amount
            : null;

        if (changeGiven !== null) {
          console.log('Vuelto:', `S/ ${changeGiven.toFixed(2)}`);
        }

        // 7.1: Crear registro de pago
        console.log('\n📝 7.1: Creando registro de pago...');
        const payment = await tx.payments.create({
          data: {
            order_id: order.id,
            cash_register_id: cashRegisterId,
            payment_number: paymentNumber,
            amount: paymentDto.amount,
            payment_method: paymentDto.payment_method,
            amount_received: paymentDto.amount_received || null,
            change_given: changeGiven,
            payer_name: paymentDto.payer_name,
            payer_notes: paymentDto.payer_notes || null,
            processed_by: userId,
          },
        });

        console.log('✅ Pago creado:', {
          id: payment.id,
          paymentNumber: payment.payment_number,
          amount: `S/ ${Number(payment.amount).toFixed(2)}`,
        });

        // 7.2: Registrar movimiento de caja
        console.log('\n💰 7.2: Registrando movimiento de caja...');
        const cashMovement = await tx.cash_movements.create({
          data: {
            cash_register_id: cashRegisterId,
            type: cash_movement_type.INGRESO,
            amount: paymentDto.amount,
            description: `Pago incremental - ${paymentDto.payer_name} - Orden #${order.daily_number}`,
            is_automatic: true,
            payment_id: payment.id,
            created_by: userId,
          },
        });

        console.log('✅ Movimiento creado:', {
          id: cashMovement.id,
          amount: `S/ ${Number(cashMovement.amount).toFixed(2)}`,
          type: 'INGRESO',
        });

        // 7.3: Procesar cada item del pago (ANTES de generar comprobante)
        console.log(
          `\n📦 7.3: Procesando ${paymentDto.item_allocations.length} item(s)...`,
        );
        const itemUpdates: Array<{
          item_id: string;
          quantity_paid: number;
          amount_paid: number;
          is_fully_paid: boolean;
        }> = [];

        for (const allocation of paymentDto.item_allocations) {
          const currentItem = order.order_items.find(
            (item) => item.id === allocation.item_id,
          )!;

          const currentPaid = Number(currentItem.amount_paid || 0);
          const currentQuantityPaid = currentItem.quantity_paid || 0;

          const newQuantityPaid = currentQuantityPaid + allocation.quantity;
          const newAmountPaid = currentPaid + allocation.amount;
          const isFullyPaid = newAmountPaid >= Number(currentItem.line_total);

          console.log(`\n   🔸 ${currentItem.product_name}`);
          console.log(`      Estado anterior:`);
          console.log(
            `        - Cantidad pagada: ${currentQuantityPaid}/${currentItem.quantity}`,
          );
          console.log(
            `        - Monto pagado: S/ ${currentPaid.toFixed(2)}/${Number(currentItem.line_total).toFixed(2)}`,
          );
          console.log(`      Este pago:`);
          console.log(`        - Cantidad: +${allocation.quantity}`);
          console.log(`        - Monto: +S/ ${allocation.amount.toFixed(2)}`);
          console.log(`      Estado nuevo:`);
          console.log(
            `        - Cantidad pagada: ${newQuantityPaid}/${currentItem.quantity}`,
          );
          console.log(
            `        - Monto pagado: S/ ${newAmountPaid.toFixed(2)}/${Number(currentItem.line_total).toFixed(2)}`,
          );
          console.log(
            `        - Completamente pagado: ${isFullyPaid ? '✅ SÍ' : '⏳ NO'}`,
          );

          // Crear registro en payment_items
          await tx.payment_items.create({
            data: {
              payment_id: payment.id,
              order_item_id: allocation.item_id,
              quantity_paid: allocation.quantity,
              amount: allocation.amount,
            },
          });

          console.log(`      ✅ payment_items creado`);

          itemUpdates.push({
            item_id: allocation.item_id,
            quantity_paid: newQuantityPaid,
            amount_paid: newAmountPaid,
            is_fully_paid: isFullyPaid,
          });
        }

        // 7.4: Actualizar items con nuevos totales Y asignar payment_id
        console.log(`\n🔄 7.4: Actualizando order_items...`);
        for (const update of itemUpdates) {
          await tx.order_items.update({
            where: { id: update.item_id },
            data: {
              quantity_paid: update.quantity_paid,
              amount_paid: update.amount_paid,
              is_paid: update.is_fully_paid,
              paid_at: update.is_fully_paid ? new Date() : undefined,
              // Asignar payment_id para que generateFromPayment pueda encontrarlos
              payment_id: payment.id,
            },
          });
          console.log(
            `   ✅ Item actualizado: ${update.item_id.substring(0, 8)}...`,
          );
        }

        // 7.5: SIEMPRE generar comprobante - TICKET por defecto
        const incrementalDocType =
          paymentDto.generate_document && paymentDto.document_type
            ? paymentDto.document_type
            : comprobante_type.TICKET;

        let sale;
        try {
          console.log('\n📄 7.5: Generando comprobante...');
          console.log('Tipo:', incrementalDocType);

          sale = await this.salesService.generateFromPayment(
            payment.id,
            incrementalDocType,
            paymentDto.client_id,
            userId,
            cashRegisterId,
            tx,
          );

          console.log('✅ Comprobante generado:', {
            id: sale.id,
            numeroCompleto: sale.numero_completo,
            total: `S/ ${Number(sale.precio_venta_total).toFixed(2)}`,
          });
        } catch (error) {
          console.log('⚠️ Error al generar comprobante:', error.message);
          throw new InternalServerErrorException(
            `Error al generar comprobante: ${error.message}`,
          );
        }

        paymentResults.push({
          payment_number: paymentNumber,
          payer_name: paymentDto.payer_name,
          amount: paymentDto.amount,
          change_given: changeGiven || undefined,
          items_paid: paymentDto.item_allocations.length,
        });

        console.log(`\n✅ Pago ${i + 1} procesado exitosamente`);
      }

      console.log('\n✅ Todos los pagos procesados');
      console.log('');

      // // ============================================
      // // PASO 8: ACTUALIZAR TOTALES DE LA CAJA
      // // ============================================
      // console.log('──────────────────────────────────────────────────────');
      // console.log('🔄 PASO 8: Actualizar totales de la caja');
      // console.log('──────────────────────────────────────────────────────');

      // const cashRegister = await tx.cash_registers.findUnique({
      //   where: { id: cashRegisterId },
      //   select: { initial_amount: true },
      // });

      // const ingresos = await tx.cash_movements.aggregate({
      //   where: {
      //     cash_register_id: cashRegisterId,
      //     type: cash_movement_type.INGRESO,
      //   },
      //   _sum: { amount: true },
      // });

      // const egresos = await tx.cash_movements.aggregate({
      //   where: {
      //     cash_register_id: cashRegisterId,
      //     type: cash_movement_type.EGRESO,
      //   },
      //   _sum: { amount: true },
      // });

      // const totalIncome = Number(ingresos._sum.amount || 0);
      // const totalExpense = Number(egresos._sum.amount || 0);
      // const expectedAmount =
      //   Number(cashRegister!.initial_amount) + totalIncome - totalExpense;

      // await tx.cash_registers.update({
      //   where: { id: cashRegisterId },
      //   data: {
      //     total_income: totalIncome,
      //     total_expense: totalExpense,
      //     expected_amount: expectedAmount,
      //   },
      // });

      // console.log('✅ Caja actualizada:', {
      //   initialAmount: `S/ ${Number(cashRegister!.initial_amount).toFixed(2)}`,
      //   totalIncome: `S/ ${totalIncome.toFixed(2)}`,
      //   totalExpense: `S/ ${totalExpense.toFixed(2)}`,
      //   expectedAmount: `S/ ${expectedAmount.toFixed(2)}`,
      // });
      // console.log('');

      // ============================================
      // PASO 8: ACTUALIZAR TOTALES DE LA CAJA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔄 PASO 8: Actualizar totales de la caja');
      console.log('──────────────────────────────────────────────────────');

      // 8.1: Obtener total de VENTAS (de tabla sales)
      console.log('\n📊 8.1: Calculando total de ventas...');
      const salesTotal = await tx.sales.aggregate({
        where: { cash_register_id: cashRegisterId },
        _sum: { precio_venta_total: true },
      });
      const totalSales = Number(salesTotal._sum.precio_venta_total || 0);
      console.log(
        'Total ventas (de tabla sales):',
        `S/ ${totalSales.toFixed(2)}`,
      );

      // 8.2: Obtener total de INGRESOS MANUALES (is_automatic = false)
      console.log('\n💵 8.2: Calculando total de ingresos manuales...');
      const incomeTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: cashRegisterId,
          type: cash_movement_type.INGRESO,
          is_automatic: false, // ✅ SOLO MANUALES
        },
        _sum: { amount: true },
      });
      const totalIncome = Number(incomeTotal._sum.amount || 0);
      console.log('Total ingresos manuales:', `S/ ${totalIncome.toFixed(2)}`);

      // 8.3: Obtener total de EGRESOS
      console.log('\n💸 8.3: Calculando total de egresos...');
      const expenseTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: cashRegisterId,
          type: cash_movement_type.EGRESO,
        },
        _sum: { amount: true },
      });
      const totalExpense = Number(expenseTotal._sum.amount || 0);
      console.log('Total egresos:', `S/ ${totalExpense.toFixed(2)}`);

      // 8.4: Obtener monto inicial
      const cashRegisterData = await tx.cash_registers.findUnique({
        where: { id: cashRegisterId },
        select: { initial_amount: true },
      });

      const initialAmount = Number(cashRegisterData!.initial_amount);

      // 8.5: Calcular monto esperado
      const expectedAmount =
        initialAmount + totalSales + totalIncome - totalExpense;

      console.log('\n🧮 8.5: Cálculo de monto esperado:', {
        initial: `S/ ${initialAmount.toFixed(2)}`,
        sales: `+ S/ ${totalSales.toFixed(2)}`,
        income: `+ S/ ${totalIncome.toFixed(2)}`,
        expense: `- S/ ${totalExpense.toFixed(2)}`,
        result: `= S/ ${expectedAmount.toFixed(2)}`,
      });

      // 8.6: Actualizar caja registradora
      await tx.cash_registers.update({
        where: { id: cashRegisterId },
        data: {
          total_sales: totalSales,
          total_income: totalIncome,
          total_expense: totalExpense,
          expected_amount: expectedAmount,
        },
      });

      console.log('✅ Caja actualizada:', {
        totalSales: `S/ ${totalSales.toFixed(2)}`,
        totalIncome: `S/ ${totalIncome.toFixed(2)}`,
        totalExpense: `S/ ${totalExpense.toFixed(2)}`,
        expectedAmount: `S/ ${expectedAmount.toFixed(2)}`,
      });
      console.log('');

      // ============================================
      // PASO 9: RECALCULAR TOTALES DE LA ORDEN
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔄 PASO 9: Recalcular totales de la orden');
      console.log('──────────────────────────────────────────────────────');

      // Calcular subtotal
      const subtotalResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: false,
        },
        _sum: { line_total: true },
      });
      const subtotal = Number(subtotalResult._sum.line_total || 0);

      // Calcular total cancelado
      const cancelledResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: true,
        },
        _sum: { line_total: true },
      });
      const totalCancelled = Number(cancelledResult._sum.line_total || 0);

      // Calcular total pagado (suma de amount_paid)
      const itemsPaidResult = await tx.order_items.aggregate({
        where: {
          order_id: order.id,
          is_cancelled: false,
        },
        _sum: { amount_paid: true },
      });
      const totalPaid = Number(itemsPaidResult._sum.amount_paid || 0);
      const totalPending = Math.max(0, subtotal - totalPaid);

      // Contar pagos
      const paymentCountFinal = await tx.payments.count({
        where: { order_id: order.id },
      });

      // Verificar items parcialmente pagados
      const partialPaymentsCount = await tx.order_items.count({
        where: {
          order_id: order.id,
          is_cancelled: false,
          amount_paid: { gt: 0 },
          is_paid: false,
        },
      });

      console.log('📊 Totales calculados:', {
        subtotal: `S/ ${subtotal.toFixed(2)}`,
        totalCancelled: `S/ ${totalCancelled.toFixed(2)}`,
        totalPaid: `S/ ${totalPaid.toFixed(2)}`,
        totalPending: `S/ ${totalPending.toFixed(2)}`,
        paymentCount: paymentCountFinal,
        partialPayments: partialPaymentsCount,
      });

      // Determinar nuevo estado
      let newStatus: order_status;
      if (totalPending === 0) {
        newStatus = order_status.PAGADA;
        console.log('🎉 Orden completamente pagada');
      } else if (partialPaymentsCount > 0 || paymentCountFinal > 1) {
        newStatus = order_status.EN_PAGO_DIVIDIDO;
        console.log('📊 Orden en pago dividido');
      } else if (totalPaid > 0) {
        newStatus = order_status.PARCIALMENTE_PAGADA;
        console.log('⏳ Orden parcialmente pagada');
      } else {
        newStatus = order.status;
        console.log('📝 Mantiene estado:', order.status);
      }

      // Actualizar orden
      await tx.orders.update({
        where: { id: order.id },
        data: {
          subtotal,
          total_cancelled: totalCancelled,
          total_paid: totalPaid,
          total_pending: totalPending,
          is_split_payment: paymentCountFinal > 1,
          split_payment_count: paymentCountFinal,
          status: newStatus,
        },
      });

      console.log('✅ Orden actualizada con estado:', newStatus);
      console.log('');

      // ============================================
      // PASO 10: VERIFICAR SI LIBERAR MESA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🪑 PASO 10: Verificar estado de mesa');
      console.log('──────────────────────────────────────────────────────');

      let newTableStatus = order.table.status;

      if (newStatus === order_status.PAGADA) {
        await tx.tables.update({
          where: { id: order.table_id },
          data: { status: table_status.LIBRE },
        });
        newTableStatus = table_status.LIBRE;
        console.log('✅ Mesa liberada:', {
          tableNumber: order.table.number,
          estadoAnterior: order.table.status,
          estadoNuevo: table_status.LIBRE,
        });
      } else {
        console.log('ℹ️  Mesa mantiene estado:', order.table.status);
        console.log(
          '   (Se liberará cuando la orden esté completamente pagada)',
        );
      }
      console.log('');

      // ============================================
      // RESUMEN FINAL
      // ============================================
      console.log('════════════════════════════════════════════════════════');
      console.log('✅ PAGOS INCREMENTALES COMPLETADOS');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Resumen:');
      console.log('  • Orden #:', order.daily_number);
      console.log('  • Mesa #:', order.table.number);
      console.log('  • Pagos procesados:', paymentResults.length);
      console.log('  • Total pagado:', `S/ ${totalPaid.toFixed(2)}`);
      console.log('  • Total pendiente:', `S/ ${totalPending.toFixed(2)}`);
      console.log('  • Estado orden:', newStatus);
      console.log('  • Estado mesa:', newTableStatus);
      console.log('\n📋 Detalle de pagos:');
      paymentResults.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.payer_name}: S/ ${result.amount.toFixed(2)}`,
        );
        console.log(`     Items: ${result.items_paid}`);
        if (result.change_given) {
          console.log(`     Vuelto: S/ ${result.change_given.toFixed(2)}`);
        }
      });
      console.log('════════════════════════════════════════════════════════');
      console.log('');

      return {
        order: {
          id: order.id,
          daily_number: order.daily_number,
          status: newStatus,
          total_paid: totalPaid,
          total_pending: totalPending,
          is_split_payment: paymentCountFinal > 1,
          split_payment_count: paymentCountFinal,
        },
        table: {
          id: order.table_id,
          number: order.table.number,
          new_status: newTableStatus,
        },
        payments: paymentResults,
        message: `${paymentResults.length} pago(s) incremental(es) procesado(s) exitosamente`,
      };
    });
  }

  // /**
  //  * Procesar pago dividido (split payment)
  //  */
  // async createSplitPayment(
  //   userId: string,
  //   cashRegisterId: string,
  //   createSplitPaymentDto: CreateSplitPaymentDto,
  // ) {
  //   // Verificar que la orden existe
  //   const order = await this.prisma.orders.findUnique({
  //     where: { id: createSplitPaymentDto.order_id },
  //     include: {
  //       table: true,
  //       order_items: {
  //         where: { is_cancelled: false },
  //       },
  //     },
  //   });

  //   if (!order) {
  //     throw new NotFoundException('Orden no encontrada');
  //   }

  //   // Validar estado de la orden
  //   const allowedStatuses: order_status[] = [
  //     order_status.CERRADA,
  //     order_status.PARCIALMENTE_PAGADA,
  //   ];

  //   if (!allowedStatuses.includes(order.status)) {
  //     throw new BadRequestException(
  //       'Solo se pueden procesar pagos de órdenes CERRADA o PARCIALMENTE PAGADA',
  //     );
  //   }

  //   // Validar que todos los items existen y pertenecen a la orden
  //   const allItemIds = createSplitPaymentDto.payments.flatMap(
  //     (p) => p.item_ids,
  //   );
  //   const items = await this.prisma.order_items.findMany({
  //     where: {
  //       id: { in: allItemIds },
  //       order_id: order.id,
  //       is_cancelled: false,
  //     },
  //   });

  //   if (items.length !== allItemIds.length) {
  //     throw new BadRequestException(
  //       'Algunos items no existen o no pertenecen a la orden',
  //     );
  //   }

  //   // Validar que ningún item esté ya pagado
  //   const paidItems = items.filter((item) => item.is_paid);
  //   if (paidItems.length > 0) {
  //     throw new BadRequestException('Algunos items ya están pagados');
  //   }

  //   // Validar que no haya items duplicados
  //   const uniqueItemIds = new Set(allItemIds);
  //   if (uniqueItemIds.size !== allItemIds.length) {
  //     throw new BadRequestException('Hay items duplicados en los pagos');
  //   }

  //   // Validar que el total de los pagos coincida con los items
  //   const itemsTotal = items.reduce(
  //     (sum, item) => sum + Number(item.line_total),
  //     0,
  //   );
  //   const paymentsTotal = createSplitPaymentDto.payments.reduce(
  //     (sum, p) => sum + p.amount,
  //     0,
  //   );

  //   if (Math.abs(itemsTotal - paymentsTotal) > 0.01) {
  //     throw new BadRequestException(
  //       `El total de pagos (${paymentsTotal}) no coincide con el total de items (${itemsTotal})`,
  //     );
  //   }

  //   const paymentResults: any = [];
  //   const existingPaymentCount = await this.prisma.payments.count({
  //     where: { order_id: order.id },
  //   });

  //   // Procesar cada pago
  //   for (let i = 0; i < createSplitPaymentDto.payments.length; i++) {
  //     const paymentDto = createSplitPaymentDto.payments[i];
  //     const paymentNumber = existingPaymentCount + i + 1;

  //     // Calcular vuelto
  //     const changeGiven =
  //       paymentDto.payment_method === payment_method.EFECTIVO &&
  //       paymentDto.amount_received
  //         ? paymentDto.amount_received - paymentDto.amount
  //         : null;

  //     // Crear pago
  //     const payment = await this.prisma.payments.create({
  //       data: {
  //         order_id: order.id,
  //         cash_register_id: cashRegisterId,
  //         payment_number: paymentNumber,
  //         amount: paymentDto.amount,
  //         payment_method: paymentDto.payment_method,
  //         amount_received: paymentDto.amount_received,
  //         change_given: changeGiven,
  //         payer_name: paymentDto.payer_name,
  //         payer_notes: paymentDto.payer_notes,
  //         processed_by: userId,
  //       },
  //     });

  //     // TODO: revisar aqui
  //     // Registrar movimiento de caja
  //     // await this.cashMovementsService.createAutomatic(
  //     //   cashRegisterId,
  //     //   cash_movement_type.INGRESO,
  //     //   paymentDto.amount,
  //     //   `Pago dividido - ${paymentDto.payer_name} - Orden #${order.daily_number}`,
  //     //   payment.id,
  //     // );

  //     // await this.cashMovementsService.createAutomatic({
  //     //   cashRegisterId: cashRegisterId,
  //     //   type: cash_movement_type.INGRESO,
  //     //   amount: paymentDto.amount,
  //     //   description: `Pago dividido - ${paymentDto.payer_name} - Orden #${order.daily_number}`,
  //     //   userId: userId,
  //     //   paymentId: payment.id,
  //     // });

  //     // Marcar items específicos como pagados
  //     await this.prisma.order_items.updateMany({
  //       where: {
  //         id: { in: paymentDto.item_ids },
  //       },
  //       data: {
  //         is_paid: true,
  //         paid_at: new Date(),
  //         payment_id: payment.id,
  //       },
  //     });

  //     // SIEMPRE generar comprobante - TICKET por defecto
  //     const splitDocType =
  //       paymentDto.generate_document && paymentDto.document_type
  //         ? paymentDto.document_type
  //         : comprobante_type.TICKET;

  //     const sale = await this.salesService.generateFromPayment(
  //       payment.id,
  //       splitDocType,
  //       paymentDto.client_id,
  //       userId,
  //       cashRegisterId,
  //     );

  //     paymentResults.push({
  //       payment_number: paymentNumber,
  //       payer_name: paymentDto.payer_name,
  //       amount: paymentDto.amount,
  //       change_given: changeGiven || undefined,
  //       sale_number: sale?.numero_completo,
  //     });
  //   }

  //   // Recalcular totales de la orden
  //   await this.ordersService.recalculateTotal(order.id);

  //   // Marcar orden como PAGADA y split payment
  //   await this.prisma.orders.update({
  //     where: { id: order.id },
  //     data: {
  //       status: order_status.PAGADA,
  //       is_split_payment: true,
  //       split_payment_count: paymentResults.length,
  //     },
  //   });

  //   // Cambiar estado de la mesa a LIMPIEZA
  //   await this.prisma.tables.update({
  //     where: { id: order.table_id },
  //     data: { status: table_status.LIMPIEZA },
  //   });

  //   // Obtener orden actualizada
  //   const finalOrder = await this.prisma.orders.findUnique({
  //     where: { id: order.id },
  //     select: {
  //       id: true,
  //       status: true,
  //       total_paid: true,
  //       total_pending: true,
  //       is_split_payment: true,
  //       split_payment_count: true,
  //     },
  //   });

  //   return {
  //     order: {
  //       id: finalOrder!.id,
  //       status: finalOrder!.status,
  //       total_paid: Number(finalOrder!.total_paid),
  //       total_pending: Number(finalOrder!.total_pending),
  //       is_split_payment: finalOrder!.is_split_payment,
  //       split_payment_count: finalOrder!.split_payment_count,
  //     },
  //     payments: paymentResults,
  //     message: `${paymentResults.length} pagos procesados exitosamente`,
  //   };
  // }

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

  /**
   * Obtener progreso de pagos de una orden
   */
  async getPaymentProgress(orderId: string) {
    return await this.ordersService.getPaymentProgress(orderId);
  }

  /**
   * Obtener historial completo de pagos de una orden
   */
  async getPaymentHistory(orderId: string) {
    const payments = await this.prisma.payments.findMany({
      where: { order_id: orderId },
      include: {
        processor: {
          select: { name: true },
        },
        payment_items: {
          include: {
            order_item: {
              select: {
                product_name: true,
                quantity: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            tipo_comprobante: true,
            numero_completo: true,
            precio_venta_total: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
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
      items_details: payment.payment_items.map((pi) => ({
        item_id: pi.order_item_id,
        product_name: pi.order_item.product_name,
        quantity_paid: pi.quantity_paid,
        amount: Number(pi.amount),
      })),
      sale: payment.sale
        ? {
            id: payment.sale.id,
            tipo_comprobante: payment.sale.tipo_comprobante,
            numero_completo: payment.sale.numero_completo,
            precio_venta_total: Number(payment.sale.precio_venta_total),
          }
        : undefined,
    }));
  }
}
