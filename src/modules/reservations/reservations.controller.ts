import {
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
import { ReservationsService } from './reservations.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsQueryDto } from './dto/reservations-query.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';

@ApiTags('Gestión de Reservaciones')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear reservación',
    description:
      'Crea una nueva reservación validando disponibilidad de mesa. MESERO+.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservación creada',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o mesa sin capacidad',
  })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario' })
  async create(
    @CurrentUser() user: CurrentUserI,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    const result = await this.reservationsService.create(
      user.sub,
      createReservationDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar reservaciones',
    description:
      'Obtiene lista de reservaciones con filtros opcionales. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservaciones',
  })
  async findAll(@Query() queryDto: ReservationsQueryDto) {
    const result = await this.reservationsService.findAll(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('today')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Reservaciones de hoy',
    description: 'Obtiene todas las reservaciones del día actual. MESERO+.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservaciones de hoy',
  })
  async findToday() {
    const result = await this.reservationsService.findToday();
    return {
      success: true,
      data: result,
    };
  }

  @Get('date/:date')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Reservaciones por fecha',
    description:
      'Obtiene reservaciones de una fecha específica (YYYY-MM-DD). MESERO+.',
  })
  @ApiParam({
    name: 'date',
    description: 'Fecha en formato YYYY-MM-DD',
    example: '2024-01-20',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservaciones de la fecha',
  })
  async findByDate(@Param('date') date: string) {
    const result = await this.reservationsService.findByDate(date);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Detalle de reservación',
    description: 'Obtiene el detalle completo de una reservación. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la reservación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la reservación',
  })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.reservationsService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @ApiOperation({
    summary: 'Actualizar reservación',
    description:
      'Actualiza los datos de una reservación. No se pueden actualizar canceladas. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la reservación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservación actualizada',
  })
  @ApiResponse({ status: 400, description: 'No se puede actualizar cancelada' })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    const result = await this.reservationsService.update(
      id,
      updateReservationDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/confirm')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar reservación',
    description: 'Confirma una reservación PENDIENTE. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la reservación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservación confirmada',
  })
  @ApiResponse({ status: 400, description: 'Ya está confirmada o cancelada' })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserI,
  ) {
    const result = await this.reservationsService.confirm(id, user.sub);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/cancel')
  @Auth(Role.ADMIN, Role.CAJERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar reservación',
    description: 'Cancela una reservación con motivo. MESERO+.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la reservación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservación cancelada',
  })
  @ApiResponse({ status: 400, description: 'Ya está cancelada' })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserI,
    @Body() cancelReservationDto: CancelReservationDto,
  ) {
    const result = await this.reservationsService.cancel(
      id,
      user.sub,
      cancelReservationDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar reservación',
    description: 'Elimina permanentemente una reservación. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la reservación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'Reservación eliminada' })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reservationsService.remove(id);
  }
}
