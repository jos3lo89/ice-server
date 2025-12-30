import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiOperation, ApiResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Gestión del panel')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Resumen general del dashboard',
    description:
      'Obtiene métricas principales del restaurante: ventas, órdenes, mesas, cajas. CAJERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen del dashboard',
  })
  async getSummary() {
    const result = await this.dashboardService.getSummary();
    return {
      success: true,
      data: result,
    };
  }

  @Get('sales-today')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Ventas del día',
    description:
      'Obtiene el detalle de todas las ventas del día actual con resumen. CAJERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ventas del día',
  })
  async getSalesToday() {
    const result = await this.dashboardService.getSalesToday();
    return {
      success: true,
      data: result,
    };
  }

  @Get('orders-active')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Órdenes activas',
    description:
      'Obtiene todas las órdenes activas (ABIERTA o CERRADA) con resumen de items. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes activas',
  })
  async getActiveOrders() {
    const result = await this.dashboardService.getActiveOrders();
    return {
      success: true,
      data: result,
    };
  }

  @Get('tables-status')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Estado de mesas',
    description:
      'Obtiene el estado actual de todas las mesas con órdenes asociadas. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de las mesas',
  })
  async getTablesStatus() {
    const result = await this.dashboardService.getTablesStatus();
    return {
      success: true,
      data: result,
    };
  }

  @Get('top-products')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Productos más vendidos',
    description:
      'Obtiene los productos más vendidos de los últimos 30 días. Solo ADMIN.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número de productos a retornar',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos más vendidos',
  })
  async getTopProducts(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const result = await this.dashboardService.getTopProducts(limit || 10);
    return {
      success: true,
      data: result,
    };
  }
}
