import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { RequireCashRegister } from 'src/common/decorators/requireCashRegister.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';

@ApiTags('Gestión de pagos')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}
  @Post()
  @Auth(Role.ADMIN, Role.CAJERO)
  @RequireCashRegister()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Procesar pago simple',
    description:
      'Procesa el pago completo de una orden. Requiere caja abierta. CAJERO+.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pago procesado',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o orden no disponible',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async create(
    @CurrentUser('id') userId: string,
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    const cashRegisterId = req.cashRegisterId; // Inyectado por CashRegisterGuard
    const result = await this.paymentsService.createPayment(
      userId,
      cashRegisterId,
      createPaymentDto,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('split')
  @Auth(Role.ADMIN, Role.CAJERO)
  @RequireCashRegister()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Procesar pago dividido',
    description:
      'Procesa múltiples pagos de una orden (cada comensal paga su parte). Requiere caja abierta. CAJERO+.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pagos procesados',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o items ya pagados',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async createSplit(
    @CurrentUser('id') userId: string,
    @Req() req: any,
    @Body() createSplitPaymentDto: CreateSplitPaymentDto,
  ) {
    const cashRegisterId = req.cashRegisterId;
    const result = await this.paymentsService.createSplitPayment(
      userId,
      cashRegisterId,
      createSplitPaymentDto,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('order/:orderId')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Pagos de una orden',
    description: 'Obtiene todos los pagos asociados a una orden. CAJERO+.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagos',
  })
  async findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const result = await this.paymentsService.findByOrder(orderId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Detalle de pago',
    description: 'Obtiene el detalle completo de un pago. CAJERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del pago',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del pago',
  })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.paymentsService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }
}
