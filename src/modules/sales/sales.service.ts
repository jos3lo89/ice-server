import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { comprobante_type, estado_sunat } from 'src/generated/prisma/enums';
import { VoidSaleDto } from './dto/void-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { salesWhereInput } from 'src/generated/prisma/models';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar ventas con filtros
   */
  async findAll(queryDto: SalesQueryDto) {
    const where: salesWhereInput = {};

    // Filtros
    if (queryDto.tipo) {
      where.tipo_comprobante = queryDto.tipo;
    }

    if (queryDto.payment_method) {
      where.payment_method = queryDto.payment_method;
    }

    if (queryDto.estado_sunat) {
      where.estado_sunat = queryDto.estado_sunat;
    }

    if (queryDto.from || queryDto.to) {
      where.fecha_emision = {};
      if (queryDto.from) {
        where.fecha_emision.gte = new Date(queryDto.from);
      }
      if (queryDto.to) {
        const toDate = new Date(queryDto.to);
        toDate.setHours(23, 59, 59, 999);
        where.fecha_emision.lte = toDate;
      }
    }

    // Obtener ventas
    const sales = await this.prisma.sales.findMany({
      where,
      include: {
        client: {
          select: {
            razon_social: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        order: {
          select: {
            daily_number: true,
            table: {
              select: {
                number: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
      take: 100,
    });

    // Calcular resumen
    const count = sales.length;
    const total = sales.reduce(
      (sum, sale) => sum + Number(sale.precio_venta_total),
      0,
    );

    const byType: Record<string, number> = {
      TICKET: 0,
      BOLETA: 0,
      FACTURA: 0,
    };

    sales.forEach((sale) => {
      byType[sale.tipo_comprobante] += Number(sale.precio_venta_total);
    });

    return {
      sales: sales.map((sale) => ({
        id: sale.id,
        tipo_comprobante: sale.tipo_comprobante,
        numero_completo: sale.numero_completo,
        fecha_emision: sale.fecha_emision,
        client: sale.client?.razon_social || 'CLIENTE VARIOS',
        payment_method: sale.payment_method,
        subtotal: Number(sale.valor_venta),
        igv: Number(sale.monto_igv),
        total: Number(sale.precio_venta_total),
        estado_sunat: sale.estado_sunat,
        order_number: sale.order?.daily_number,
        table: sale.order
          ? `Mesa ${sale.order.table.number}${sale.order.table.name ? ` - ${sale.order.table.name}` : ''}`
          : undefined,
        cashier: sale.user.name,
      })),
      summary: {
        count,
        total: Number(total.toFixed(2)),
        by_type: {
          TICKET: Number(byType.TICKET.toFixed(2)),
          BOLETA: Number(byType.BOLETA.toFixed(2)),
          FACTURA: Number(byType.FACTURA.toFixed(2)),
        },
      },
    };
  }

  /**
   * Ventas del día
   */
  async findToday(queryDto: SalesQueryDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.findAll({
      ...queryDto,
      from: today.toISOString(),
      to: tomorrow.toISOString(),
    });
  }

  /**
   * Detalle de venta
   */
  async findOne(id: string) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      include: {
        client: true,
        user: {
          select: {
            name: true,
          },
        },
        payment: {
          select: {
            amount_received: true,
            change_given: true,
          },
        },
        order: {
          select: {
            daily_number: true,
            table: {
              select: {
                number: true,
                name: true,
                floor: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        sale_items: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada`);
    }

    return {
      id: sale.id,
      tipo_comprobante: sale.tipo_comprobante,
      serie: sale.serie,
      correlativo: sale.correlativo,
      numero_completo: sale.numero_completo,
      fecha_emision: sale.fecha_emision,
      client: {
        tipo_documento: sale.client?.tipo_documento || 'SIN_DOC',
        numero_documento: sale.client?.numero_documento || '00000000',
        razon_social: sale.client?.razon_social || 'CLIENTE VARIOS',
      },
      items: sale.sale_items.map((item) => ({
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.mto_precio_unitario),
        valor_venta: Number(item.mto_valor_venta),
        igv: Number(item.mto_igv),
        total: Number(item.mto_valor_venta) + Number(item.mto_igv),
      })),
      totals: {
        valor_venta: Number(sale.valor_venta),
        igv: Number(sale.monto_igv),
        total: Number(sale.precio_venta_total),
      },
      payment: {
        method: sale.payment_method,
        amount_received: sale.payment?.amount_received
          ? Number(sale.payment.amount_received)
          : undefined,
        change: sale.payment?.change_given
          ? Number(sale.payment.change_given)
          : undefined,
      },
      sunat: {
        estado: sale.estado_sunat,
        hash: sale.sunat_hash || undefined,
        code: sale.sunat_code || undefined,
        description: sale.sunat_description || undefined,
      },
      table: sale.order
        ? `Mesa ${sale.order.table.number}${sale.order.table.name ? ` - ${sale.order.table.name}` : ''} - ${sale.order.table.floor.name}`
        : undefined,
      order_number: sale.order?.daily_number,
      cashier: sale.user.name,
    };
  }

  /**
   * Generar venta desde pago (llamado desde PaymentsService)
   */
  async generateFromPayment(
    paymentId: string,
    documentType: comprobante_type,
    clientId: string | undefined,
    userId: string,
    cashRegisterId: string,
  ) {
    // Obtener pago con orden e items
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            order_items: {
              where: {
                payment_id: paymentId,
              },
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID "${paymentId}" no encontrado`);
    }

    // Obtener o crear cliente
    if (clientId) {
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Cliente con ID "${clientId}" no encontrado`,
        );
      }
    }

    // Obtener correlativo
    const serie = this.getSerieByType(documentType);
    const correlative = await this.getNextCorrelative(documentType, serie);

    // Calcular totales
    const items = payment.order.order_items;
    let montoGravado = 0;
    let montoIgv = 0;

    const saleItems = items.map((item) => {
      const lineTotal = Number(item.line_total);
      const valorVenta = lineTotal / 1.18; // Sin IGV
      const igv = lineTotal - valorVenta;

      montoGravado += valorVenta;
      montoIgv += igv;

      // Construir descripción con variantes
      let descripcion = item.product_name;
      if (item.variants_snapshot && Array.isArray(item.variants_snapshot)) {
        const variantesText = item.variants_snapshot
          .map((v: any) => v.option_name)
          .join(', ');
        if (variantesText) {
          descripcion += ` (${variantesText})`;
        }
      }

      return {
        order_item_id: item.id,
        product_id: item.product_id,
        codigo_producto: item.product.codigo_producto || null,
        descripcion,
        unidad_medida: item.product.unidad_medida,
        cantidad: item.quantity,
        mto_valor_unitario: valorVenta / item.quantity,
        mto_precio_unitario: lineTotal / item.quantity,
        mto_valor_venta: valorVenta,
        afectacion_igv: item.product.afectacion_igv,
        mto_base_igv: valorVenta,
        mto_igv: igv,
        total_impuestos: igv,
        variantes_descripcion:
          item.variants_snapshot && Array.isArray(item.variants_snapshot)
            ? item.variants_snapshot.map((v: any) => v.option_name).join(', ')
            : null,
      };
    });

    const precioVentaTotal = montoGravado + montoIgv;

    // Crear venta
    const sale = await this.prisma.sales.create({
      data: {
        tipo_comprobante: documentType,
        serie,
        correlativo: correlative,
        numero_completo: `${serie}-${String(correlative).padStart(8, '0')}`,
        fecha_emision: new Date(),
        order_id: payment.order_id,
        payment_id: paymentId,
        client_id: clientId || null,
        user_id: userId,
        cash_register_id: cashRegisterId,
        payment_method: payment.payment_method,
        monto_gravado: montoGravado,
        monto_igv: montoIgv,
        total_impuestos: montoIgv,
        valor_venta: montoGravado,
        precio_venta_total: precioVentaTotal,
        monto_pagado: Number(payment.amount),
        vuelto: payment.change_given ? Number(payment.change_given) : null,
        estado_sunat:
          documentType === comprobante_type.TICKET
            ? estado_sunat.NO_APLICA
            : estado_sunat.PENDIENTE,
        sale_items: {
          create: saleItems,
        },
      },
      include: {
        sale_items: true,
      },
    });

    // Actualizar correlativo
    await this.updateCorrelative(documentType, serie, correlative);

    // TODO: Si no es TICKET, enviar a SUNAT
    // if (documentType !== comprobante_type.TICKET) {
    //   await this.sendToSunat(sale.id);
    // }

    return sale;
  }

  /**
   * Obtener serie por tipo de documento
   */
  private getSerieByType(tipo: comprobante_type): string {
    const series = {
      TICKET: 'T001',
      BOLETA: 'B001',
      FACTURA: 'F001',
    };
    return series[tipo];
  }

  /**
   * Obtener siguiente correlativo
   */
  private async getNextCorrelative(
    tipo: string,
    serie: string,
  ): Promise<number> {
    const correlative = await this.prisma.correlatives.findUnique({
      where: {
        tipo_documento_serie: {
          tipo_documento: tipo === 'TICKET' ? 'TK' : tipo.substring(0, 2),
          serie,
        },
      },
    });

    if (!correlative) {
      // Crear si no existe
      await this.prisma.correlatives.create({
        data: {
          tipo_documento: tipo === 'TICKET' ? 'TK' : tipo.substring(0, 2),
          serie,
          correlativo_actual: 0,
        },
      });
      return 1;
    }

    return correlative.correlativo_actual + 1;
  }

  /**
   * Actualizar correlativo
   */
  private async updateCorrelative(
    tipo: string,
    serie: string,
    newCorrelative: number,
  ) {
    await this.prisma.correlatives.update({
      where: {
        tipo_documento_serie: {
          tipo_documento: tipo === 'TICKET' ? 'TK' : tipo.substring(0, 2),
          serie,
        },
      },
      data: {
        correlativo_actual: newCorrelative,
      },
    });
  }

  /**
   * Anular comprobante (genera nota de crédito)
   */
  async voidSale(id: string, userId: string, voidSaleDto: VoidSaleDto) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada`);
    }

    // Validar estado SUNAT
    if (sale.estado_sunat !== estado_sunat.ACEPTADO) {
      throw new BadRequestException(
        'Solo se pueden anular comprobantes ACEPTADOS por SUNAT',
      );
    }

    // Validar que no sea TICKET
    if (sale.tipo_comprobante === comprobante_type.TICKET) {
      throw new BadRequestException('Los tickets no requieren nota de crédito');
    }

    // Validar tiempo máximo (7 días)
    const daysSinceEmission = Math.floor(
      (Date.now() - sale.fecha_emision.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceEmission > 7) {
      throw new BadRequestException(
        'Solo se pueden anular comprobantes de hasta 7 días',
      );
    }

    // Validar que no tenga nota de crédito previa
    const existingCreditNote = await this.prisma.credit_notes.findFirst({
      where: { sale_id: id },
    });

    if (existingCreditNote) {
      throw new BadRequestException(
        'Este comprobante ya tiene una nota de crédito',
      );
    }

    if (!sale.client_id) {
      throw new BadRequestException('No se puede anular una venta sin cliente');
    }

    // Obtener items de la venta
    const saleItems = await this.prisma.sale_items.findMany({
      where: { sale_id: id },
    });

    // Obtener siguiente correlativo para NC
    const serie = 'NC01';
    const correlative = await this.getNextCorrelative('NC', serie);

    // Crear nota de crédito
    const creditNote = await this.prisma.credit_notes.create({
      data: {
        client_id: sale.client_id,
        user_id: userId,
        serie,
        correlativo: String(correlative).padStart(8, '0'),
        numero_completo: `${serie}-${String(correlative).padStart(8, '0')}`,
        fecha_emision: new Date(),
        sale_id: id,
        tipo_doc_ref: sale.tipo_comprobante.substring(0, 2),
        serie_ref: sale.serie,
        correlativo_ref: String(sale.correlativo).padStart(8, '0'),
        tipo_nota: voidSaleDto.tipo_nota,
        motivo: voidSaleDto.motivo,
        valor_venta: sale.valor_venta,
        monto_igv: sale.monto_igv,
        total_impuestos: sale.total_impuestos,
        mto_imp_venta: sale.precio_venta_total,
        estado_sunat: estado_sunat.PENDIENTE,
        credit_note_items: {
          create: saleItems.map((item) => ({
            product_id: item.product_id,
            cantidad: item.cantidad,
            unidad_medida: item.unidad_medida,
            descripcion: item.descripcion,
            mto_valor_unitario: item.mto_valor_unitario,
            mto_precio_unitario: item.mto_precio_unitario,
            mto_valor_venta: item.mto_valor_venta,
            afectacion_igv: item.afectacion_igv,
            mto_igv: item.mto_igv,
            total_impuestos: item.total_impuestos,
          })),
        },
      },
    });

    // Actualizar correlativo
    await this.updateCorrelative('NC', serie, correlative);

    // TODO: Enviar a SUNAT
    // await this.sendCreditNoteToSunat(creditNote.id);

    return {
      credit_note_id: creditNote.id,
      credit_note_number: creditNote.numero_completo,
      estado_sunat: creditNote.estado_sunat,
      message: 'Nota de crédito generada exitosamente',
    };
  }

  /**
   * Reenviar a SUNAT
   */
  async resendToSunat(id: string) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada`);
    }

    if (sale.tipo_comprobante === comprobante_type.TICKET) {
      throw new BadRequestException('Los tickets no se envían a SUNAT');
    }

    if (sale.estado_sunat === estado_sunat.ACEPTADO) {
      throw new BadRequestException(
        'Este comprobante ya fue ACEPTADO por SUNAT',
      );
    }

    // Actualizar estado
    await this.prisma.sales.update({
      where: { id },
      data: {
        estado_sunat: estado_sunat.ENVIANDO,
      },
    });

    // TODO: Implementar envío real a SUNAT
    // await this.sendToSunat(id);

    return {
      estado: estado_sunat.ENVIANDO,
      message: 'Comprobante reenviado a SUNAT',
    };
  }

  /**
   * Obtener PDF del comprobante
   */
  async getPdf(id: string): Promise<string> {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      select: { pdf_path: true },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada`);
    }

    if (!sale.pdf_path) {
      throw new NotFoundException('El PDF no está disponible');
    }

    return sale.pdf_path;
  }

  /**
   * Obtener XML del comprobante
   */
  async getXml(id: string): Promise<string> {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      select: { xml_path: true, tipo_comprobante: true },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada`);
    }

    if (sale.tipo_comprobante === comprobante_type.TICKET) {
      throw new BadRequestException('Los tickets no tienen XML');
    }

    if (!sale.xml_path) {
      throw new NotFoundException('El XML no está disponible');
    }

    return sale.xml_path;
  }
}
