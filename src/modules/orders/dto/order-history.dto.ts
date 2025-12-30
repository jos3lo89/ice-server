import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { order_status } from 'src/generated/prisma/enums';

export class OrderHistoryDto {
  @ApiPropertyOptional({
    description: 'Fecha desde (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'ID del mesero/usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Estado de la orden',
    enum: order_status,
  })
  @IsOptional()
  @IsEnum(order_status)
  status?: order_status;

  @ApiPropertyOptional({
    description: 'UUID de la mesa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  table_id?: string;
}
