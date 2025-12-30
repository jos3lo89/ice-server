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
  Res,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Role } from 'src/common/enums/role.enum';
import { SalesQueryDto } from './dto/sales-query.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { type Response } from 'express';

@ApiTags('Gestión de Comprobantes')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Listar ventas',
    description: 'Obtiene lista de ventas con filtros opcionales. CAJERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ventas',
  })
  async findAll(@Query() queryDto: SalesQueryDto) {
    const result = await this.salesService.findAll(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('today')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Ventas del día',
    description:
      'Obtiene ventas del día actual con filtros opcionales. CAJERO+.',
  })
  @ApiQuery({
    name: 'tipo',
    enum: ['TICKET', 'BOLETA', 'FACTURA'],
    required: false,
  })
  @ApiQuery({
    name: 'payment_method',
    enum: [
      'EFECTIVO',
      'TARJETA_VISA',
      'TARJETA_MASTERCARD',
      'TARJETA_AMEX',
      'YAPE',
      'PLIN',
      'TRANSFERENCIA',
    ],
    required: false,
  })
  @ApiQuery({
    name: 'estado_sunat',
    enum: [
      'NO_APLICA',
      'PENDIENTE',
      'ENVIANDO',
      'ACEPTADO',
      'RECHAZADO',
      'OBSERVADO',
      'ANULADO',
    ],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Ventas del día',
  })
  async findToday(@Query() queryDto: SalesQueryDto) {
    const result = await this.salesService.findToday(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Detalle de venta',
    description: 'Obtiene el detalle completo de un comprobante. CAJERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la venta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la venta',
  })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.salesService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/pdf')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Descargar PDF',
    description: 'Descarga el PDF del comprobante. CAJERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la venta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF del comprobante',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'PDF no disponible' })
  async getPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const pdfPath = await this.salesService.getPdf(id);

    // TODO: Implementar lectura de archivo real
    // const fs = require('fs');
    // const fileStream = fs.createReadStream(pdfPath);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename="comprobante.pdf"`);
    // fileStream.pipe(res);

    return res.json({
      success: true,
      message: 'PDF disponible',
      path: pdfPath,
    });
  }

  @Get(':id/xml')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Descargar XML',
    description: 'Descarga el XML firmado del comprobante. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la venta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'XML del comprobante',
    content: {
      'application/xml': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Los tickets no tienen XML' })
  @ApiResponse({ status: 404, description: 'XML no disponible' })
  async getXml(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const xmlPath = await this.salesService.getXml(id);

    // TODO: Implementar lectura de archivo real
    // const fs = require('fs');
    // const fileStream = fs.createReadStream(xmlPath);
    // res.setHeader('Content-Type', 'application/xml');
    // res.setHeader('Content-Disposition', `attachment; filename="comprobante.xml"`);
    // fileStream.pipe(res);

    return res.json({
      success: true,
      message: 'XML disponible',
      path: xmlPath,
    });
  }

  @Post(':id/resend-sunat')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar a SUNAT',
    description: 'Reenvía el comprobante a SUNAT. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la venta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprobante reenviado',
  })
  @ApiResponse({ status: 400, description: 'Tickets no se envían a SUNAT' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async resendToSunat(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.salesService.resendToSunat(id);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/void')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anular comprobante',
    description:
      'Anula un comprobante generando una nota de crédito. Solo ADMIN. Máximo 7 días.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la venta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprobante anulado',
  })
  @ApiResponse({ status: 400, description: 'No se puede anular' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async void(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() voidSaleDto: VoidSaleDto,
  ) {
    const result = await this.salesService.voidSale(id, userId, voidSaleDto);
    return {
      success: true,
      data: result,
    };
  }
}
