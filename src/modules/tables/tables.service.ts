import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { table_status } from 'src/generated/prisma/enums';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(values: CreateTableDto) {
    const existing = await this.prisma.tables.findUnique({
      where: {
        floor_id_number: {
          floor_id: values.floor_id,
          number: values.number,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `La mesa número ${values.number} ya existe en este piso`,
      );
    }

    try {
      const newTable = await this.prisma.tables.create({ data: values });

      return {
        success: true,
        message: 'Mesa creada exitosamente.',
        data: newTable,
      };
    } catch (error) {
      this.logger.error(
        `Error creando mesa ${values.number}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error interno al crear la mesa');
    }
  }

  async findAll() {
    try {
      const tables = await this.prisma.tables.findMany({
        where: { is_active: true },
        include: { floor: { select: { name: true, id: true, level: true } } },
      });

      return {
        success: true,
        message: 'Mesas obtenidas exitosamente.',
        data: tables,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo mesas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener las mesas',
      );
    }
  }

  async findByFloor(floorId: string) {
    const piso = await this.prisma.floors.findUnique({
      where: { id: floorId, is_active: true },
    });

    if (!piso) {
      throw new NotFoundException('El piso no existe o no está activo');
    }

    try {
      const tables = await this.prisma.tables.findMany({
        where: { floor_id: piso.id, is_active: true },
        include: {
          orders: {
            select: { id: true, daily_number: true, subtotal: true },
          },
        },
        orderBy: { number: 'asc' },
      });

      return {
        success: true,
        message: `Mesas del piso ${piso.level} obtenidas exitosamente.`,
        data: tables,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo mesas del piso ${piso.level}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener las mesas del piso',
      );
    }
  }

  async findAvailable() {
    try {
      const tables = await this.prisma.tables.findMany({
        where: { status: table_status.LIBRE, is_active: true },
        include: { floor: { select: { id: true, name: true, level: true } } },
      });

      return {
        success: true,
        message: 'Mesas libres obtenidas exitosamente.',
        data: tables,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo mesas libres: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener las mesas libres',
      );
    }
  }

  async updateStatus(id: string, status: table_status) {
    try {
      const table = await this.prisma.tables.update({
        where: { id },
        data: { status },
        include: { floor: { select: { id: true, name: true, level: true } } },
      });

      return {
        success: true,
        message: 'Estado de mesa actualizado exitosamente.',
        data: table,
      };
    } catch (error) {
      this.logger.error(
        `Error actualizando estado de mesa ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al actualizar el estado de la mesa',
      );
    }
  }

  // async findOne(id: string) {
  //   const table = await this.prisma.tables.findUnique({
  //     where: { id, is_active: true },
  //     include: { floor: true },
  //   });

  //   if (!table) throw new NotFoundException('Mesa no encontrada');

  //   return table;
  // }

  async softDelete(id: string) {
    try {
      const table = await this.prisma.tables.update({
        where: { id },
        data: { is_active: false },
      });

      return {
        success: true,
        message: 'Mesa desactivada exitosamente.',
        data: table,
      };
    } catch (error) {
      this.logger.error(
        `Error desactivando mesa ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al desactivar la mesa',
      );
    }
  }

  // async findAllWithFloor() {
  //   const tables = await this.prisma.ta
  // }
}
