import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CashRegistersService } from '../cash-registers/cash-registers.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { cash_movement_type } from 'src/generated/prisma/enums';

@Injectable()
export class CashMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashRegistersService: CashRegistersService,
  ) {}

  /**
   * Crear un movimiento de caja (ingreso o egreso manual)
   */
  async create(userId: string, createCashMovementDto: CreateCashMovementDto) {
    // Obtener caja abierta del usuario
    const cashRegisterId =
      await this.cashRegistersService.getOpenCashRegisterId(userId);

    if (!cashRegisterId) {
      throw new BadRequestException(
        'Debe tener una caja abierta para registrar movimientos',
      );
    }

    // Obtener balance actual
    const cashRegister = await this.prisma.cash_registers.findUnique({
      where: { id: cashRegisterId },
      select: { expected_amount: true },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caja no encontrada');
    }

    // Validar que no se cree un egreso que deje la caja en negativo
    if (createCashMovementDto.type === cash_movement_type.EGRESO) {
      const newBalance =
        Number(cashRegister.expected_amount) - createCashMovementDto.amount;
      if (newBalance < 0) {
        throw new BadRequestException(
          `No hay suficiente dinero en caja. Balance actual: S/ ${Number(cashRegister.expected_amount).toFixed(2)}`,
        );
      }
    }

    // Crear movimiento
    const movement = await this.prisma.cash_movements.create({
      data: {
        cash_register_id: cashRegisterId,
        type: createCashMovementDto.type,
        amount: createCashMovementDto.amount,
        description: createCashMovementDto.description,
        is_automatic: false,
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

    // Actualizar totales de la caja
    await this.cashRegistersService.updateTotals(cashRegisterId);

    // Calcular nuevo balance
    const updatedCashRegister = await this.prisma.cash_registers.findUnique({
      where: { id: cashRegisterId },
      select: { expected_amount: true },
    });

    return {
      id: movement.id,
      type: movement.type,
      amount: Number(movement.amount),
      description: movement.description,
      is_automatic: movement.is_automatic,
      created_by: movement.creator.name,
      created_at: movement.created_at,
      new_balance: Number(updatedCashRegister?.expected_amount || 0),
    };
  }

  /**
   * Obtener movimientos de la caja actual del usuario
   */
  async findByCurrentCashRegister(userId: string) {
    // Obtener caja abierta del usuario
    const cashRegisterId =
      await this.cashRegistersService.getOpenCashRegisterId(userId);

    if (!cashRegisterId) {
      throw new BadRequestException('No tiene una caja abierta');
    }

    return this.findByCashRegister(cashRegisterId);
  }

  /**
   * Obtener movimientos de una caja específica
   */
  async findByCashRegister(cashRegisterId: string) {
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
   * Crear movimiento automático (llamado por otros servicios)
   */
  async createAutomatic(
    cashRegisterId: string,
    type: cash_movement_type,
    amount: number,
    description: string,
    paymentId?: string,
  ): Promise<void> {
    await this.prisma.cash_movements.create({
      data: {
        cash_register_id: cashRegisterId,
        type,
        amount,
        description,
        is_automatic: true,
        payment_id: paymentId,
        // Para movimientos automáticos, usar el primer admin o system user
        created_by: (await this.getSystemUserId()) || cashRegisterId,
      },
    });

    // Actualizar totales de la caja
    await this.cashRegistersService.updateTotals(cashRegisterId);
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
