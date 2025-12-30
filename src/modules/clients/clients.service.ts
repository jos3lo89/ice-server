import {
  BadRequestException,
  ConflictException,
  Injectable,
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear un nuevo cliente
   */
  async create(createClientDto: CreateClientDto) {
    // Validar que no exista otro cliente con el mismo documento
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

    // Validaciones específicas por tipo de documento
    this.validateDocumentByType(
      createClientDto.tipo_documento,
      createClientDto.numero_documento,
    );

    try {
      const client = await this.prisma.clients.create({
        data: createClientDto,
      });

      return client;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un cliente con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  /**
   * Listar todos los clientes activos
   */
  async findAll() {
    const clients = await this.prisma.clients.findMany({
      where: { is_active: true },
      orderBy: [{ last_visit_at: 'desc' }, { razon_social: 'asc' }],
    });

    return clients;
  }

  /**
   * Buscar clientes por criterios
   */
  async search(searchDto: SearchClientDto) {
    const where: clientsWhereInput = {
      is_active: true,
      AND: [],
    };

    // Buscar por documento
    if (searchDto.documento) {
      (where.AND as clientsWhereInput[]).push({
        numero_documento: {
          contains: searchDto.documento,
        },
      });
    }

    // Filtrar por tipo de documento
    if (searchDto.tipo) {
      (where.AND as clientsWhereInput[]).push({
        tipo_documento: searchDto.tipo,
      });
    }

    // Buscar por nombre
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

    // Buscar por email
    if (searchDto.email) {
      (where.AND as clientsWhereInput[]).push({
        email: {
          contains: searchDto.email,
          mode: 'insensitive',
        },
      });
    }

    // Si no hay filtros, eliminar AND vacío
    if ((where.AND as any[]).length === 0) {
      delete where.AND;
    }

    const clients = await this.prisma.clients.findMany({
      where,
      orderBy: [{ last_visit_at: 'desc' }, { razon_social: 'asc' }],
      take: 50, // Limitar resultados
    });

    return clients;
  }

  /**
   * Buscar cliente por número de documento exacto
   */
  async findByDocument(documento: string) {
    const client = await this.prisma.clients.findFirst({
      where: {
        numero_documento: documento,
        is_active: true,
      },
    });

    return client;
  }

  /**
   * Obtener cliente por ID con estadísticas
   */
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

    // Calcular estadísticas
    const stats = await this.calculateClientStats(id);

    return {
      ...client,
      stats,
      recent_sales: client.sales,
    };
  }

  /**
   * Actualizar cliente
   */
  async update(id: string, updateClientDto: UpdateClientDto) {
    const existingClient = await this.prisma.clients.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado`);
    }

    try {
      const client = await this.prisma.clients.update({
        where: { id },
        data: updateClientDto,
      });

      return client;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un cliente con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  /**
   * Desactivar cliente (soft delete)
   */
  async remove(id: string): Promise<{ message: string }> {
    const client = await this.prisma.clients.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado`);
    }

    await this.prisma.clients.update({
      where: { id },
      data: { is_active: false },
    });

    return {
      message: `Cliente "${client.razon_social}" desactivado exitosamente`,
    };
  }

  /**
   * Actualizar estadísticas del cliente después de una venta
   */
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

  /**
   * Calcular estadísticas del cliente
   */
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

  /**
   * Validar documento según tipo
   */
  private validateDocumentByType(tipo: string, numero: string): void {
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
        // Validar que RUC empiece con 10, 15, 17 o 20
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
        // Sin validación específica
        break;

      default:
        throw new BadRequestException(`Tipo de documento "${tipo}" no válido`);
    }
  }

  /**
   * Obtener clientes frecuentes (top 10 por visitas)
   */
  async getFrequentClients() {
    const clients = await this.prisma.clients.findMany({
      where: {
        is_active: true,
        visit_count: { gt: 0 },
      },
      orderBy: [{ visit_count: 'desc' }, { total_purchases: 'desc' }],
      take: 10,
    });

    return clients;
  }

  /**
   * Obtener clientes VIP (top 10 por compras)
   */
  async getVIPClients() {
    const clients = await this.prisma.clients.findMany({
      where: {
        is_active: true,
        total_purchases: { gt: 0 },
      },
      orderBy: [{ total_purchases: 'desc' }, { visit_count: 'desc' }],
      take: 10,
    });

    return clients;
  }
}
