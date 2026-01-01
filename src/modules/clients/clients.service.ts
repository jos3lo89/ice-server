import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import {
  clientsWhereInput,
  PrismaClientKnownRequestError,
} from 'src/generated/prisma/internal/prismaNamespace';
import { SearchClientDto } from './dto/search-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    const existingClient = await this.prisma.clients.findFirst({
      where: {
        tipo_documento: createClientDto.tipo_documento,
        numero_documento: createClientDto.numero_documento,
      },
    });

    if (existingClient) {
      throw new ConflictException(
        `Ya existe un cliente con ${createClientDto.tipo_documento}: ${createClientDto.numero_documento}`,
      );
    }

    this.validateDocumentByType(
      createClientDto.tipo_documento,
      createClientDto.numero_documento,
    );

    try {
      const client = await this.prisma.clients.create({
        data: createClientDto,
      });

      return {
        success: true,
        message: 'Cliente creado exitosamente',
        data: client,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un cliente con estos datos únicos',
          );
        }
      }

      this.logger.error('Error al crear cliente', error);
      throw new InternalServerErrorException('Error interno al crear cliente');
    }
  }

  async findAll() {
    try {
      const clients = await this.prisma.clients.findMany({
        where: { is_active: true },
        orderBy: [{ last_visit_at: 'desc' }, { razon_social: 'asc' }],
      });

      return {
        success: true,
        message: 'Clientes obtenidos exitosamente',
        data: clients.map((c) => ({
          ...c,
          total_purchases: Number(c.total_purchases),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener clientes', error);
      throw new InternalServerErrorException(
        'Error interno al obtener clientes',
      );
    }
  }

  async search(searchDto: SearchClientDto) {
    const where: clientsWhereInput = {
      is_active: true,
      AND: [],
    };

    if (searchDto.documento) {
      (where.AND as clientsWhereInput[]).push({
        numero_documento: {
          contains: searchDto.documento,
        },
      });
    }

    if (searchDto.tipo) {
      (where.AND as clientsWhereInput[]).push({
        tipo_documento: searchDto.tipo,
      });
    }

    if (searchDto.nombre) {
      (where.AND as clientsWhereInput[]).push({
        OR: [
          {
            razon_social: {
              contains: searchDto.nombre,
              mode: 'insensitive',
            },
          },
          {
            nombre_comercial: {
              contains: searchDto.nombre,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (searchDto.email) {
      (where.AND as clientsWhereInput[]).push({
        email: {
          contains: searchDto.email,
          mode: 'insensitive',
        },
      });
    }

    if ((where.AND as any[]).length === 0) {
      delete where.AND;
    }

    try {
      const clients = await this.prisma.clients.findMany({
        where,
        orderBy: [{ last_visit_at: 'desc' }, { razon_social: 'asc' }],
        take: 50,
      });

      return {
        success: true,
        message: 'Resultados de búsqueda obtenidos exitosamente',
        data: clients.map((c) => ({
          ...c,
          total_purchases: Number(c.total_purchases),
        })),
      };
    } catch (error) {
      this.logger.error('Error al buscar clientes', error);
      throw new InternalServerErrorException(
        'Error interno al buscar clientes',
      );
    }
  }

  async getFrequentClients() {
    try {
      const clients = await this.prisma.clients.findMany({
        where: {
          is_active: true,
          visit_count: { gt: 0 },
        },
        orderBy: [{ visit_count: 'desc' }, { total_purchases: 'desc' }],
        take: 10,
      });

      return {
        success: true,
        message: 'Clientes frecuentes obtenidos exitosamente',
        data: clients.map((c) => ({
          ...c,
          total_purchases: Number(c.total_purchases),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener clientes frecuentes', error);
      throw new InternalServerErrorException(
        'Error interno al obtener clientes frecuentes',
      );
    }
  }

  async getVIPClients() {
    try {
      const clients = await this.prisma.clients.findMany({
        where: {
          is_active: true,
          total_purchases: { gt: 0 },
        },
        orderBy: [{ total_purchases: 'desc' }, { visit_count: 'desc' }],
        take: 10,
      });

      return {
        success: true,
        message: 'Clientes VIP obtenidos exitosamente',
        data: clients.map((c) => ({
          ...c,
          total_purchases: Number(c.total_purchases),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener clientes VIP', error);
      throw new InternalServerErrorException(
        'Error interno al obtener clientes VIP',
      );
    }
  }

  async findOne(id: string) {
    const client = await this.prisma.clients.findUnique({
      where: { id },
      include: {
        sales: {
          select: {
            id: true,
            numero_completo: true,
            fecha_emision: true,
            precio_venta_total: true,
            tipo_comprobante: true,
          },
          orderBy: { fecha_emision: 'desc' },
          take: 10, // Últimas 10 ventas
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado`);
    }

    const stats = await this.calculateClientStats(id);

    return {
      success: true,
      message: 'Detalle del cliente obtenido exitosamente',
      data: {
        ...client,
        stats,
        recent_sales: client.sales,
      },
    };
  }

  async findByDocument(documento: string) {
    const client = await this.prisma.clients.findFirst({
      where: {
        numero_documento: documento,
        is_active: true,
      },
    });

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const existingClient = await this.prisma.clients.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException('Cliente no encontrado');
    }

    try {
      const client = await this.prisma.clients.update({
        where: { id },
        data: updateClientDto,
      });

      return {
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: {
          ...client,
          total_purchases: Number(client.total_purchases),
        },
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un cliente con estos datos únicos',
          );
        }
      }
      this.logger.error('Error al actualizar cliente', error);
      throw new InternalServerErrorException(
        'Error interno al actualizar cliente',
      );
    }
  }

  async remove(id: string) {
    const client = await this.prisma.clients.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    try {
      await this.prisma.clients.update({
        where: { id },
        data: { is_active: false },
      });

      return {
        success: true,
        message: `Cliente "${client.razon_social}" desactivado exitosamente`,
        data: null,
      };
    } catch (error) {
      this.logger.error('Error al desactivar cliente', error);
      throw new InternalServerErrorException(
        'Error interno al desactivar cliente',
      );
    }
  }

  async updateStats(clientId: string, amount: number): Promise<void> {
    const client = await this.prisma.clients.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return;
    }

    await this.prisma.clients.update({
      where: { id: clientId },
      data: {
        total_purchases: {
          increment: amount,
        },
        visit_count: {
          increment: 1,
        },
        last_visit_at: new Date(),
      },
    });
  }

  private async calculateClientStats(clientId: string) {
    const sales = await this.prisma.sales.findMany({
      where: { client_id: clientId },
      select: {
        precio_venta_total: true,
        tipo_comprobante: true,
        fecha_emision: true,
      },
      orderBy: { fecha_emision: 'asc' },
    });

    const totalSales = sales.length;
    const totalSpent = sales.reduce(
      (sum, sale) => sum + Number(sale.precio_venta_total),
      0,
    );
    const averageTicket = totalSales > 0 ? totalSpent / totalSales : 0;

    // Agrupar por tipo de comprobante
    const salesByType = sales.reduce(
      (acc, sale) => {
        const tipo = sale.tipo_comprobante;
        if (!acc[tipo]) {
          acc[tipo] = { count: 0, total: 0 };
        }
        acc[tipo].count++;
        acc[tipo].total += Number(sale.precio_venta_total);
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    const salesByTypeArray = Object.entries(salesByType).map(
      ([tipo, data]) => ({
        tipo,
        count: data.count,
        total: data.total,
      }),
    );

    return {
      total_spent: totalSpent,
      total_visits: totalSales,
      average_ticket: averageTicket,
      first_visit: sales.length > 0 ? sales[0].fecha_emision : undefined,
      last_visit:
        sales.length > 0 ? sales[sales.length - 1].fecha_emision : undefined,
      total_sales: totalSales,
      sales_by_type: salesByTypeArray,
    };
  }

  private validateDocumentByType(tipo: string, numero: string) {
    switch (tipo) {
      case 'DNI':
        if (!/^\d{8}$/.test(numero)) {
          throw new BadRequestException(
            'DNI debe tener exactamente 8 dígitos numéricos',
          );
        }
        break;

      case 'RUC':
        if (!/^\d{11}$/.test(numero)) {
          throw new BadRequestException(
            'RUC debe tener exactamente 11 dígitos numéricos',
          );
        }
        // vailidar que RUC empiece con 10, 15, 17 o 20
        const firstTwo = numero.substring(0, 2);
        if (!['10', '15', '17', '20'].includes(firstTwo)) {
          throw new BadRequestException(
            'RUC debe empezar con 10, 15, 17 o 20 según el tipo de contribuyente',
          );
        }
        break;

      case 'CARNET_EXT':
        if (numero.length < 9 || numero.length > 12) {
          throw new BadRequestException(
            'Carnet de extranjería debe tener entre 9 y 12 caracteres',
          );
        }
        break;

      case 'PASAPORTE':
        if (numero.length < 8 || numero.length > 12) {
          throw new BadRequestException(
            'Pasaporte debe tener entre 8 y 12 caracteres',
          );
        }
        break;

      case 'SIN_DOC':
        break;

      default:
        throw new BadRequestException(`Tipo de documento "${tipo}" no válido`);
    }
  }
}
