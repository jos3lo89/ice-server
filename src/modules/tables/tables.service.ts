import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { table_status } from 'src/generated/prisma/enums';

@Injectable()
export class TablesService {
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
      return newTable;
    } catch (error) {
      throw new InternalServerErrorException('Error al crear la mesa');
    }
  }

  async findAll() {
    return await this.prisma.tables.findMany({
      where: { is_active: true },
      include: { floor: { select: { name: true } } },
    });
  }

  async findByFloor(floorId: string) {
    return await this.prisma.tables.findMany({
      where: { floor_id: floorId, is_active: true },
      include: {
        orders: {
          where: { status: 'ABIERTA' },
          select: { id: true, daily_number: true, subtotal: true },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findAvailable() {
    return await this.prisma.tables.findMany({
      where: { status: table_status.LIBRE, is_active: true },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.tables.findUnique({
      where: { id, is_active: true },
      include: { floor: true },
    });

    if (!table) throw new NotFoundException('Mesa no encontrada');

    return table;
  }

  async updateStatus(id: string, status: table_status) {
    return this.prisma.tables.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.tables.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
