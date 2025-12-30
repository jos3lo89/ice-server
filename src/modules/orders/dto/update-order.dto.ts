import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'UUID de la mesa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  table_id?: string;

  @ApiPropertyOptional({
    description: 'Número de comensales',
    example: 5,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  diners_count?: number;

  @ApiPropertyOptional({
    description: 'Notas especiales de la orden',
    example: 'Actualización: Cliente cambió de mesa',
  })
  @IsOptional()
  notes?: string;
}
