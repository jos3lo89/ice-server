import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendToKitchenDto {
  @ApiProperty({
    description: 'UUID de la orden',
    example: 'uuid-v4-123',
  })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Lista de UUIDs de items a enviar',
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  item_ids: string[];
}
