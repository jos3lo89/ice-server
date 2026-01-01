import {
  BadRequestException,
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
import { ClientsService } from './clients.service';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateClientDto } from './dto/create-client.dto';
import { SearchClientDto } from './dto/search-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Gestión de clientes')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Crear cliente',
    description: 'Crea un nuevo cliente para facturación. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o documento inválido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({
    status: 409,
    description: 'Cliente ya existe con ese documento',
  })
  async create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Listar clientes',
    description: 'Obtiene todos los clientes activos. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes',
  })
  async findAll() {
    return this.clientsService.findAll();
  }

  @Get('search')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Buscar clientes',
    description:
      'Busca clientes por documento, nombre o email. ADMIN y CAJERO.',
  })
  @ApiQuery({
    name: 'documento',
    required: false,
    description: 'Número de documento',
    example: '20123456789',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['SIN_DOC', 'DNI', 'CARNET_EXT', 'RUC', 'PASAPORTE'],
    description: 'Tipo de documento',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    description: 'Nombre o razón social',
    example: 'Juan',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Email del cliente',
    example: 'cliente@email.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda',
  })
  async search(@Query() searchDto: SearchClientDto) {
    return this.clientsService.search(searchDto);
  }

  @Get('frequent')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Clientes frecuentes',
    description: 'Obtiene los 10 clientes con más visitas. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 10 clientes frecuentes',
  })
  async getFrequentClients() {
    return this.clientsService.getFrequentClients();
  }

  @Get('vip')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Clientes VIP',
    description:
      'Obtiene los 10 clientes con mayor monto de compras. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 10 clientes VIP',
  })
  async getVIPClients() {
    return this.clientsService.getVIPClients();
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Obtener cliente por ID',
    description:
      'Obtiene el detalle de un cliente con sus estadísticas. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del cliente',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del cliente obtenido exitosamente',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del cliente no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Actualizar cliente',
    description:
      'Actualiza los datos de un cliente existente. No se puede cambiar el documento. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del cliente',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 409, description: 'Datos únicos duplicados' })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del cliente no es válido.');
        },
      }),
    )
    id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN, Role.CAJERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar cliente',
    description: 'Desactiva un cliente (soft delete). ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del cliente',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente desactivado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Cliente "Juan Pérez" desactivado exitosamente',
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del cliente no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.clientsService.remove(id);
  }
}
