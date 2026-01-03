import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CashRegisterHistoryDto } from './dto/cash-register-history.dto';
import { cash_registersWhereInput } from 'src/generated/prisma/models';
import { CashRegisterTotalsDto } from './dto/cash-register-response.dto';

@Injectable()
export class CashRegistersService {
  private readonly logger = new Logger(CashRegistersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async open(userId: string, openCashRegisterDto: OpenCashRegisterDto) {
    const existingOpenCash = await this.prisma.cash_registers.findFirst({
      where: {
        user_id: userId,
        status: 'ABIERTA',
      },
    });

    if (existingOpenCash) {
      throw new ConflictException('Ya tiene una caja abierta');
    }

    try {
      const cashRegister = await this.prisma.cash_registers.create({
        data: {
          user_id: userId,
          initial_amount: openCashRegisterDto.initial_amount,
          expected_amount: openCashRegisterDto.initial_amount,
          notes: openCashRegisterDto.notes,
          status: 'ABIERTA',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });

      return {
        succes: true,
        message: 'Caja abierta exitosamente',
        data: {
          id: cashRegister.id,
          user: cashRegister.user,
          open_time: cashRegister.open_time,
          close_time: cashRegister.close_time,
          initial_amount: Number(cashRegister.initial_amount),
          total_sales: Number(cashRegister.total_sales),
          total_income: Number(cashRegister.total_income),
          total_expense: Number(cashRegister.total_expense),
          expected_amount: Number(cashRegister.expected_amount),
          final_amount: cashRegister.final_amount
            ? Number(cashRegister.final_amount)
            : undefined,
          difference: cashRegister.difference
            ? Number(cashRegister.difference)
            : undefined,
          status: cashRegister.status,
          notes: cashRegister.notes,
          created_at: cashRegister.created_at,
          updated_at: cashRegister.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error interno al abrir caja', error);
      throw new InternalServerErrorException('Error interno al abrir caja');
    }
  }

  async close(userId: string, closeCashRegisterDto: CloseCashRegisterDto) {
    const cashRegister = await this.prisma.cash_registers.findFirst({
      where: {
        user_id: userId,
        status: 'ABIERTA',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('No tiene una caja abierta');
    }

    const difference =
      closeCashRegisterDto.final_amount - Number(cashRegister.expected_amount);

    try {
      const closedCashRegister = await this.prisma.cash_registers.update({
        where: { id: cashRegister.id },
        data: {
          close_time: new Date(),
          final_amount: closeCashRegisterDto.final_amount,
          difference,
          status: 'CERRADA',
          notes: closeCashRegisterDto.notes
            ? `${cashRegister.notes || ''}\n--- CIERRE ---\n${closeCashRegisterDto.notes}`
            : cashRegister.notes,
        },
      });

      const summary = await this.getSummary(closedCashRegister.id);

      return {
        succes: true,
        message: 'Caja cerrada exitosamente',
        data: summary,
      };
    } catch (error) {
      this.logger.error('Error interno al cerrar caja', error);
      throw new InternalServerErrorException('Error interno al cerrar caja');
    }
  }

  async getCurrent(userId: string) {
    const cashRegister = await this.prisma.cash_registers.findFirst({
      where: {
        user_id: userId,
        status: 'ABIERTA',
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('No tiene una caja abierta');
    }

    const now = new Date();
    const hoursOpen =
      (now.getTime() - cashRegister.open_time.getTime()) / (1000 * 60 * 60);

    try {
      const lastSale = await this.prisma.sales.findFirst({
        where: { cash_register_id: cashRegister.id },
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      });

      const salesCount = await this.prisma.sales.count({
        where: { cash_register_id: cashRegister.id },
      });

      const totals: CashRegisterTotalsDto = {
        sales: Number(cashRegister.total_sales),
        income: Number(cashRegister.total_income),
        expense: Number(cashRegister.total_expense),
        current_balance: Number(cashRegister.expected_amount),
      };

      return {
        success: true,
        message: 'Caja actual obtenida exitosamente',
        data: {
          id: cashRegister.id,
          open_time: cashRegister.open_time,
          initial_amount: Number(cashRegister.initial_amount),
          status: cashRegister.status,
          hours_open: Number(hoursOpen.toFixed(2)),
          totals,
          sales_count: salesCount,
          last_sale: lastSale?.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error interno al obtener caja actual', error);
      throw new InternalServerErrorException(
        'Error interno al obtener caja actual',
      );
    }
  }

  async getToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      const cashRegisters = await this.prisma.cash_registers.findMany({
        where: {
          open_time: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              sales: true,
            },
          },
        },
        orderBy: { open_time: 'desc' },
      });

      return {
        success: true,
        message: 'Cajas del día obtenidas exitosamente',
        data: cashRegisters.map((cr) => ({
          id: cr.id,
          user_name: cr.user.name,
          open_time: cr.open_time,
          close_time: cr.close_time,
          initial_amount: Number(cr.initial_amount),
          expected_amount: Number(cr.expected_amount),
          final_amount: cr.final_amount ? Number(cr.final_amount) : undefined,
          difference: cr.difference ? Number(cr.difference) : undefined,
          status: cr.status,
          sales_count: cr._count.sales,
          total_sales: Number(cr.total_sales),
        })),
      };
    } catch (error) {
      this.logger.error('Error interno al obtener cajas del día', error);
      throw new InternalServerErrorException(
        'Error interno al obtener cajas del día',
      );
    }
  }

  async getHistory(filters: CashRegisterHistoryDto) {
    const where: cash_registersWhereInput = {};

    // filtrara por rango de fechas
    if (filters.from || filters.to) {
      where.open_time = {};
      if (filters.from) {
        where.open_time.gte = new Date(filters.from);
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        where.open_time.lte = toDate;
      }
    }

    // filtrar por usuario
    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    // filtrar por estadoj
    if (filters.status) {
      where.status = filters.status;
    }
    try {
      const cashRegisters = await this.prisma.cash_registers.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              sales: true,
            },
          },
        },
        orderBy: { open_time: 'desc' },
        take: 100,
      });

      return {
        success: true,
        message: 'Historial de cajas obtenido exitosamente',
        data: cashRegisters.map((cr) => ({
          id: cr.id,
          user_name: cr.user.name,
          open_time: cr.open_time,
          close_time: cr.close_time,
          initial_amount: Number(cr.initial_amount),
          expected_amount: Number(cr.expected_amount),
          final_amount: cr.final_amount ? Number(cr.final_amount) : undefined,
          difference: cr.difference ? Number(cr.difference) : undefined,
          status: cr.status,
          sales_count: cr._count.sales,
          total_sales: Number(cr.total_sales),
        })),
      };
    } catch (error) {
      this.logger.error('Error interno al obtener historial de cajas', error);
      throw new InternalServerErrorException(
        'Error interno al obtener historial de cajas',
      );
    }
  }

  async findOne(id: string) {
    const cashRegister = await this.prisma.cash_registers.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!cashRegister) {
      this.logger.warn(`Caja con ID ${id} no encontrada`);
      throw new NotFoundException('Caja no encontrada');
    }

    return {
      success: true,
      message: 'Caja obtenida exitosamente',
      data: {
        id: cashRegister.id,
        user: cashRegister.user,
        open_time: cashRegister.open_time,
        close_time: cashRegister.close_time,
        initial_amount: Number(cashRegister.initial_amount),
        total_sales: Number(cashRegister.total_sales),
        total_income: Number(cashRegister.total_income),
        total_expense: Number(cashRegister.total_expense),
        expected_amount: Number(cashRegister.expected_amount),
        final_amount: cashRegister.final_amount
          ? Number(cashRegister.final_amount)
          : undefined,
        difference: cashRegister.difference
          ? Number(cashRegister.difference)
          : undefined,
        status: cashRegister.status,
        notes: cashRegister.notes,
        created_at: cashRegister.created_at,
        updated_at: cashRegister.updated_at,
      },
    };
  }

