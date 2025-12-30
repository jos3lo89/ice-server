import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ExportParamsDto } from './dto/export-params.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';

@ApiTags('Gestión de Reportes')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Reporte de ventas',
    description:
      'Genera reporte detallado de ventas con agrupaciones por período, método de pago y tipo de comprobante. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de ventas generado',
  })
  async getSalesReport(@Query() queryDto: SalesReportQueryDto) {
    const result = await this.reportsService.getSalesReport(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('products')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Reporte de productos',
    description:
      'Genera reporte de productos vendidos con análisis de rentabilidad y agrupación por categoría. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de productos generado',
  })
  async getProductsReport(@Query() queryDto: ReportQueryDto) {
    const result = await this.reportsService.getProductsReport(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('waiters')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Reporte por meseros',
    description:
      'Genera reporte de desempeño de meseros con órdenes, ventas y ticket promedio. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de meseros generado',
  })
  async getWaitersReport(@Query() queryDto: ReportQueryDto) {
    const result = await this.reportsService.getWaitersReport(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('cash-registers')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Reporte de cajas',
    description:
      'Genera reporte de cajas registradoras con movimientos, diferencias y estado. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de cajas generado',
  })
  async getCashRegistersReport(@Query() queryDto: ReportQueryDto) {
    const result = await this.reportsService.getCashRegistersReport(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('daily-close')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Cierre diario',
    description:
      'Genera reporte de cierre del día con resumen completo de ventas, órdenes, cajas y productos. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de cierre diario generado',
  })
  async getDailyCloseReport(@Query('date') date?: string) {
    const result = await this.reportsService.getDailyCloseReport(date);
    return {
      success: true,
      data: result,
    };
  }

  @Get('export/:type')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Exportar reporte',
    description: 'Exporta un reporte en formato PDF o Excel. Solo ADMIN.',
  })
  @ApiParam({
    name: 'type',
    description: 'Tipo de exportación',
    enum: ['pdf', 'excel'],
    example: 'pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte exportado',
  })
  @ApiResponse({
    status: 501,
    description: 'No implementado',
  })
  async exportReport(
    @Param() params: ExportParamsDto,
    @Query() queryParams: Record<string, string>,
  ) {
    const result = await this.reportsService.exportReport(
      params.type,
      queryParams.reportType || 'sales',
      queryParams,
    );
    return {
      success: true,
      data: result,
    };
  }
}
