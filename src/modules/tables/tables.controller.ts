import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Gestión de Mesas')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear una mesa',
    description: 'Registra una nueva mesa vinculada a un piso específico.',
  })
  @ApiResponse({ status: 201, description: 'Mesa creada exitosamente.' })
  @ApiResponse({
    status: 409,
    description: 'El número de mesa ya existe en ese piso.',
  })
  async create(@Body() createTableDto: CreateTableDto) {
    const table = await this.tablesService.create(createTableDto);
    return { success: true, message: 'Mesa creada', data: table };
  }

  @Get()
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar todas las mesas',
    description: 'Obtiene todas las mesas activas del sistema.',
  })
  @ApiResponse({ status: 200, description: 'Mesas obtenidas exitosamente.' })
  findAll() {
    return this.tablesService.findAll();
  }

  @Get('floor/:floorId')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Mesas por piso',
    description:
      'Obtiene el mapa de mesas de un piso con su información de órdenes abiertas.',
  })
  @ApiParam({ name: 'floorId', description: 'ID del piso a consultar' })
  findByFloor(
    @Param(
      'floorId',
      new ParseUUIDPipe({
        errorHttpStatusCode: 400,
        exceptionFactory() {
          return new BadRequestException('ID de piso inválido');
        },
      }),
    )
    floorId: string,
  ) {
    return this.tablesService.findByFloor(floorId);
  }

  @Get('available')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Mesas libres',
    description: 'Lista únicamente las mesas con estado LIBRE.',
  })
  async findAvailable() {
    return await this.tablesService.findAvailable();
  }

  @Patch(':id/status')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Cambiar estado de mesa',
    description: 'Actualiza el estado (LIBRE, OCUPADA, RESERVADA, LIMPIEZA).',
  })
  @ApiParam({ name: 'id', description: 'ID de la mesa a actualizar el estado' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado correctamente.',
  })
  updateStatus(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: 400,
        exceptionFactory() {
          return new BadRequestException('ID de mesa inválido');
        },
      }),
    )
    id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar mesa',
    description: 'Desactiva la mesa de forma lógica.',
  })
  @ApiParam({ name: 'id', description: 'ID de la mesa a eliminar' })
  @ApiResponse({
    status: 200,
    description: 'Mesa eliminada logicamente exitosamente.',
  })
  remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: 400,
        exceptionFactory() {
          return new BadRequestException('ID de mesa inválido');
        },
      }),
    )
    id: string,
  ) {
    return this.tablesService.softDelete(id);
  }
}
