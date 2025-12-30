import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CashRegisterHistoryDto } from './dto/cash-register-history.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';

@ApiTags('Gestión de cajas registradoras')
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Abrir caja',
    description:
      'Abre una nueva caja para el usuario actual. Solo puede haber una caja abierta por usuario. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 201,
    description: 'Caja abierta exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 409, description: 'Ya tiene una caja abierta' })
  async open(
    @CurrentUser('id') userId: string,
    @Body() openCashRegisterDto: OpenCashRegisterDto,
  ) {
    return this.cashRegistersService.open(userId, openCashRegisterDto);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar caja',
    description: 'Cierra la caja actual del usuario. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Caja cerrada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'No tiene caja abierta' })
  async close(
    @CurrentUser('id') userId: string,
    @Body() closeCashRegisterDto: CloseCashRegisterDto,
  ) {
    return this.cashRegistersService.close(userId, closeCashRegisterDto);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Obtener caja actual',
    description:
      'Obtiene la caja abierta del usuario actual. Retorna null si no tiene caja abierta. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Caja actual del usuario',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        open_time: '2024-01-15T08:00:00Z',
        initial_amount: 500.0,
        status: 'ABIERTA',
        hours_open: 4.5,
        totals: {
          sales: 1250.0,
          income: 50.0,
          expense: 50.0,
          current_balance: 1750.0,
        },
        sales_count: 15,
        last_sale: '2024-01-15T12:25:00Z',
      },
    },
  })
  async getCurrent(@CurrentUser('id') userId: string) {
    return this.cashRegistersService.getCurrent(userId);
  }

  @Get('today')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Cajas del día',
    description: 'Obtiene todas las cajas abiertas hoy. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cajas del día',
  })
  async getToday() {
    return this.cashRegistersService.getToday();
  }

  @Get('history')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Historial de cajas',
    description:
      'Obtiene el historial de cajas con filtros opcionales. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de cajas',
  })
  async getHistory(@Query() filters: CashRegisterHistoryDto) {
    return this.cashRegistersService.getHistory(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener caja por ID',
    description: 'Obtiene el detalle de una caja específica. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la caja',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la caja',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Caja no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashRegistersService.findOne(id);
  }

  @Get(':id/summary')
  @ApiOperation({
    summary: 'Resumen de caja',
    description:
      'Obtiene un resumen completo de la caja con estadísticas. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la caja',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen completo de la caja',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Caja no encontrada' })
  async getSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashRegistersService.getSummary(id);
  }
}
