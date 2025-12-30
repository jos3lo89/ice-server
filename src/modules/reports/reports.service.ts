import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
  GroupByPeriod,
  SalesReportQueryDto,
} from './dto/sales-report-query.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de ventas
   */
  async getSalesReport(queryDto: SalesReportQueryDto) {
    // Fechas por defecto: últimos 30 días
    const to = queryDto.to ? new Date(queryDto.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const from = queryDto.from
      ? new Date(queryDto.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    // Obtener todas las ventas del período
    const sales = await this.prisma.sales.findMany({
      where: {
        fecha_emision: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        fecha_emision: true,
        tipo_comprobante: true,
        payment_method: true,
        precio_venta_total: true,
        valor_venta: true,
        monto_igv: true,
      },
      orderBy: {
        fecha_emision: 'asc',
      },
    });

    // Calcular totales
    const grossSales = sales.reduce(
      (sum, sale) => sum + Number(sale.precio_venta_total),
      0,
    );
    const netSales = sales.reduce(
      (sum, sale) => sum + Number(sale.valor_venta),
      0,
    );
    const totalIgv = sales.reduce(
      (sum, sale) => sum + Number(sale.monto_igv),
      0,
    );
    const discounts = 0; // TODO: Implementar descuentos cuando existan

    // Agrupar por período
    const byPeriod = this.groupByPeriod(
      sales,
      queryDto.groupBy || GroupByPeriod.DAY,
    );

    // Agrupar por método de pago
    const byPaymentMethod: Record<string, number> = {};
    sales.forEach((sale) => {
      const method = sale.payment_method;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = 0;
      }
      byPaymentMethod[method] += Number(sale.precio_venta_total);
    });

    // Agrupar por tipo de comprobante
    const byDocumentType: Record<string, number> = {};
    sales.forEach((sale) => {
      const type = sale.tipo_comprobante;
      if (!byDocumentType[type]) {
        byDocumentType[type] = 0;
      }
      byDocumentType[type] += Number(sale.precio_venta_total);
    });

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      totals: {
        gross_sales: Number(grossSales.toFixed(2)),
        discounts: Number(discounts.toFixed(2)),
        net_sales: Number(netSales.toFixed(2)),
        igv: Number(totalIgv.toFixed(2)),
        transactions: sales.length,
      },
      by_period: byPeriod,
      by_payment_method: Object.fromEntries(
        Object.entries(byPaymentMethod).map(([key, value]) => [
          key,
          Number(value.toFixed(2)),
        ]),
      ),
      by_document_type: Object.fromEntries(
        Object.entries(byDocumentType).map(([key, value]) => [
          key,
          Number(value.toFixed(2)),
        ]),
      ),
    };
  }

  /**
   * Reporte de productos vendidos
   */
  async getProductsReport(queryDto: ReportQueryDto) {
    const to = queryDto.to ? new Date(queryDto.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const from = queryDto.from
      ? new Date(queryDto.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    // Agrupar items vendidos
    const productSales = await this.prisma.sale_items.groupBy({
      by: ['product_id'],
      where: {
        sale: {
          fecha_emision: {
            gte: from,
            lte: to,
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
    });

    // Obtener detalles de productos
    const productIds = productSales
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
        cost: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const productsMap = new Map(products.map((p) => [p.id, p]));

    // Calcular totales
    const totalRevenue = productSales.reduce(
      (sum, item) => sum + Number(item._sum.mto_valor_venta || 0),
      0,
    );
    const totalQuantity = productSales.reduce(
      (sum, item) => sum + Number(item._sum.cantidad || 0),
      0,
    );

    const productsList = productSales
      .map((item) => {
        const product = item.product_id
          ? productsMap.get(item.product_id)
          : null;
        if (!product) return null;

        const quantity = Number(item._sum.cantidad || 0);
        const revenue = Number(item._sum.mto_valor_venta || 0);
        const cost = Number(product.cost) * quantity;
        const profit = revenue - cost;

        return {
          product_id: item.product_id,
          product_name: product.name,
          category: product.category.name,
          quantity_sold: quantity,
          revenue: Number(revenue.toFixed(2)),
          cost: Number(cost.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          profit_margin:
            revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
          orders_count: item._count.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Agrupar por categoría
    const byCategory: Record<
      string,
      { revenue: number; quantity: number; count: number }
    > = {};
    productsList.forEach((item) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { revenue: 0, quantity: 0, count: 0 };
      }
      byCategory[item.category].revenue += item.revenue;
      byCategory[item.category].quantity += item.quantity_sold;
      byCategory[item.category].count += 1;
    });

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      totals: {
        total_revenue: Number(totalRevenue.toFixed(2)),
        total_quantity: totalQuantity,
        products_count: productsList.length,
      },
      products: productsList,
      by_category: Object.entries(byCategory).map(([category, data]) => ({
        category,
        revenue: Number(data.revenue.toFixed(2)),
        quantity: data.quantity,
        products_count: data.count,
      })),
    };
  }

  /**
   * Reporte por meseros
   */
  async getWaitersReport(queryDto: ReportQueryDto) {
    const to = queryDto.to ? new Date(queryDto.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const from = queryDto.from
      ? new Date(queryDto.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    // Obtener órdenes del período
    const orders = await this.prisma.orders.findMany({
      where: {
        created_at: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        user_id: true,
        subtotal: true,
        diners_count: true,
        status: true,
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Agrupar por mesero
    const byWaiter: Record<
      string,
      {
        name: string;
        orders: number;
        total_sales: number;
        total_diners: number;
        average_ticket: number;
      }
    > = {};

    orders.forEach((order) => {
      const userId = order.user_id;
      if (!byWaiter[userId]) {
        byWaiter[userId] = {
          name: order.user.name,
          orders: 0,
          total_sales: 0,
          total_diners: 0,
          average_ticket: 0,
        };
      }
      byWaiter[userId].orders += 1;
      byWaiter[userId].total_sales += Number(order.subtotal);
      byWaiter[userId].total_diners += order.diners_count;
    });

    // Calcular promedios
    Object.values(byWaiter).forEach((waiter) => {
      waiter.average_ticket =
        waiter.orders > 0 ? waiter.total_sales / waiter.orders : 0;
      waiter.total_sales = Number(waiter.total_sales.toFixed(2));
      waiter.average_ticket = Number(waiter.average_ticket.toFixed(2));
    });

    const waitersList = Object.entries(byWaiter).map(([userId, data]) => ({
      user_id: userId,
      ...data,
    }));

    // Ordenar por ventas totales
    waitersList.sort((a, b) => b.total_sales - a.total_sales);

    const totalSales = waitersList.reduce((sum, w) => sum + w.total_sales, 0);
    const totalOrders = waitersList.reduce((sum, w) => sum + w.orders, 0);

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      totals: {
        total_sales: Number(totalSales.toFixed(2)),
        total_orders: totalOrders,
        waiters_count: waitersList.length,
      },
      waiters: waitersList,
    };
  }

  /**
   * Agrupar ventas por período
   */
  private groupByPeriod(
    sales: Array<{
      fecha_emision: Date;
      precio_venta_total: unknown;
    }>,
    groupBy: GroupByPeriod,
  ) {
    const grouped: Record<string, { sales: number; count: number }> = {};

    sales.forEach((sale) => {
      const date = new Date(sale.fecha_emision);
      let key: string;

      if (groupBy === GroupByPeriod.DAY) {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === GroupByPeriod.WEEK) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        // MONTH
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { sales: 0, count: 0 };
      }
      grouped[key].sales += Number(sale.precio_venta_total);
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        sales: Number(data.sales.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.period.localeCompare(a.period));
  }

  /**
   * Reporte de cajas registradoras
   */
  async getCashRegistersReport(queryDto: ReportQueryDto) {
    const to = queryDto.to ? new Date(queryDto.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const from = queryDto.from
      ? new Date(queryDto.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    // Obtener cajas del período
    const cashRegisters = await this.prisma.cash_registers.findMany({
      where: {
        open_time: {
          gte: from,
          lte: to,
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
        open_time: 'desc',
      },
    });

    const registers = cashRegisters.map((register) => {
      const initialAmount = Number(register.initial_amount);
      const totalSales = Number(register.total_sales);
      const totalIncome = Number(register.total_income);
      const totalExpense = Number(register.total_expense);
      const expectedAmount = Number(register.expected_amount);
      const finalAmount = register.final_amount
        ? Number(register.final_amount)
        : null;
      const difference = register.difference
        ? Number(register.difference)
        : null;

      return {
        id: register.id,
        cashier: register.user.name,
        open_time: register.open_time,
        close_time: register.close_time,
        status: register.status,
        initial_amount: initialAmount,
        total_sales: totalSales,
        total_income: totalIncome,
        total_expense: totalExpense,
        expected_amount: expectedAmount,
        final_amount: finalAmount,
        difference: difference,
      };
    });

    // Calcular totales
    const totalSales = registers.reduce((sum, r) => sum + r.total_sales, 0);
    const totalIncome = registers.reduce((sum, r) => sum + r.total_income, 0);
    const totalExpense = registers.reduce((sum, r) => sum + r.total_expense, 0);
    const totalDifference = registers.reduce(
      (sum, r) => sum + (r.difference || 0),
      0,
    );

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      totals: {
        total_sales: Number(totalSales.toFixed(2)),
        total_income: Number(totalIncome.toFixed(2)),
        total_expense: Number(totalExpense.toFixed(2)),
        total_difference: Number(totalDifference.toFixed(2)),
        registers_count: registers.length,
        closed_registers: registers.filter((r) => r.status === 'CERRADA')
          .length,
      },
      registers,
    };
  }

  /**
   * Reporte de cierre diario
   */
  async getDailyCloseReport(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Ventas del día
    const sales = await this.prisma.sales.findMany({
      where: {
        fecha_emision: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      select: {
        tipo_comprobante: true,
        payment_method: true,
        precio_venta_total: true,
        valor_venta: true,
        monto_igv: true,
      },
    });

    // Órdenes del día
    const orders = await this.prisma.orders.findMany({
      where: {
        order_date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      select: {
        status: true,
        diners_count: true,
        subtotal: true,
      },
    });

    // Cajas del día
    const cashRegisters = await this.prisma.cash_registers.findMany({
      where: {
        open_time: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      select: {
        initial_amount: true,
        total_sales: true,
        total_income: true,
        total_expense: true,
        expected_amount: true,
        final_amount: true,
        difference: true,
        status: true,
      },
    });

    // Productos vendidos
    const productSales = await this.prisma.sale_items.groupBy({
      by: ['product_id'],
      where: {
        sale: {
          fecha_emision: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        product_id: {
          not: null,
        },
      },
      _sum: {
        cantidad: true,
      },
      orderBy: {
        _sum: {
          cantidad: 'desc',
        },
      },
      take: 10,
    });

    const productIds = productSales
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
      },
    });

    const productsMap = new Map(products.map((p) => [p.id, p]));

    // Calcular totales de ventas
    const totalSales = sales.reduce(
      (sum, s) => sum + Number(s.precio_venta_total),
      0,
    );
    const totalIgv = sales.reduce((sum, s) => sum + Number(s.monto_igv), 0);

    // Agrupar por método de pago
    const byPaymentMethod: Record<string, number> = {};
    sales.forEach((sale) => {
      const method = sale.payment_method;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = 0;
      }
      byPaymentMethod[method] += Number(sale.precio_venta_total);
    });

    // Agrupar por tipo de comprobante
    const byDocumentType: Record<string, { count: number; total: number }> = {};
    sales.forEach((sale) => {
      const type = sale.tipo_comprobante;
      if (!byDocumentType[type]) {
        byDocumentType[type] = { count: 0, total: 0 };
      }
      byDocumentType[type].count += 1;
      byDocumentType[type].total += Number(sale.precio_venta_total);
    });

    // Totales de cajas
    const cashTotals = {
      initial: cashRegisters.reduce(
        (sum, c) => sum + Number(c.initial_amount),
        0,
      ),
      sales: cashRegisters.reduce((sum, c) => sum + Number(c.total_sales), 0),
      income: cashRegisters.reduce((sum, c) => sum + Number(c.total_income), 0),
      expense: cashRegisters.reduce(
        (sum, c) => sum + Number(c.total_expense),
        0,
      ),
      expected: cashRegisters.reduce(
        (sum, c) => sum + Number(c.expected_amount),
        0,
      ),
      final: cashRegisters.reduce(
        (sum, c) => sum + Number(c.final_amount || 0),
        0,
      ),
      difference: cashRegisters.reduce(
        (sum, c) => sum + Number(c.difference || 0),
        0,
      ),
    };

    // Top productos
    const topProducts = productSales
      .map((item) => {
        const product = item.product_id
          ? productsMap.get(item.product_id)
          : null;
        if (!product) return null;

        return {
          product_name: product.name,
          quantity: Number(item._sum.cantidad || 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      date: targetDate.toISOString().split('T')[0],
      sales: {
        total: Number(totalSales.toFixed(2)),
        count: sales.length,
        igv: Number(totalIgv.toFixed(2)),
        by_payment_method: Object.fromEntries(
          Object.entries(byPaymentMethod).map(([key, value]) => [
            key,
            Number(value.toFixed(2)),
          ]),
        ),
        by_document_type: Object.fromEntries(
          Object.entries(byDocumentType).map(([key, data]) => [
            key,
            {
              count: data.count,
              total: Number(data.total.toFixed(2)),
            },
          ]),
        ),
      },
      orders: {
        total: orders.length,
        total_diners: orders.reduce((sum, o) => sum + o.diners_count, 0),
        completed: orders.filter((o) => o.status === 'PAGADA').length,
        cancelled: orders.filter((o) => o.status === 'CANCELADA').length,
      },
      cash_registers: {
        count: cashRegisters.length,
        open: cashRegisters.filter((c) => c.status === 'ABIERTA').length,
        closed: cashRegisters.filter((c) => c.status === 'CERRADA').length,
        initial_amount: Number(cashTotals.initial.toFixed(2)),
        total_sales: Number(cashTotals.sales.toFixed(2)),
        total_income: Number(cashTotals.income.toFixed(2)),
        total_expense: Number(cashTotals.expense.toFixed(2)),
        expected_amount: Number(cashTotals.expected.toFixed(2)),
        final_amount: Number(cashTotals.final.toFixed(2)),
        difference: Number(cashTotals.difference.toFixed(2)),
      },
      top_products: topProducts,
    };
  }

  /**
   * Exportar reporte (stub - implementar con librerías específicas)
   */
  async exportReport(
    type: string,
    reportType: string,
    queryParams: Record<string, string>,
  ) {
    // TODO: Implementar exportación a PDF/Excel
    // Usar librerías como:
    // - PDF: pdfmake, jsPDF
    // - Excel: exceljs, xlsx

    throw new Error(
      'Exportación no implementada aún. Usar endpoint específico de reporte.',
    );
  }
}
