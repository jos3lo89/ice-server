import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateUserFloorsDto } from './dto/update-user-floors.dto';

@ApiTags('Usuarios')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Registrar un nuevo trabajador',
    description:
      'Crea un usuario en la base de datos con contraseña encriptada. Solo accesible por administradores.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El nombre de usuario o DNI ya están registrados.',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: No tienes permisos de administrador.',
  })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar todos los usuarios',
    description:
      'Obtiene una lista detallada de todos los trabajadores registrados. Solo accesible para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente.',
    // type: [UserResponseDto] // Si decides crear el DTO de respuesta
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para ver esta información.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/floors')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Asignar pisos a un usuario',
    description:
      'Sincroniza los pisos donde el trabajador tiene permiso. Borra las asignaciones anteriores y crea las nuevas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pisos actualizados correctamente.',
  })
  @ApiResponse({ status: 400, description: 'IDs de pisos inválidos.' })
  async assignFloors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserFloorsDto,
  ) {
    await this.usersService.setFloors(id, dto.floorIds);
    return { success: true, message: 'Pisos asignados correctamente' };
  }

  @Patch(':id/deactivate')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Desactivar usuario',
    description: 'Inhabilita el acceso del usuario al sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado exitosamente.',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.updateStatus(id, false);
    return { success: true, message: 'Usuario desactivado' };
  }

  @Patch(':id/activate')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Activar usuario',
    description: 'Restaura el acceso del usuario al sistema.',
  })
  @ApiResponse({ status: 200, description: 'Usuario activado exitosamente.' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.updateStatus(id, true);
    return { success: true, message: 'Usuario activado' };
  }
}
