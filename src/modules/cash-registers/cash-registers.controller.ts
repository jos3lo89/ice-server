import {
  BadRequestException,
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
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { RequireCashRegister } from 'src/common/decorators/requireCashRegister.decorator';

@ApiTags('Gestión de cajas registradoras')
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  @Auth(Role.ADMIN, Role.CAJERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir caja' })
  @ApiResponse({ status: 201, description: 'Caja abierta exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 409, description: 'Ya tiene una caja abierta' })
  async open(
    @CurrentUser() user: CurrentUserI,
    @Body() openCashRegisterDto: OpenCashRegisterDto,
  ) {
    return this.cashRegistersService.open(user.sub, openCashRegisterDto);
  }

  @Post('close')
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
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
    @CurrentUser() user: CurrentUserI,
    @Body() closeCashRegisterDto: CloseCashRegisterDto,
  ) {
    return this.cashRegistersService.close(user.sub, closeCashRegisterDto);
  }

  @Get('current')
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
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
        succes: true,
        message: 'Caja actual obtenida exitosamente',
        data: {
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
    },
  })
  async getCurrent(@CurrentUser() user: CurrentUserI) {
    return this.cashRegistersService.getCurrent(user.sub);
  }

  @Get('today')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Cajas del día',
    description: 'Obtiene todas las cajas abiertas hoy. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cajas del día obtenidas exitosamente',
  })
  async getToday() {
    return this.cashRegistersService.getToday();
  }

  // TODO: ver fechas en peru hay variaciones creo wadafa dx
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
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Obtener caja por ID',
    description: 'Obtiene el detalle de una caja específica. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la caja',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Caja obtenida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Caja no encontrada' })
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID de la caja no es válido');
        },
      }),
    )
    id: string,
  ) {
    return this.cashRegistersService.findOne(id);
  }

  @Get(':id/summary')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Resumen de caja',
    description:
      'Obtiene un resumen completo de la caja con estadísticas. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la caja',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen completo de la caja',
  })
  @ApiResponse({ status: 400, description: 'Id inválido' })
  @ApiResponse({ status: 404, description: 'Caja no encontrada' })
  async getSummary(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID de la caja no es válido');
        },
      }),
    )
    id: string,
  ) {
    return this.cashRegistersService.getSummary(id);
  }

  @Get('current/sales')
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Ventas de caja actual',
    description:
      'Obtiene todas las ventas de la caja abierta actual. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ventas de caja actual obtenidas exitosamente',
  })
  async getCurrentSales(@CurrentUser() user: CurrentUserI) {
    return this.cashRegistersService.getCurrentSales(user.sub);
  }
}
