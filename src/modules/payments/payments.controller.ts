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
import { CreateIncrementalPaymentDto } from './dto/create-incremental-payment.dto';
import { CurrentCash } from 'src/common/decorators/CurrentCash.decorator';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';

@ApiTags('Gestión de pagos')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
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
    @CurrentUser() user: CurrentUserI,
    @CurrentCash() cashId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    console.log({
      userId: user.sub,
      cashId,
      createPaymentDto,
    });

    const result = await this.paymentsService.createPayment2(
      user.sub,
      cashId,
      createPaymentDto,
    );

    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  // @Post('split')
  // @RequireCashRegister()
  // @Auth(Role.ADMIN, Role.CAJERO)
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({
  //   summary: 'Procesar pago dividido',
  //   description:
  //     'Procesa múltiples pagos de una orden (cada comensal paga su parte). Requiere caja abierta. CAJERO+.',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Pagos procesados',
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Datos inválidos o items ya pagados',
  // })
  // @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  // async createSplit(
  //   @CurrentUser() user: CurrentUserI,
  //   @CurrentCash() cashId: string,
  //   @Body() createSplitPaymentDto: CreateSplitPaymentDto,
  // ) {
  //   const result = await this.paymentsService.createSplitPayment(
  //     user.sub,
  //     cashId,
  //     createSplitPaymentDto,
  //   );

  //   return {
  //     success: true,
  //     data: result,
  //   };
  // }

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

  @Post('incremental')
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Procesar pago incremental',
    description:
      'Procesa pagos parciales por items específicos. Permite que diferentes personas paguen diferentes items. CAJERO+.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pagos incrementales procesados',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o items no disponibles',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async createIncremental(
    @CurrentUser() user: CurrentUserI,
    @CurrentCash() cashId: string,
    @Body() createIncrementalPaymentDto: CreateIncrementalPaymentDto,
  ) {
    const result = await this.paymentsService.createIncrementalPayment2(
      user.sub,
      cashId,
      createIncrementalPaymentDto,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('progress/:orderId')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Progreso de pagos de orden',
    description:
      'Obtiene el progreso detallado de pagos por items de una orden. CAJERO+.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Progreso de pagos',
  })
  async getPaymentProgress(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const result = await this.paymentsService.getPaymentProgress(orderId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('history/:orderId')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Historial completo de pagos',
    description:
      'Obtiene el historial completo de pagos de una orden con todos los detalles. CAJERO+.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de pagos',
  })
  async getPaymentHistory(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const result = await this.paymentsService.getPaymentHistory(orderId);
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
