import {
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
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Gestión de Mesas')
@ApiCookieAuth()
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
    return { success: true, data: table, message: 'Mesa creada' };
  }

  @Get()
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar todas las mesas',
    description: 'Obtiene todas las mesas activas del sistema.',
  })
  @ApiResponse({ status: 200, description: 'Lista completa obtenida.' })
  async findAll() {
    const tables = await this.tablesService.findAll();
    return { success: true, data: tables };
  }

  @Get('floor/:floorId')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Mesas por piso',
    description:
      'Obtiene el mapa de mesas de un piso con su información de órdenes abiertas.',
  })
  @ApiParam({ name: 'floorId', description: 'ID del piso a consultar' })
  async findByFloor(@Param('floorId', ParseUUIDPipe) floorId: string) {
    const tables = await this.tablesService.findByFloor(floorId);
    return { success: true, data: tables };
  }

  @Get('available')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Mesas libres',
    description: 'Lista únicamente las mesas con estado LIBRE.',
  })
  async findAvailable() {
    const tables = await this.tablesService.findAvailable();
    return { success: true, data: tables };
  }

  @Patch(':id/status')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Cambiar estado de mesa',
    description: 'Actualiza el estado (LIBRE, OCUPADA, RESERVADA, LIMPIEZA).',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado correctamente.',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    const table = await this.tablesService.updateStatus(id, dto.status);
    return {
      success: true,
      data: table,
      message: `Mesa marcada como ${dto.status}`,
    };
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar mesa',
    description: 'Desactiva la mesa de forma lógica.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.tablesService.softDelete(id);
    return { success: true, message: 'Mesa desactivada correctamente' };
  }
}
