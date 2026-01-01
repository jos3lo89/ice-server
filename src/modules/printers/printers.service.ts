import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createPrinterDto: CreatePrinterDto) {
    const validAreas = Object.values(area_preparacion);
    if (!validAreas.includes(createPrinterDto.area)) {
      throw new BadRequestException(
        `Área inválida. Use: ${validAreas.join(', ')}`,
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        if (createPrinterDto.is_default) {
          await tx.printers.updateMany({
            where: {
              area: createPrinterDto.area,
              is_default: true,
            },
            data: { is_default: false },
          });
        }

        return await tx.printers.create({
          data: createPrinterDto,
        });
      });

      return {
        success: true,
        message: 'Impresora creada exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Datos duplicados');
        }
      }
      this.logger.error(`Error al crear impresora: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Error interno al crear la impresora',
      );
    }
  }

  async findAll() {
    try {
      const printers = await this.prisma.printers.findMany({
        orderBy: [{ area: 'asc' }, { is_default: 'desc' }, { name: 'asc' }],
      });

      return {
        success: true,
        message: 'Impresoras obtenidas exitosamente',
        data: printers,
      };
    } catch (error) {
      this.logger.error(`Error al obtener impresoras: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Error interno al obtener las impresoras',
      );
    }
  }

  async findByArea(area: area_preparacion) {
    const validAreas = Object.values(area_preparacion);

    if (!validAreas.includes(area)) {
      throw new BadRequestException(
        `Área inválida. Use: ${validAreas.join(', ')}`,
      );
    }

    try {
      const printers = await this.prisma.printers.findMany({
        where: { area },
        orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
      });

      return {
        success: true,
        message:
          printers.length > 0
            ? `Se encontraron ${printers.length} impresoras en el área ${area}`
            : `No hay impresoras registradas en el área ${area}`,
        data: printers,
        count: printers.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener impresoras del área ${area}: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener las impresoras del área',
      );
    }
  }

  async findOne(id: string) {
    try {
      const printer = await this.prisma.printers.findUnique({
        where: { id },
      });

      if (!printer) {
        throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
      }

      return {
        success: true,
        message: 'Impresora obtenida exitosamente',
        data: printer,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al obtener impresora: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Error interno al obtener la impresora',
      );
    }
  }

  async findDefaultByArea(area: area_preparacion) {
    const printer = await this.prisma.printers.findFirst({
      where: {
        area,
        is_default: true,
        is_active: true,
      },
    });

    return printer;
  }

  async update(id: string, updatePrinterDto: UpdatePrinterDto) {
    const existingPrinter = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!existingPrinter) {
      throw new NotFoundException('Impresora no encontrada');
    }

    const validAreas = Object.values(area_preparacion);
    if (updatePrinterDto.area && !validAreas.includes(updatePrinterDto.area)) {
      throw new BadRequestException(
        `Área inválida. Use: ${validAreas.join(', ')}`,
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        if (updatePrinterDto.is_default) {
          const areaToUpdate = updatePrinterDto.area || existingPrinter.area;

          await tx.printers.updateMany({
            where: {
              area: areaToUpdate,
              is_default: true,
              id: { not: id },
            },
            data: {
              is_default: false,
            },
          });
        }

        const printer = await tx.printers.update({
          where: { id },
          data: updatePrinterDto,
        });

        return printer;
      });

      return {
        success: true,
        message: 'Impresora actualizada exitosamente',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Error al actualizar impresora: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al actualizar la impresora',
      );
    }
  }

  async remove(id: string) {
    const printer = await this.prisma.printers.findUnique({
      where: { id },
      include: {
        _count: {
          select: { order_items: true },
        },
      },
    });

    if (!printer) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    if (printer._count.order_items > 0) {
      throw new ConflictException(
        `No se puede eliminar la impresora porque tiene ${printer._count.order_items} pedido(s) asociado(s)`,
      );
    }

    try {
      await this.prisma.printers.delete({
        where: { id },
      });

      return {
        success: true,
        message: `Impresora "${printer.name}" eliminada exitosamente`,
        data: null,
      };
    } catch (error) {
      this.logger.error(`Error al eliminar impresora: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Error interno al eliminar la impresora',
      );
    }
  }

  async printTest(id: string) {
    const printer = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!printer) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    if (!printer.is_active) {
      throw new BadRequestException('La impresora está inactiva');
    }

    console.log(
      `Imprimiendo página de prueba en impresora "${printer.name}" (ID: ${printer.id})...`,
    );

    return {
      printer_id: printer.id,
      printer_name: printer.name,
      success: true,
      message: 'Página de prueba enviada exitosamente',
      printed_at: new Date(),
    };
  }

  async toggleStatus(id: string, isActive: boolean) {
    const printer = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!printer) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    if (!isActive && printer.is_default) {
      const anotherPrinter = await this.prisma.printers.findFirst({
        where: {
          area: printer.area,
          is_active: true,
          id: { not: id },
        },
        orderBy: { created_at: 'asc' },
      });

      if (anotherPrinter) {
        await this.prisma.printers.update({
          where: { id: anotherPrinter.id },
          data: { is_default: true },
        });
      }
    }

    const updated = await this.prisma.printers.update({
      where: { id },
      data: { is_active: isActive },
    });

    return updated;
  }
}
