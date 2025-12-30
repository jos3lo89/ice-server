import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { BulkCreateOrderItemsDto } from './dto/bulk-create-order-items.dto';
import { CancelOrderItemDto } from './dto/cancel-order-item.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { KitchenDisplayQueryDto } from './dto/kitchen-display-query.dto';
import { SendToKitchenDto } from './dto/send-to-kitchen.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';

@ApiTags('Gestión de items del pedido')
@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}
  @Post('orders/:orderId/items')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar item a orden',
    description: 'Agrega un item a una orden existente. MESERO+.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Item agregado exitosamente',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          product_name: 'Lomo Saltado',
          quantity: 2,
          unit_price: 42.0,
          variants_total: 5.0,
          line_total: 94.0,
          status: 'PENDIENTE',
          area: 'COCINA',
          notes: 'Sin cebolla',
        },
        order_subtotal: 219.5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o orden no disponible',
  })
  @ApiResponse({ status: 404, description: 'Orden o producto no encontrado' })
  async addItem(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
    @Body() createOrderItemDto: CreateOrderItemDto,
  ) {
    const result = await this.orderItemsService.addItem(
      orderId,
      userId,
      createOrderItemDto,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Post('orders/:orderId/items/bulk')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar múltiples items',
    description: 'Agrega múltiples items de una vez a la orden. MESERO+.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Items agregados exitosamente',
  })
  async addBulkItems(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
    @Body() bulkCreateOrderItemsDto: BulkCreateOrderItemsDto,
  ) {
    const result = await this.orderItemsService.addBulkItems(
      orderId,
      userId,
      bulkCreateOrderItemsDto,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Patch(':id/status')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO, Role.COCINERO, Role.BARTENDER)
  @ApiOperation({
    summary: 'Actualizar estado del item',
    description:
      'Cambia el estado de preparación del item. Validado por roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
  })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para esta transición',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Body() updateOrderItemStatusDto: UpdateOrderItemStatusDto,
  ) {
    const result = await this.orderItemsService.updateStatus(
      id,
      userId,
      userRole,
      updateOrderItemStatusDto,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Patch(':id/cancel')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Cancelar item',
    description:
      'Cancela un item de la orden (soft delete). Solo ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Item cancelado',
  })
  @ApiResponse({ status: 400, description: 'No se puede cancelar el item' })
  async cancelItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() cancelOrderItemDto: CancelOrderItemDto,
  ) {
    const result = await this.orderItemsService.cancelItem(
      id,
      userId,
      cancelOrderItemDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Delete(':id')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Eliminar item',
    description: 'Elimina un item (solo si está PENDIENTE). MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Item eliminado',
    schema: {
      example: {
        success: true,
        message: 'Item eliminado exitosamente',
        order_subtotal: 125.5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden eliminar items PENDIENTE',
  })
  async deleteItem(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.orderItemsService.deleteItem(id);
    return {
      success: true,
      ...result,
    };
  }

  @Post('send-to-kitchen')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar items a cocina/bar',
    description:
      'Envía items pendientes a cocina/bar para preparación. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Items enviados',
  })
  @ApiResponse({ status: 400, description: 'Items no válidos para enviar' })
  async sendToKitchen(@Body() sendToKitchenDto: SendToKitchenDto) {
    const result = await this.orderItemsService.sendToKitchen(sendToKitchenDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('kitchen-display')
  @Auth(Role.ADMIN, Role.CAJERO, Role.COCINERO, Role.BARTENDER)
  @ApiOperation({
    summary: 'Pantalla de cocina/bar',
    description: 'Obtiene items para pantalla de cocina o bar. COCINERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Items para preparación',
  })
  async getKitchenDisplay(@Query() queryDto: KitchenDisplayQueryDto) {
    const result = await this.orderItemsService.getKitchenDisplay(queryDto);
    return {
      success: true,
      ...result,
    };
  }

  @Get('bar-display')
  @Auth(Role.ADMIN, Role.CAJERO, Role.BARTENDER)
  @ApiOperation({
    summary: 'Pantalla de bar',
    description:
      'Obtiene items para pantalla de bar. Alias de kitchen-display?area=BAR.',
  })
  @ApiResponse({
    status: 200,
    description: 'Items para bar',
  })
  async getBarDisplay() {
    const result = await this.orderItemsService.getKitchenDisplay({
      area: 'BAR',
    });
    return {
      success: true,
      ...result,
    };
  }
}
