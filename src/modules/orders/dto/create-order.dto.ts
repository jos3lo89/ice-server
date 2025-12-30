import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'UUID de la mesa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  table_id: string;

  @ApiProperty({
    description: 'Número de comensales',
    example: 4,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  diners_count: number;

  @ApiPropertyOptional({
    description: 'Notas especiales de la orden',
    example: 'Cliente alérgico al maní',
  })
  @IsOptional()
  notes?: string;
}
