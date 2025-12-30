import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { PrinterService } from './printer.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Injectable()
export class PrintersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printerService: PrinterService,
  ) {}

  /**
   * Crear una nueva impresora
   */
  async create(createPrinterDto: CreatePrinterDto) {
    // Si se marca como predeterminada, desactivar otras del mismo área
    if (createPrinterDto.is_default) {
      await this.prisma.printers.updateMany({
        where: {
          area: createPrinterDto.area,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    const printer = await this.prisma.printers.create({
      data: createPrinterDto,
    });

    return printer;
  }

  /**
   * Listar todas las impresoras
   */
  async findAll() {
    const printers = await this.prisma.printers.findMany({
      orderBy: [{ area: 'asc' }, { is_default: 'desc' }, { name: 'asc' }],
    });

    // Verificar estado de cada impresora
    const printersWithStatus = await Promise.all(
      printers.map(async (printer) => {
        const status = await this.printerService.checkPrinterStatus(printer);
        return {
          ...printer,
          status,
        };
      }),
    );

    return printersWithStatus;
  }

  /**
   * Listar impresoras por área
   */
  async findByArea(area: area_preparacion) {
    const printers = await this.prisma.printers.findMany({
      where: { area },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    if (printers.length === 0) {
      throw new NotFoundException(
        `No se encontraron impresoras para el área "${area}"`,
      );
    }

    const printersWithStatus = await Promise.all(
      printers.map(async (printer) => {
        const status = await this.printerService.checkPrinterStatus(printer);
        return {
          ...printer,
          status,
        };
      }),
    );

    return printersWithStatus;
  }

  /**
   * Obtener impresora por ID
   */
  async findOne(id: string) {
    const printer = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!printer) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    return printer;
  }

  /**
   * Obtener impresora predeterminada por área
   */
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

  /**
   * Actualizar impresora
   */
  async update(id: string, updatePrinterDto: UpdatePrinterDto) {
    const existingPrinter = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!existingPrinter) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    // Si se marca como predeterminada, desactivar otras del mismo área
    if (updatePrinterDto.is_default) {
      const areaToUpdate = updatePrinterDto.area || existingPrinter.area;

      await this.prisma.printers.updateMany({
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

    const printer = await this.prisma.printers.update({
      where: { id },
      data: updatePrinterDto,
    });

    return printer;
  }

  /**
   * Imprimir página de prueba
   */
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

    // Imprimir prueba
    const success = await this.printerService.printTest(printer);

    if (!success) {
      throw new BadRequestException('Error al imprimir la página de prueba');
    }

    return {
      printer_id: printer.id,
      printer_name: printer.name,
      success: true,
      message: 'Página de prueba enviada exitosamente',
      printed_at: new Date(),
    };
  }

  /**
   * Eliminar impresora
   */
  async remove(id: string): Promise<{ message: string }> {
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

    // Validar que no tenga order_items asociados
    if (printer._count.order_items > 0) {
      throw new ConflictException(
        `No se puede eliminar la impresora porque tiene ${printer._count.order_items} pedido(s) asociado(s)`,
      );
    }

    await this.prisma.printers.delete({
      where: { id },
    });

    return {
      message: `Impresora "${printer.name}" eliminada exitosamente`,
    };
  }

  /**
   * Activar/Desactivar impresora
   */
  async toggleStatus(id: string, isActive: boolean) {
    const printer = await this.prisma.printers.findUnique({
      where: { id },
    });

    if (!printer) {
      throw new NotFoundException(`Impresora con ID "${id}" no encontrada`);
    }

    // Si se desactiva y era la predeterminada, buscar otra del área para marcarla
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
