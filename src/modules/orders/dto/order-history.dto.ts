import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { order_status } from 'src/generated/prisma/enums';

export class OrderHistoryDto {
  @ApiPropertyOptional({
    description: 'Fecha inicial de búsqueda (formato AAAA-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'La fecha de inicio debe tener un formato válido (AAAA-MM-DD).',
    },
  )
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha final de búsqueda (formato AAAA-MM-DD)',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha final debe tener un formato válido (AAAA-MM-DD).' },
  )
  to?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por el ID del mesero o usuario que tomó la orden',
    example: 'uuid-v4-123',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'El ID del usuario debe ser un identificador UUID válido.',
  })
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por el estado de la orden',
    enum: order_status,
  })
  @IsOptional()
  @IsEnum(order_status, {
    message: (args) =>
      `"${args.value}" no es un estado de orden válido. Use uno de estos: ${Object.values(order_status).join(', ')}`,
  })
  status?: order_status;

  @ApiPropertyOptional({
    description: 'Filtrar por una mesa específica',
    example: 'uuid-v4-123',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'El ID de la mesa debe ser un identificador UUID válido.',
  })
  table_id?: string;
}
