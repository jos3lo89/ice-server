import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PrintersService } from './printers.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@ApiTags('Gestión de impresoras')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear impresora',
    description: 'Crea una nueva impresora térmica. Solo ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Impresora creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async create(@Body() createPrinterDto: CreatePrinterDto) {
    return this.printersService.create(createPrinterDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar impresoras',
    description:
      'Obtiene todas las impresoras registradas con su estado. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de impresoras',
  })
  async findAll() {
    return this.printersService.findAll();
  }

  @Get('area/:area')
  @ApiOperation({
    summary: 'Impresoras por área',
    description:
      'Obtiene todas las impresoras de un área específica. Solo ADMIN.',
  })
  @ApiParam({
    name: 'area',
    enum: area_preparacion,
    description: 'Área de preparación',
    example: 'COCINA',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de impresoras del área',
  })
  @ApiResponse({ status: 404, description: 'No se encontraron impresoras' })
  async findByArea(
    @Param('area', new ParseEnumPipe(area_preparacion)) area: area_preparacion,
  ) {
    return this.printersService.findByArea(area);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener impresora por ID',
    description: 'Obtiene el detalle de una impresora específica. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la impresora',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.printersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar impresora',
    description: 'Actualiza los datos de una impresora existente. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Impresora actualizada',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrinterDto: UpdatePrinterDto,
  ) {
    return this.printersService.update(id, updatePrinterDto);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Imprimir prueba',
    description:
      'Envía una página de prueba a la impresora (simulado en consola). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Página de prueba enviada',
  })
  @ApiResponse({
    status: 400,
    description: 'Impresora inactiva o error al imprimir',
  })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  async printTest(@Param('id', ParseUUIDPipe) id: string) {
    return this.printersService.printTest(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar impresora',
    description:
      'Elimina una impresora del sistema. No se puede eliminar si tiene pedidos asociados. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Impresora eliminada',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Impresora "Impresora Cocina" eliminada exitosamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Impresora tiene pedidos asociados',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.printersService.remove(id);
  }
}
