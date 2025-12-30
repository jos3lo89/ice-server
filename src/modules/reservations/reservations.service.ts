import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsQueryDto } from './dto/reservations-query.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { reservationsWhereInput } from 'src/generated/prisma/models';
import { reservation_status } from 'src/generated/prisma/enums';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear nueva reservación
   */
  async create(userId: string, createReservationDto: CreateReservationDto) {
    // Verificar que la mesa existe
    const table = await this.prisma.tables.findUnique({
      where: { id: createReservationDto.table_id },
      include: {
        floor: {
          select: { name: true },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(
        `Mesa con ID "${createReservationDto.table_id}" no encontrada`,
      );
    }

    // Validar capacidad
    if (createReservationDto.diners_count > table.capacity) {
      throw new BadRequestException(
        `La mesa tiene capacidad para ${table.capacity} personas, se solicitaron ${createReservationDto.diners_count}`,
      );
    }

    // Combinar fecha y hora
    const reservationDatetime = new Date(
      `${createReservationDto.reservation_date}T${createReservationDto.reservation_time}:00`,
    );

    // Validar que la fecha es futura
    if (reservationDatetime <= new Date()) {
      throw new BadRequestException('La fecha de reservación debe ser futura');
    }

    // Calcular fecha de finalización
    const endDatetime = new Date(reservationDatetime);
    endDatetime.setHours(
      endDatetime.getHours() + createReservationDto.duration_hours,
    );

    // Validar que no haya conflictos con otras reservaciones
    const conflicts = await this.prisma.reservations.findMany({
      where: {
        table_id: createReservationDto.table_id,
        status: {
          in: [reservation_status.PENDIENTE, reservation_status.CONFIRMADA],
        },
        OR: [
          // Nueva reservación empieza durante una existente
          {
            AND: [
              { reservation_datetime: { lte: reservationDatetime } },
              { end_datetime: { gt: reservationDatetime } },
            ],
          },
          // Nueva reservación termina durante una existente
          {
            AND: [
              { reservation_datetime: { lt: endDatetime } },
              { end_datetime: { gte: endDatetime } },
            ],
          },
          // Nueva reservación contiene una existente
          {
            AND: [
              { reservation_datetime: { gte: reservationDatetime } },
              { end_datetime: { lte: endDatetime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException(
        'Ya existe una reservación activa para esta mesa en el horario solicitado',
      );
    }

    // Crear reservación
    const reservation = await this.prisma.reservations.create({
      data: {
        table_id: createReservationDto.table_id,
        client_name: createReservationDto.client_name,
        client_phone: createReservationDto.client_phone,
        client_email: createReservationDto.client_email,
        reservation_datetime: reservationDatetime,
        end_datetime: endDatetime,
        duration_hours: createReservationDto.duration_hours,
        diners_count: createReservationDto.diners_count,
        notes: createReservationDto.notes,
        status: reservation_status.PENDIENTE,
        created_by: userId,
      },
    });

    return {
      id: reservation.id,
      client_name: reservation.client_name,
      reservation_datetime: reservation.reservation_datetime,
      status: reservation.status,
      table: `Mesa ${table.number}${table.name ? ` - ${table.name}` : ''}`,
      message: 'Reservación creada exitosamente',
    };
  }

  /**
   * Listar reservaciones con filtros
   */
  async findAll(queryDto: ReservationsQueryDto) {
    const where: reservationsWhereInput = {};

    // Filtros
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.from || queryDto.to) {
      where.reservation_datetime = {};
      if (queryDto.from) {
        where.reservation_datetime.gte = new Date(queryDto.from);
      }
      if (queryDto.to) {
        const toDate = new Date(queryDto.to);
        toDate.setHours(23, 59, 59, 999);
        where.reservation_datetime.lte = toDate;
      }
    }

    // Obtener reservaciones
    const reservations = await this.prisma.reservations.findMany({
      where,
      include: {
        table: {
          select: {
            number: true,
            name: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        reservation_datetime: 'asc',
      },
    });

    // Calcular resumen
    const summary = {
      total: reservations.length,
      pendiente: 0,
      confirmada: 0,
      cancelada: 0,
    };

    reservations.forEach((res) => {
      if (res.status === reservation_status.PENDIENTE) summary.pendiente++;
      if (res.status === reservation_status.CONFIRMADA) summary.confirmada++;
      if (res.status === reservation_status.CANCELADA) summary.cancelada++;
    });

    return {
      reservations: reservations.map((res) => ({
        id: res.id,
        client_name: res.client_name,
        client_phone: res.client_phone,
        reservation_datetime: res.reservation_datetime,
        duration_hours: res.duration_hours,
        diners_count: res.diners_count,
        status: res.status,
        table: `Mesa ${res.table.number}${res.table.name ? ` - ${res.table.name}` : ''} - ${res.table.floor.name}`,
        created_by: res.creator.name,
        created_at: res.created_at,
      })),
      summary,
    };
  }

  /**
   * Reservaciones de hoy
   */
  async findToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.findAll({
      from: today.toISOString(),
      to: tomorrow.toISOString(),
    });
  }

  /**
   * Reservaciones por fecha
   */
  async findByDate(date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return this.findAll({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    });
  }

  /**
   * Detalle de reservación
   */
  async findOne(id: string) {
    const reservation = await this.prisma.reservations.findUnique({
      where: { id },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true,
            capacity: true,
            floor: {
              select: {
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
        confirmer: {
          select: {
            name: true,
          },
        },
        canceller: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID "${id}" no encontrada`);
    }

    return {
      id: reservation.id,
      client_name: reservation.client_name,
      client_phone: reservation.client_phone,
      client_email: reservation.client_email || undefined,
      reservation_datetime: reservation.reservation_datetime,
      duration_hours: reservation.duration_hours,
      diners_count: reservation.diners_count,
      status: reservation.status,
      notes: reservation.notes || undefined,
      table: {
        id: reservation.table.id,
        number: reservation.table.number,
        name: reservation.table.name,
        floor: reservation.table.floor.name,
        capacity: reservation.table.capacity,
      },
      created_by: reservation.creator.name,
      confirmed_by: reservation.confirmer?.name,
      confirmed_at: reservation.confirmed_at || undefined,
      cancel_reason: reservation.cancel_reason || undefined,
      cancelled_by: reservation.canceller?.name,
      cancelled_at: reservation.cancelled_at || undefined,
      created_at: reservation.created_at,
      updated_at: reservation.updated_at,
    };
  }

  /**
   * Actualizar reservación
   */
  async update(id: string, updateReservationDto: UpdateReservationDto) {
    const reservation = await this.prisma.reservations.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID "${id}" no encontrada`);
    }

    // No se pueden actualizar reservaciones canceladas
    if (reservation.status === reservation_status.CANCELADA) {
      throw new BadRequestException(
        'No se puede actualizar una reservación cancelada',
      );
    }

    const updateData: any = {};

    // Si se actualiza la mesa, validar
    if (updateReservationDto.table_id) {
      const table = await this.prisma.tables.findUnique({
        where: { id: updateReservationDto.table_id },
      });

      if (!table) {
        throw new NotFoundException(
          `Mesa con ID "${updateReservationDto.table_id}" no encontrada`,
        );
      }

      const dinersCount =
        updateReservationDto.diners_count || reservation.diners_count;
      if (dinersCount > table.capacity) {
        throw new BadRequestException(
          `La mesa tiene capacidad para ${table.capacity} personas`,
        );
      }

      updateData.table_id = updateReservationDto.table_id;
    }

    // Si se actualiza fecha/hora, recalcular datetime
    let newReservationDatetime = reservation.reservation_datetime;
    if (
      updateReservationDto.reservation_date ||
      updateReservationDto.reservation_time
    ) {
      const date = updateReservationDto.reservation_date
        ? updateReservationDto.reservation_date
        : reservation.reservation_datetime.toISOString().split('T')[0];

      const time = updateReservationDto.reservation_time
        ? updateReservationDto.reservation_time
        : reservation.reservation_datetime.toTimeString().substring(0, 5);

      newReservationDatetime = new Date(`${date}T${time}:00`);

      if (newReservationDatetime <= new Date()) {
        throw new BadRequestException(
          'La fecha de reservación debe ser futura',
        );
      }

      updateData.reservation_datetime = newReservationDatetime;
    }

    // Si se actualiza duración, recalcular end_datetime
    if (updateReservationDto.duration_hours) {
      const endDatetime = new Date(newReservationDatetime);
      endDatetime.setHours(
        endDatetime.getHours() + updateReservationDto.duration_hours,
      );
      updateData.end_datetime = endDatetime;
      updateData.duration_hours = updateReservationDto.duration_hours;
    }

    // Validar conflictos si cambió mesa, fecha o duración
    if (
      updateData.table_id ||
      updateData.reservation_datetime ||
      updateData.duration_hours
    ) {
      const tableId = updateData.table_id || reservation.table_id;
      const startTime =
        updateData.reservation_datetime || reservation.reservation_datetime;
      const duration = updateData.duration_hours || reservation.duration_hours;

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + duration);

      const conflicts = await this.prisma.reservations.findMany({
        where: {
          id: { not: id }, // Excluir esta reservación
          table_id: tableId,
          status: {
            in: [reservation_status.PENDIENTE, reservation_status.CONFIRMADA],
          },
          OR: [
            {
              AND: [
                { reservation_datetime: { lte: startTime } },
                { end_datetime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { reservation_datetime: { lt: endTime } },
                { end_datetime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { reservation_datetime: { gte: startTime } },
                { end_datetime: { lte: endTime } },
              ],
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw new ConflictException(
          'Ya existe una reservación activa para esta mesa en el horario solicitado',
        );
      }
    }

    // Otros campos
    if (updateReservationDto.client_name) {
      updateData.client_name = updateReservationDto.client_name;
    }
    if (updateReservationDto.client_phone) {
      updateData.client_phone = updateReservationDto.client_phone;
    }
    if (updateReservationDto.client_email !== undefined) {
      updateData.client_email = updateReservationDto.client_email;
    }
    if (updateReservationDto.diners_count) {
      updateData.diners_count = updateReservationDto.diners_count;
    }
    if (updateReservationDto.notes !== undefined) {
      updateData.notes = updateReservationDto.notes;
    }

    // Actualizar
    await this.prisma.reservations.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  /**
   * Confirmar reservación
   */
  async confirm(id: string, userId: string) {
    const reservation = await this.prisma.reservations.findUnique({
      where: { id },
      include: {
        confirmer: {
          select: { name: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID "${id}" no encontrada`);
    }

    if (reservation.status === reservation_status.CONFIRMADA) {
      throw new BadRequestException('La reservación ya está confirmada');
    }

    if (reservation.status === reservation_status.CANCELADA) {
      throw new BadRequestException(
        'No se puede confirmar una reservación cancelada',
      );
    }

    const updated = await this.prisma.reservations.update({
      where: { id },
      data: {
        status: reservation_status.CONFIRMADA,
        confirmed_by: userId,
        confirmed_at: new Date(),
      },
      include: {
        confirmer: {
          select: { name: true },
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      confirmed_by: updated.confirmer!.name,
      confirmed_at: updated.confirmed_at!,
      message: 'Reservación confirmada',
    };
  }

  /**
   * Cancelar reservación
   */
  async cancel(
    id: string,
    userId: string,
    cancelReservationDto: CancelReservationDto,
  ) {
    const reservation = await this.prisma.reservations.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID "${id}" no encontrada`);
    }

    if (reservation.status === reservation_status.CANCELADA) {
      throw new BadRequestException('La reservación ya está cancelada');
    }

    const updated = await this.prisma.reservations.update({
      where: { id },
      data: {
        status: reservation_status.CANCELADA,
        cancel_reason: cancelReservationDto.cancel_reason,
        cancelled_by: userId,
        cancelled_at: new Date(),
      },
      include: {
        canceller: {
          select: { name: true },
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      cancel_reason: updated.cancel_reason!,
      cancelled_by: updated.canceller!.name,
      cancelled_at: updated.cancelled_at!,
      message: 'Reservación cancelada',
    };
  }

  /**
   * Eliminar reservación (solo ADMIN)
   */
  async remove(id: string): Promise<void> {
    const reservation = await this.prisma.reservations.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID "${id}" no encontrada`);
    }

    await this.prisma.reservations.delete({
      where: { id },
    });
  }
}