  async getSummary(id: string) {
    const cashRegister = await this.prisma.cash_registers.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caja no encontrada');
    }

    const closeTime = cashRegister.close_time || new Date();
    const durationHours =
      (closeTime.getTime() - cashRegister.open_time.getTime()) /
      (1000 * 60 * 60);

    // Obtener ventas agrupadas por tipo de comprobante
    const salesByType = await this.prisma.sales.groupBy({
      by: ['tipo_comprobante'],
      where: { cash_register_id: id },
      _count: { id: true },
      _sum: { precio_venta_total: true },
    });

    const salesByTypeMap: Record<string, { count: number; amount: number }> =
      {};
    salesByType.forEach((item) => {
      salesByTypeMap[item.tipo_comprobante] = {
        count: item._count.id,
        amount: Number(item._sum.precio_venta_total || 0),
      };
    });

    // Obtener ventas agrupadas por método de pago
    const salesByPaymentMethod = await this.prisma.sales.groupBy({
      by: ['payment_method'],
      where: { cash_register_id: id },
      _count: { id: true },
      _sum: { precio_venta_total: true },
    });

    const salesByPaymentMethodMap: Record<
      string,
      { count: number; amount: number }
    > = {};
    salesByPaymentMethod.forEach((item) => {
      salesByPaymentMethodMap[item.payment_method] = {
        count: item._count.id,
        amount: Number(item._sum.precio_venta_total || 0),
      };
    });

