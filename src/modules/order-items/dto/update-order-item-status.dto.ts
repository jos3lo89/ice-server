import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { order_item_status } from 'src/generated/prisma/enums';

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    description: 'Nuevo estado del item',
    enum: order_item_status,
    example: 'EN_PREPARACION',
  })
  @IsEnum(order_item_status)
  status: order_item_status;
}
