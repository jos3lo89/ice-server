import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { reservation_status } from 'src/generated/prisma/enums';

export class ReservationsQueryDto {
  @ApiPropertyOptional({
    description: 'Estado de la reservación',
    enum: reservation_status,
    example: 'CONFIRMADA',
  })
  @IsOptional()
  @IsEnum(reservation_status)
  status?: reservation_status;

  @ApiPropertyOptional({
    description: 'Fecha desde (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (YYYY-MM-DD)',
    example: '2024-01-25',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
