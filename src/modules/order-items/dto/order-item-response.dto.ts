import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  area_preparacion,
  order_item_status,
} from 'src/generated/prisma/enums';

export class OrderItemCreatedDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Lomo Saltado' })
  product_name: string;

  @ApiPropertyOptional({ example: 'Lomo' })
  product_short_name?: string | null;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 42.0 })
  unit_price: number;

  @ApiProperty({ example: 5.0 })
  variants_total: number;

  @ApiProperty({ example: 94.0 })
  line_total: number;

  @ApiProperty({ enum: order_item_status, example: 'PENDIENTE' })
  status: order_item_status;

  @ApiProperty({ enum: area_preparacion, example: 'COCINA' })
  area: area_preparacion;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  notes?: string | null;

  @ApiProperty({
    example: [{ group_name: 'Término', option_name: '3/4', price_modifier: 0 }],
  })
  variants_snapshot: any;
}
