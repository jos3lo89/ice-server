import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { cash_register_status } from 'src/generated/prisma/enums';

export class CashRegisterHistoryDto {
  @ApiPropertyOptional({
    description: 'Fecha desde (formato YYYY-MM-DD)',
    example: '2025-12-01',
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
    description: 'Fecha hasta (formato YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha final debe tener un formato válido (AAAA-MM-DD).' },
  )
  to?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario (cajero)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'El ID del usuario debe ser un identificador UUID válido.',
  })
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Estado de la caja (ABIERTA o CERRADA)',
    enum: cash_register_status,
  })
  @IsOptional()
  @IsEnum(cash_register_status, {
    message: (args) =>
      `"${args.value}" no es un estado válido. Use uno de estos: ${Object.values(cash_register_status).join(', ')}`,
  })
  status?: cash_register_status;
}
