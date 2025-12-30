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
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Gestión de Pisos')
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear un nuevo piso',
    description:
      'Registra un nivel en el restaurante. El nivel debe ser único.',
  })
  @ApiResponse({ status: 201, description: 'Piso creado exitosamente.' })
  @ApiResponse({ status: 409, description: 'Conflicto: El nivel ya existe.' })
  async create(@Body() body: CreateFloorDto) {
    const floor = await this.floorsService.create(body);
    return { success: true, data: floor, message: 'Piso creado exitosamente' };
  }

  @Get()
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar todos los pisos',
    description: 'Obtiene una lista de los pisos con el conteo de sus mesas.',
  })
  @ApiResponse({ status: 200, description: 'Lista obtenida correctamente.' })
  async findAll() {
    const floors = await this.floorsService.findAll();
    return { success: true, data: floors };
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Obtener detalle de un piso',
    description:
      'Retorna la información de un piso incluyendo su mapa de mesas activas.',
  })
  @ApiParam({ name: 'id', description: 'ID único (UUID) del piso' })
  @ApiResponse({ status: 200, description: 'Detalle del piso encontrado.' })
  @ApiResponse({ status: 404, description: 'Piso no encontrado.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const floor = await this.floorsService.findOne(id);
    return { success: true, data: floor };
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar un piso',
    description: 'Modifica los datos de un piso existente.',
  })
  @ApiResponse({ status: 200, description: 'Piso actualizado exitosamente.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    const floor = await this.floorsService.update(id, updateFloorDto);
    return { success: true, data: floor, message: 'Piso actualizado' };
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Desactivar un piso',
    description: 'Realiza un borrado lógico (is_active: false) del piso.',
  })
  @ApiResponse({ status: 200, description: 'Piso desactivado correctamente.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.floorsService.softDelete(id);
    return { success: true, message: 'Piso desactivado correctamente' };
  }
}
