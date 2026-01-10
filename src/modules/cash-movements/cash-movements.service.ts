import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CashRegistersService } from '../cash-registers/cash-registers.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import {
  cash_movement_type,
  cash_register_status,
} from 'src/generated/prisma/enums';

@Injectable()
export class CashMovementsService {
  private readonly logger = new Logger(CashMovementsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashRegistersService: CashRegistersService,
  ) {}

  async create(userId: string, createCashMovementDto: CreateCashMovementDto) {
    return await this.prisma.$transaction(async (tx) => {
      console.log('════════════════════════════════════════════════════════');
      console.log('🔷 INICIO - REGISTRO DE MOVIMIENTO DE CAJA');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Datos recibidos:', {
        userId,
        type: createCashMovementDto.type,
        amount: createCashMovementDto.amount,
        description: createCashMovementDto.description,
      });
      console.log('');

      // ============================================
      // PASO 1: OBTENER CAJA ABIERTA DEL USUARIO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔍 PASO 1: Buscar caja abierta del usuario');
      console.log('──────────────────────────────────────────────────────');

      const openCashRegister = await tx.cash_registers.findFirst({
        where: {
          user_id: userId,
          status: cash_register_status.ABIERTA,
        },
        select: {
          id: true,
          initial_amount: true,
          total_sales: true,
          total_income: true,
          total_expense: true,
          expected_amount: true,
          open_time: true,
          user: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      });

      if (!openCashRegister) {
        console.log('❌ ERROR: No hay caja abierta');
        throw new BadRequestException(
          'Debe tener una caja abierta para registrar movimientos',
        );
      }

      console.log('✅ Caja abierta encontrada:', {
        id: openCashRegister.id,
        user: openCashRegister.user.name,
        openedAt: openCashRegister.open_time,
        currentBalance: `S/ ${Number(openCashRegister.expected_amount).toFixed(2)}`,
      });
      console.log('');

      // ============================================
      // PASO 2: VALIDAR BALANCE PARA EGRESOS
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💰 PASO 2: Validar balance actual');
      console.log('──────────────────────────────────────────────────────');

      const currentBalance = Number(openCashRegister.expected_amount);

      console.log('📊 Estado actual de caja:', {
        initialAmount: `S/ ${Number(openCashRegister.initial_amount).toFixed(2)}`,
        totalSales: `S/ ${Number(openCashRegister.total_sales).toFixed(2)}`,
        totalIncome: `S/ ${Number(openCashRegister.total_income).toFixed(2)}`,
        totalExpense: `S/ ${Number(openCashRegister.total_expense).toFixed(2)}`,
        expectedAmount: `S/ ${currentBalance.toFixed(2)}`,
      });

      if (createCashMovementDto.type === cash_movement_type.EGRESO) {
        console.log('\n🔍 Validando egreso...');
        console.log(
          'Monto a retirar:',
          `S/ ${createCashMovementDto.amount.toFixed(2)}`,
        );
        console.log('Balance disponible:', `S/ ${currentBalance.toFixed(2)}`);

        const newBalance = currentBalance - createCashMovementDto.amount;

        if (newBalance < 0) {
          console.log('❌ ERROR: Fondos insuficientes');
          console.log(
            'Balance resultante sería:',
            `S/ ${newBalance.toFixed(2)}`,
          );
          throw new BadRequestException(
            `No hay suficiente dinero en caja. Balance actual: S/ ${currentBalance.toFixed(2)}`,
          );
        }

        console.log('✅ Fondos suficientes');
        console.log(
          'Balance después del egreso:',
          `S/ ${newBalance.toFixed(2)}`,
        );
      } else {
        console.log('\n💵 Registrando ingreso...');
        console.log(
          'Monto a ingresar:',
          `S/ ${createCashMovementDto.amount.toFixed(2)}`,
        );
        const newBalance = currentBalance + createCashMovementDto.amount;
        console.log(
          'Balance después del ingreso:',
          `S/ ${newBalance.toFixed(2)}`,
        );
      }

      console.log('✅ Validación de balance completada');
      console.log('');

      // ============================================
      // PASO 3: CREAR REGISTRO DE MOVIMIENTO
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('💾 PASO 3: Crear registro de movimiento');
      console.log('──────────────────────────────────────────────────────');

      const movement = await tx.cash_movements.create({
        data: {
          cash_register_id: openCashRegister.id,
          type: createCashMovementDto.type,
          amount: createCashMovementDto.amount,
          description: createCashMovementDto.description,
          is_automatic: false, // Movimiento MANUAL
          created_by: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      console.log('✅ Movimiento creado:', {
        id: movement.id,
        type: movement.type,
        amount: `S/ ${Number(movement.amount).toFixed(2)}`,
        description: movement.description,
        isAutomatic: movement.is_automatic,
        createdBy: movement.creator.name,
        createdAt: movement.created_at,
      });
      console.log('');

      // ============================================
      // PASO 4: RECALCULAR TOTALES DE LA CAJA
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('🔄 PASO 4: Recalcular totales de la caja');
      console.log('──────────────────────────────────────────────────────');

      // 4.1: Obtener total de VENTAS (de tabla sales)
      console.log('\n📊 4.1: Calculando total de ventas...');
      const salesTotal = await tx.sales.aggregate({
        where: { cash_register_id: openCashRegister.id },
        _sum: { precio_venta_total: true },
      });
      const totalSales = Number(salesTotal._sum.precio_venta_total || 0);
      console.log(
        'Total ventas (de tabla sales):',
        `S/ ${totalSales.toFixed(2)}`,
      );

      // 4.2: Obtener total de INGRESOS MANUALES (is_automatic = false)
      console.log('\n💵 4.2: Calculando total de ingresos manuales...');
      const incomeTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: openCashRegister.id,
          type: cash_movement_type.INGRESO,
          is_automatic: false, // ✅ SOLO MANUALES
        },
        _sum: { amount: true },
      });
      const totalIncome = Number(incomeTotal._sum.amount || 0);
      console.log('Total ingresos manuales:', `S/ ${totalIncome.toFixed(2)}`);

      // 4.3: Obtener total de EGRESOS
      console.log('\n💸 4.3: Calculando total de egresos...');
      const expenseTotal = await tx.cash_movements.aggregate({
        where: {
          cash_register_id: openCashRegister.id,
          type: cash_movement_type.EGRESO,
        },
        _sum: { amount: true },
      });
      const totalExpense = Number(expenseTotal._sum.amount || 0);
      console.log('Total egresos:', `S/ ${totalExpense.toFixed(2)}`);

      // 4.4: Calcular monto esperado
      console.log('\n🧮 4.4: Calculando monto esperado...');
      const initialAmount = Number(openCashRegister.initial_amount);
      const expectedAmount =
        initialAmount + totalSales + totalIncome - totalExpense;

      console.log('Fórmula: initial + sales + income_manual - expense');
      console.log('Cálculo:', {
        initial: `S/ ${initialAmount.toFixed(2)}`,
        sales: `+ S/ ${totalSales.toFixed(2)}`,
        income: `+ S/ ${totalIncome.toFixed(2)}`,
        expense: `- S/ ${totalExpense.toFixed(2)}`,
        result: `= S/ ${expectedAmount.toFixed(2)}`,
      });

      // 4.5: Actualizar caja con nuevos totales
      console.log('\n💾 4.5: Actualizando registro de caja...');
      await tx.cash_registers.update({
        where: { id: openCashRegister.id },
        data: {
          total_sales: totalSales,
          total_income: totalIncome,
          total_expense: totalExpense,
          expected_amount: expectedAmount,
        },
      });

      console.log('✅ Totales actualizados en cash_registers:', {
        totalSales: `S/ ${totalSales.toFixed(2)}`,
        totalIncome: `S/ ${totalIncome.toFixed(2)}`,
        totalExpense: `S/ ${totalExpense.toFixed(2)}`,
        expectedAmount: `S/ ${expectedAmount.toFixed(2)}`,
      });
      console.log('');

      // ============================================
      // PASO 5: OBTENER ESTADÍSTICAS
      // ============================================
      console.log('──────────────────────────────────────────────────────');
      console.log('📈 PASO 5: Obtener estadísticas de movimientos');
      console.log('──────────────────────────────────────────────────────');

      const movementsCount = await tx.cash_movements.count({
        where: {
          cash_register_id: openCashRegister.id,
          is_automatic: false,
        },
      });

      const incomesManualCount = await tx.cash_movements.count({
        where: {
          cash_register_id: openCashRegister.id,
          type: cash_movement_type.INGRESO,
          is_automatic: false,
        },
      });

      const incomesAutoCount = await tx.cash_movements.count({
        where: {
          cash_register_id: openCashRegister.id,
          type: cash_movement_type.INGRESO,
          is_automatic: true,
        },
      });

      const expensesCount = await tx.cash_movements.count({
        where: {
          cash_register_id: openCashRegister.id,
          type: cash_movement_type.EGRESO,
        },
      });

      console.log('📊 Estadísticas:', {
        totalMovimientosManuales: movementsCount,
        ingresosManuales: incomesManualCount,
        ingresosAutomaticos: incomesAutoCount,
        egresos: expensesCount,
      });
      console.log('');

      // ============================================
      // RESUMEN FINAL
      // ============================================
      console.log('════════════════════════════════════════════════════════');
      console.log('✅ MOVIMIENTO REGISTRADO EXITOSAMENTE');
      console.log('════════════════════════════════════════════════════════');
      console.log('📋 Resumen del movimiento:');
      console.log('  • Tipo:', movement.type);
      console.log('  • Monto:', `S/ ${Number(movement.amount).toFixed(2)}`);
      console.log('  • Descripción:', movement.description);
      console.log('  • Registrado por:', movement.creator.name);
      console.log('  • Fecha:', movement.created_at);
      console.log('\n📊 Estado de caja actualizado:');
      console.log('  • Balance anterior:', `S/ ${currentBalance.toFixed(2)}`);
      console.log('  • Balance nuevo:', `S/ ${expectedAmount.toFixed(2)}`);
      console.log(
        '  • Diferencia:',
        `S/ ${(expectedAmount - currentBalance).toFixed(2)}`,
      );
      console.log('\n📈 Totales acumulados:');
      console.log('  • Ventas:', `S/ ${totalSales.toFixed(2)}`);
      console.log(
        '  • Ingresos manuales:',
        `S/ ${totalIncome.toFixed(2)} (${incomesManualCount} movimientos)`,
      );
      console.log(
        '  • Egresos:',
        `S/ ${totalExpense.toFixed(2)} (${expensesCount} movimientos)`,
      );
      console.log('  • Total esperado:', `S/ ${expectedAmount.toFixed(2)}`);
      console.log('════════════════════════════════════════════════════════');
      console.log('');

      return {
        success: true,
        message: 'Movimiento registrado exitosamente',
        data: {
          id: movement.id,
          type: movement.type,
          amount: Number(movement.amount),
          description: movement.description,
          is_automatic: movement.is_automatic,
          created_by: movement.creator.name,
          created_at: movement.created_at,
          new_balance: expectedAmount,
          cash_register: {
            id: openCashRegister.id,
            total_sales: totalSales,
            total_income: totalIncome,
            total_expense: totalExpense,
            expected_amount: expectedAmount,
          },
        },
      };
    });
  }

  async findByCurrentCashRegister(userId: string) {
    const cashRegisterId =
      await this.cashRegistersService.getOpenCashRegisterId(userId);

    if (!cashRegisterId) {
      throw new BadRequestException('No tiene una caja abierta');
    }

    const result = await this.findByCashRegister(cashRegisterId);

    return {
      success: true,
      message: 'Movimientos de caja actual obtenidos exitosamente',
      data: result,
    };
  }

  async findByCashRegister(cashRegisterId: string) {
    try {
      const movements = await this.prisma.cash_movements.findMany({
        where: { cash_register_id: cashRegisterId },
        include: {
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: Number(movement.amount),
        description: movement.description,
        is_automatic: movement.is_automatic,
        created_by: movement.creator.name,
        created_at: movement.created_at,
      }));
    } catch (error) {
      this.logger.error('Error al obtener movimientos de caja', error);
      throw new InternalServerErrorException(
        'Error interno al obtener movimientos de caja',
      );
    }
  }

  /**
   * Obtener resumen de movimientos de una caja
   */
  async getSummary(cashRegisterId: string) {
    // Contar y sumar todos los movimientos
    const totalStats = await this.prisma.cash_movements.aggregate({
      where: { cash_register_id: cashRegisterId },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Estadísticas por tipo
    const incomeStats = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        type: cash_movement_type.INGRESO,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    const expenseStats = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        type: cash_movement_type.EGRESO,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Estadísticas por origen (manual vs automático)
    const manualStats = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        is_automatic: false,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    const automaticStats = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        is_automatic: true,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      total_count: totalStats._count.id,
      total_amount: Number(totalStats._sum.amount || 0),
      by_type: {
        income: {
          count: incomeStats._count.id,
          amount: Number(incomeStats._sum.amount || 0),
        },
        expense: {
          count: expenseStats._count.id,
          amount: Number(expenseStats._sum.amount || 0),
        },
      },
      by_origin: {
        manual: {
          count: manualStats._count.id,
          amount: Number(manualStats._sum.amount || 0),
        },
        automatic: {
          count: automaticStats._count.id,
          amount: Number(automaticStats._sum.amount || 0),
        },
      },
    };
  }

  /**
   * Obtener ID de usuario del sistema para movimientos automáticos
   */
  private async getSystemUserId(): Promise<string | null> {
    const systemUser = await this.prisma.users.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    return systemUser?.id || null;
  }

  /**
   * Obtener detalle de un movimiento
   */
  async findOne(id: string) {
    const movement = await this.prisma.cash_movements.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Movimiento con ID "${id}" no encontrado`);
    }

    return {
      id: movement.id,
      cash_register_id: movement.cash_register_id,
      type: movement.type,
      amount: Number(movement.amount),
      description: movement.description,
      is_automatic: movement.is_automatic,
      payment_id: movement.payment_id,
      creator: movement.creator,
      created_at: movement.created_at,
    };
  }
}
