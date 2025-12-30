import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class BulkCreateOrderItemsDto {
  @ApiProperty({
    description: 'Lista de items a agregar',
    type: [CreateOrderItemDto],
    example: [
      {
        product_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
        variants: [
          {
            group_name: 'Término',
            option_name: 'Medio',
            price_modifier: 0,
          },
        ],
      },
      {
        product_id: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 4,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
