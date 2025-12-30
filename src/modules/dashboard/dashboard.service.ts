import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
  cash_register_status,
  order_item_status,
  order_status,
  table_status,
} from 'src/generated/prisma/enums';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resumen general del dashboard
   */
  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Ventas de hoy
    const salesToday = await this.prisma.sales.aggregate({
      where: {
        fecha_emision: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        precio_venta_total: true,
      },
      _count: true,
    });

    // Órdenes de hoy
    const ordersToday = await this.prisma.orders.count({
      where: {
        order_date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Total de comensales hoy
    const dinersToday = await this.prisma.orders.aggregate({
      where: {
        order_date: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        diners_count: true,
      },
    });

    // Órdenes activas
    const activeOrders = await this.prisma.orders.count({
      where: {
        status: {
          in: [order_status.ABIERTA, order_status.CERRADA],
        },
      },
    });

    // Mesas ocupadas
    const tablesOccupied = await this.prisma.tables.count({
      where: {
        status: table_status.OCUPADA,
      },
    });

    // Total de mesas
    const tablesTotal = await this.prisma.tables.count({
      where: {
        is_active: true,
      },
    });

    // Items pendientes
    const pendingItems = await this.prisma.order_items.count({
      where: {
        status: {
          in: [order_item_status.PENDIENTE, order_item_status.ENVIADO],
        },
        is_cancelled: false,
      },
    });

    // Cajas abiertas
    const openCashRegisters = await this.prisma.cash_registers.count({
      where: {
        status: cash_register_status.ABIERTA,
      },
    });

    // Total en cajas
    const cashInRegisters = await this.prisma.cash_registers.aggregate({
      where: {
        status: cash_register_status.ABIERTA,
      },
      _sum: {
        expected_amount: true,
      },
    });

    // Ventas de ayer
    const salesYesterday = await this.prisma.sales.aggregate({
      where: {
        fecha_emision: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: {
        precio_venta_total: true,
      },
    });

    // Ventas de la semana pasada
    const salesLastWeek = await this.prisma.sales.aggregate({
      where: {
        fecha_emision: {
          gte: lastWeek,
          lt: today,
        },
      },
      _sum: {
        precio_venta_total: true,
      },
    });

    // Calcular promedios y comparaciones
    const salesTotalToday = Number(salesToday._sum.precio_venta_total || 0);
    const salesCountToday = salesToday._count;
    const averageTicket =
      salesCountToday > 0 ? salesTotalToday / salesCountToday : 0;

    const salesTotalYesterday = Number(
      salesYesterday._sum.precio_venta_total || 0,
    );
    const salesTotalLastWeek = Number(
      salesLastWeek._sum.precio_venta_total || 0,
    );

    const vsYesterday =
      salesTotalYesterday > 0
        ? ((salesTotalToday - salesTotalYesterday) / salesTotalYesterday) * 100
        : 0;

    const vsLastWeek =
      salesTotalLastWeek > 0
        ? ((salesTotalToday - salesTotalLastWeek) / salesTotalLastWeek) * 100
        : 0;

    return {
      today: {
        sales_total: Number(salesTotalToday.toFixed(2)),
        sales_count: salesCountToday,
        orders_count: ordersToday,
        average_ticket: Number(averageTicket.toFixed(2)),
        diners_total: dinersToday._sum.diners_count || 0,
      },
      active: {
        orders: activeOrders,
        tables_occupied: tablesOccupied,
        tables_total: tablesTotal,
        pending_items: pendingItems,
      },
      cash_registers: {
        open: openCashRegisters,
        total_in_registers: Number(
          (cashInRegisters._sum.expected_amount || 0).toFixed(2),
        ),
      },
      comparison: {
        vs_yesterday: `${vsYesterday >= 0 ? '+' : ''}${vsYesterday.toFixed(1)}%`,
        vs_last_week: `${vsLastWeek >= 0 ? '+' : ''}${vsLastWeek.toFixed(1)}%`,
      },
    };
  }

  /**
   * Ventas del día con detalle
   */
  async getSalesToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await this.prisma.sales.findMany({
      where: {
        fecha_emision: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        payment: {
          select: {
            payment_method: true,
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
      take: 50,
    });

    // Agrupar por método de pago
    const byPaymentMethod: Record<string, { count: number; total: number }> =
      {};

    sales.forEach((sale) => {
      const method = sale.payment_method;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += Number(sale.precio_venta_total);
    });

    // Agrupar por tipo de comprobante
    const byDocumentType: Record<string, { count: number; total: number }> = {};

    sales.forEach((sale) => {
      const type = sale.tipo_comprobante;
      if (!byDocumentType[type]) {
        byDocumentType[type] = { count: 0, total: 0 };
      }
      byDocumentType[type].count++;
      byDocumentType[type].total += Number(sale.precio_venta_total);
    });

    // Totales
    const totalAmount = sales.reduce(
      (sum, sale) => sum + Number(sale.precio_venta_total),
      0,
    );

    return {
      sales: sales.map((sale) => ({
        id: sale.id,
        numero_completo: sale.numero_completo,
        tipo_comprobante: sale.tipo_comprobante,
        fecha_emision: sale.fecha_emision,
        total: Number(sale.precio_venta_total),
        payment_method: sale.payment_method,
        estado_sunat: sale.estado_sunat,
        cashier: sale.user.name,
      })),
      summary: {
        total_amount: Number(totalAmount.toFixed(2)),
        total_count: sales.length,
        by_payment_method: Object.entries(byPaymentMethod).map(
          ([method, data]) => ({
            method,
            count: data.count,
            total: Number(data.total.toFixed(2)),
          }),
        ),
        by_document_type: Object.entries(byDocumentType).map(
          ([type, data]) => ({
            type,
            count: data.count,
            total: Number(data.total.toFixed(2)),
          }),
        ),
      },
    };
  }

  /**
   * Órdenes activas
   */
  async getActiveOrders() {
    const orders = await this.prisma.orders.findMany({
      where: {
        status: {
          in: [order_status.ABIERTA, order_status.CERRADA],
        },
      },
      include: {
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
        user: {
          select: {
            name: true,
          },
        },
        order_items: {
          where: {
            is_cancelled: false,
          },
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return orders.map((order) => {
      const pendingItems = order.order_items.filter(
        (item) => item.status === order_item_status.PENDIENTE,
      ).length;

      const inProgressItems = order.order_items.filter(
        (item) =>
          item.status === order_item_status.ENVIADO ||
          item.status === order_item_status.EN_PREPARACION,
      ).length;

      const readyItems = order.order_items.filter(
        (item) => item.status === order_item_status.LISTO,
      ).length;

      return {
        id: order.id,
        daily_number: order.daily_number,
        table: `Mesa ${order.table.number}${order.table.name ? ` - ${order.table.name}` : ''} - ${order.table.floor.name}`,
        status: order.status,
        diners_count: order.diners_count,
        subtotal: Number(order.subtotal),
        total_pending: Number(order.total_pending),
        waiter: order.user.name,
        created_at: order.created_at,
        items_summary: {
          total: order.order_items.length,
          pending: pendingItems,
          in_progress: inProgressItems,
          ready: readyItems,
        },
      };
    });
  }

  /**
   * Estado de todas las mesas
   */
  async getTablesStatus() {
    const tables = await this.prisma.tables.findMany({
      where: {
        is_active: true,
      },
      include: {
        floor: {
          select: {
            name: true,
            level: true,
          },
        },
        orders: {
          where: {
            status: {
              in: [order_status.ABIERTA, order_status.CERRADA],
            },
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [{ floor: { level: 'asc' } }, { number: 'asc' }],
    });

    // Agrupar por piso
    const byFloor: Record<string, typeof tables> = {};

    tables.forEach((table) => {
      const floorName = table.floor.name;
      if (!byFloor[floorName]) {
        byFloor[floorName] = [];
      }
      byFloor[floorName].push(table);
    });

    return {
      tables: tables.map((table) => ({
        id: table.id,
        number: table.number,
        name: table.name,
        floor: table.floor.name,
        capacity: table.capacity,
        status: table.status,
        current_order: table.orders[0]
          ? {
              id: table.orders[0].id,
              daily_number: table.orders[0].daily_number,
              diners_count: table.orders[0].diners_count,
              subtotal: Number(table.orders[0].subtotal),
              waiter: table.orders[0].user.name,
              created_at: table.orders[0].created_at,
            }
          : null,
      })),
      summary: {
        total: tables.length,
        libre: tables.filter((t) => t.status === table_status.LIBRE).length,
        ocupada: tables.filter((t) => t.status === table_status.OCUPADA).length,
        reservada: tables.filter((t) => t.status === table_status.RESERVADA)
          .length,
        limpieza: tables.filter((t) => t.status === table_status.LIMPIEZA)
          .length,
        by_floor: Object.entries(byFloor).map(([floorName, floorTables]) => ({
          floor: floorName,
          total: floorTables.length,
          libre: floorTables.filter((t) => t.status === table_status.LIBRE)
            .length,
          ocupada: floorTables.filter((t) => t.status === table_status.OCUPADA)
            .length,
        })),
      },
    };
  }

  /**
   * Productos más vendidos
   */
  async getTopProducts(limit = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener items vendidos en los últimos 30 días
    const topProducts = await this.prisma.sale_items.groupBy({
      by: ['product_id'],
      where: {
        sale: {
          fecha_emision: {
            gte: thirtyDaysAgo,
          },
        },
        product_id: {
          not: null,
        },
      },
      _sum: {
        cantidad: true,
        mto_valor_venta: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          cantidad: 'desc',
        },
      },
      take: limit,
    });

    // Obtener detalles de los productos
    const productIds = topProducts
      .map((item) => item.product_id)
      .filter((id): id is string => id !== null);

    const products = await this.prisma.products.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    // Crear mapa de productos
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return topProducts
      .map((item) => {
        const product = item.product_id
          ? productsMap.get(item.product_id)
          : null;
        if (!product) return null;

        return {
          product_id: item.product_id,
          product_name: product.name,
          category: product.category.name,
          quantity_sold: Number(item._sum.cantidad || 0),
          revenue: Number((item._sum.mto_valor_venta || 0).toFixed(2)),
          orders_count: item._count.id,
          average_price: Number(product.price),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
