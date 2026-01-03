import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  private readonly logger = new Logger(FloorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(values: CreateFloorDto) {
    const existingLevel = await this.prisma.floors.findUnique({
      where: { level: values.level },
    });

    if (existingLevel) {
      throw new ConflictException(
        `El nivel ${values.level} ya está asignado a otro piso`,
      );
    }

    try {
      const newFloor = await this.prisma.floors.create({
        data: values,
      });

      return newFloor;
    } catch (error) {
      throw new InternalServerErrorException('Error al crear el piso');
    }
  }

  async findAll() {
    return await this.prisma.floors.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: { tables: true },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  async findOne(id: string) {
    const floor = await this.prisma.floors.findUnique({
      where: { id, is_active: true },
      include: {
        tables: {
          where: { is_active: true },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }

    return floor;
  }

  async update(id: string, values: UpdateFloorDto) {
    const floor = await this.prisma.floors.findUnique({
      where: { id },
    });

    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }

    try {
      return await this.prisma.floors.update({
        where: { id },
        data: values,
      });
    } catch (error) {
      throw new InternalServerErrorException('No se pudo actualizar el piso');
    }
  }

  async softDelete(id: string) {
    const floor = await this.prisma.floors.findUnique({
      where: { id },
    });

    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }

    try {
      await this.prisma.floors.update({
        where: { id },
        data: { is_active: false },
      });
    } catch (error) {
      throw new InternalServerErrorException('Nose pudo desactivar piso');
    }
  }

  async findAllWithTables() {
    try {
      const floors = await this.prisma.floors.findMany({
        where: { is_active: true },
        select: {
          id: true,
          level: true,
          name: true,
          _count: {
            select: { tables: true },
          },
          tables: {
            where: { is_active: true },
            orderBy: { number: 'asc' },
            select: {
              orders: {
                select: {
                  id: true,
                  daily_number: true,
                  subtotal: true,
                  status: true,
                  created_at: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              id: true,
              name: true,
              number: true,
              capacity: true,
              status: true,
              _count: {
                select: {
                  orders: true,
                },
              },
            },
          },
        },
        orderBy: { level: 'asc' },
      });
      return {
        success: true,
        message: 'Pisos obtenidos correctamente',
        data: floors.map((f) => ({
          ...f,
          tables: f.tables.map((t) => ({
            ...t,
            orders: t.orders.map((o) => ({
              ...o,
              subtotal: Number(o.subtotal),
            })),
          })),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener los pisos con mesas', error.stack);
      throw new InternalServerErrorException(
        'Error interno al obtener los pisos con mesas',
      );
    }
  }
}
