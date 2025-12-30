import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
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
}
