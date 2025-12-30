import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderHistoryDto } from './dto/order-history.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CloseOrderDto } from './dto/close-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('Gestión de pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear orden',
    description: 'Crea una nueva orden/comanda para una mesa. MESERO+.',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({
    status: 409,
    description: 'La mesa ya tiene una orden activa',
  })
  async create(
    @CurrentUser() user: CurrentUserI,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.sub, createOrderDto);
  }

  @Get()
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar órdenes activas',
    description:
      'Obtiene todas las órdenes activas (ABIERTA, CERRADA). MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes activas',
  })
  async findActive() {
    return this.ordersService.findActive();
  }

  @Get('table/:tableId')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Orden activa de mesa',
    description: 'Obtiene la orden activa de una mesa específica. MESERO+.',
  })
  @ApiParam({
    name: 'tableId',
    description: 'Identificador de mesa',
    example: 'MESA-5',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden de la mesa',
  })
  @ApiResponse({ status: 404, description: 'No hay orden activa en la mesa' })
  async findByTable(@Param('tableId') tableId: string) {
    return this.ordersService.findByTableId(tableId);
  }

  @Get('my-orders')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Mis órdenes activas',
    description: 'Obtiene las órdenes activas del mesero actual. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes del mesero',
  })
  async findMyOrders(@CurrentUser() user: CurrentUserI) {
    return this.ordersService.findMyOrders(user.sub);
  }

  @Get('history')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Historial de órdenes',
    description:
      'Obtiene el historial de órdenes con filtros opcionales. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de órdenes',
  })
  async getHistory(@Query() filters: OrderHistoryDto) {
    return this.ordersService.getHistory(filters);
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Detalle de orden',
    description:
      'Obtiene el detalle completo de una orden con sus items. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la orden',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Actualizar orden',
    description:
      'Actualiza datos de una orden (solo si está ABIERTA). MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden actualizada',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o orden no editable',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'La nueva mesa ya tiene orden activa',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/close')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar orden',
    description:
      'Cierra una orden (lista para pagar). Solo órdenes ABIERTA con items. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden cerrada',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cerrar (sin items o estado incorrecto)',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() closeOrderDto: CloseOrderDto,
  ) {
    return this.ordersService.close(id, closeOrderDto);
  }

  @Patch(':id/cancel')
  @Auth(Role.ADMIN, Role.CAJERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar orden completa',
    description:
      'Cancela una orden completa y todos sus items. Solo ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden cancelada',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar (ya cancelada o pagada)',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(id, cancelOrderDto);
  }
}
