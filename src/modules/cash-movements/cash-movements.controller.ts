import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { RequireCashRegister } from 'src/common/decorators/requireCashRegister.decorator';

@ApiTags('Gestión de movimientos de efectivo')
@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
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
    @CurrentUser() user: CurrentUserI,
    @Body() createCashMovementDto: CreateCashMovementDto,
  ) {
    return this.cashMovementsService.create(user.sub, createCashMovementDto);
  }

  @Get()
  @RequireCashRegister()
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Movimientos de caja actual',
    description:
      'Obtiene todos los movimientos de la caja abierta del usuario. Requiere caja abierta. ADMIN y CAJERO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimientos de caja actual obtenidos exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Sin caja abierta' })
  async findByCurrentCashRegister(@CurrentUser() user: CurrentUserI) {
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
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos de la caja obtenida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Id inválido' })
  async findByCashRegister(
    @Param(
      'registerId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID de la caja no es válido');
        },
      }),
    )
    registerId: string,
  ) {
    const result =
      await this.cashMovementsService.findByCashRegister(registerId);
    return {
      success: true,
      message: 'Lista de movimientos de la caja obtenida exitosamente',
      data: result,
    };
  }
}
