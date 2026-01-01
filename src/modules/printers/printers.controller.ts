import {
  BadRequestException,
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
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Gestión de impresoras')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Crear impresora' })
  @ApiResponse({ status: 201, description: 'Impresora creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Conflicto de datos' })
  async create(@Body() createPrinterDto: CreatePrinterDto) {
    return this.printersService.create(createPrinterDto);
  }

  @Get()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Listar impresoras' })
  @ApiResponse({ status: 200, description: 'Lista de impresoras' })
  async findAll() {
    return this.printersService.findAll();
  }

  @Get('area/:area')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Impresoras por área' })
  @ApiParam({
    name: 'area',
    enum: area_preparacion,
    description: 'Área de preparación',
    example: 'COCINA',
  })
  @ApiResponse({ status: 200, description: 'Lista de impresoras del área' })
  @ApiResponse({ status: 404, description: 'No se encontraron impresoras' })
  async findByArea(
    @Param(
      'area',
      new ParseEnumPipe(area_preparacion, {
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException(
            `Área inválida. Use: ${Object.values(area_preparacion).join(', ')}`,
          );
        },
      }),
    )
    area: area_preparacion,
  ) {
    return this.printersService.findByArea(area);
  }

  @Get(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener impresora por ID',
    description: 'Obtiene el detalle de una impresora específica. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la impresora',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('EL ID de la impresora es inválido.');
        },
      }),
    )
    id: string,
  ) {
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
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Impresora actualizada',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('EL ID de la impresora es inválido.');
        },
      }),
    )
    id: string,
    @Body() updatePrinterDto: UpdatePrinterDto,
  ) {
    return this.printersService.update(id, updatePrinterDto);
  }

  // TODO: agrega soft delete - ver luego dx
  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar impresora',
    description:
      'Elimina una impresora del sistema. No se puede eliminar si tiene pedidos asociados. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Impresora eliminada',
    schema: {
      example: {
        success: true,
        message: 'Impresora "Impresora Cocina" eliminada exitosamente',
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Impresora no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Impresora tiene pedidos asociados',
  })
  async remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('EL ID de la impresora es inválido.');
        },
      }),
    )
    id: string,
  ) {
    return this.printersService.remove(id);
  }

  @Post(':id/test')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Imprimir prueba',
    description:
      'Envía una página de prueba a la impresora (simulado en consola). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la impresora',
    example: 'uuid-v4-123',
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
  async printTest(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('EL ID de la impresora es inválido.');
        },
      }),
    )
    id: string,
  ) {
    return this.printersService.printTest(id);
  }
}