    // Contar ventas totales
    const totalSalesCount = await this.prisma.sales.count({
      where: { cash_register_id: id },
    });

    // Obtener movimientos
    const incomeMovements = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: id,
        type: 'INGRESO',
        is_automatic: false,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    const expenseMovements = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: id,
        type: 'EGRESO',
        is_automatic: false,
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      success: true,
      message: 'Resumen de caja obtenido exitosamente',
      data: {
        id: cashRegister.id,
        user: {
          name: cashRegister.user.name,
        },
        period: {
          open: cashRegister.open_time,
          close: cashRegister.close_time,
          duration_hours: Number(durationHours.toFixed(2)),
        },
        amounts: {
          initial: Number(cashRegister.initial_amount),
          expected: Number(cashRegister.expected_amount),
          final: cashRegister.final_amount
            ? Number(cashRegister.final_amount)
            : undefined,
          difference: cashRegister.difference
            ? Number(cashRegister.difference)
            : undefined,
        },
        sales_summary: {
          total_count: totalSalesCount,
          total_amount: Number(cashRegister.total_sales),
          by_type: salesByTypeMap,
          by_payment_method: salesByPaymentMethodMap,
        },
        movements: {
          income: {
            count: incomeMovements._count.id,
            amount: Number(incomeMovements._sum.amount || 0),
          },
          expense: {
            count: expenseMovements._count.id,
            amount: Number(expenseMovements._sum.amount || 0),
          },
        },
      },
    };
  }

  /**
   * Actualizar totales de la caja (llamado al crear ventas o movimientos)
   */
  async updateTotals(cashRegisterId: string): Promise<void> {
    // Obtener total de ventas
    const salesTotal = await this.prisma.sales.aggregate({
      where: { cash_register_id: cashRegisterId },
      _sum: { precio_venta_total: true },
    });

    // Obtener total de ingresos manuales
    const incomeTotal = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        type: 'INGRESO',
        is_automatic: false,
      },
      _sum: { amount: true },
    });

    // Obtener total de egresos
    const expenseTotal = await this.prisma.cash_movements.aggregate({
      where: {
        cash_register_id: cashRegisterId,
        type: 'EGRESO',
      },
      _sum: { amount: true },
    });

    // Obtener monto inicial
    const cashRegister = await this.prisma.cash_registers.findUnique({
      where: { id: cashRegisterId },
      select: { initial_amount: true },
    });

    if (!cashRegister) {
      return;
    }

    const totalSales = Number(salesTotal._sum.precio_venta_total || 0);
    const totalIncome = Number(incomeTotal._sum.amount || 0);
    const totalExpense = Number(expenseTotal._sum.amount || 0);
    const expectedAmount =
      Number(cashRegister.initial_amount) +
      totalSales +
      totalIncome -
      totalExpense;

    // Actualizar caja
    await this.prisma.cash_registers.update({
      where: { id: cashRegisterId },
      data: {
        total_sales: totalSales,
        total_income: totalIncome,
        total_expense: totalExpense,
        expected_amount: expectedAmount,
      },
    });
  }

  async hasOpenCashRegister(userId: string) {
    try {
      const count = await this.prisma.cash_registers.count({
        where: {
          user_id: userId,
          status: 'ABIERTA',
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error('Error interno al verificar caja abierta', error);
      throw new InternalServerErrorException(
        'Error interno al verificar caja abierta',
      );
    }
  }

  async getOpenCashRegisterId(userId: string) {
    try {
      const cashRegister = await this.prisma.cash_registers.findFirst({
        where: {
          user_id: userId,
          status: 'ABIERTA',
        },
        select: { id: true },
      });

      return cashRegister?.id || null;
    } catch (error) {
      this.logger.error('Error interno al obtener ID de caja abierta', error);
      throw new InternalServerErrorException(
        'Error interno al obtener ID de caja abierta',
      );
    }
  }
}
