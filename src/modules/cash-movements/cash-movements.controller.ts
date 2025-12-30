import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';

@ApiTags('Gestión de movimientos de efectivo')
@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  @Auth(Role.ADMIN, Role.CAJERO)
  // @RequireCashRegister()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar movimiento de caja',
    description:
      'Registra un ingreso o egreso manual en la caja actual. Requiere caja abierta. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 201,
    description: 'Movimiento registrado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o sin caja abierta',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos o sin caja abierta' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createCashMovementDto: CreateCashMovementDto,
  ) {
    return this.cashMovementsService.create(userId, createCashMovementDto);
  }

  @Get()
  @Auth(Role.ADMIN, Role.CAJERO)
  // @RequireCashRegister()
  @ApiOperation({
    summary: 'Movimientos de caja actual',
    description:
      'Obtiene todos los movimientos de la caja abierta del usuario. Requiere caja abierta. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos',
  })
  @ApiResponse({ status: 400, description: 'Sin caja abierta' })
  async findByCurrentCashRegister(@CurrentUser() user: CurrentUserI) {
    console.log('user get', user);

    return this.cashMovementsService.findByCurrentCashRegister(user.sub);
  }

  @Get('register/:registerId')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Movimientos de una caja específica',
    description:
      'Obtiene todos los movimientos de una caja por su ID. Solo ADMIN.',
  })
  @ApiParam({
    name: 'registerId',
    description: 'UUID de la caja',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos de la caja',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  async findByCashRegister(
    @Param('registerId', ParseUUIDPipe) registerId: string,
  ) {
    return this.cashMovementsService.findByCashRegister(registerId);
  }
}
