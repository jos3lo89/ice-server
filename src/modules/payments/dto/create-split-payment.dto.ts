import { IsUUID, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SplitPaymentItemDto } from './split-payment-item.dto';

export class CreateSplitPaymentDto {
  @ApiProperty({
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Lista de pagos individuales',
    type: [SplitPaymentItemDto],
    example: [
      {
        payer_name: 'Juan',
        payment_method: 'EFECTIVO',
        amount: 42.0,
        amount_received: 50.0,
        item_ids: ['uuid-item-1'],
        generate_document: true,
        document_type: 'BOLETA',
      },
      {
        payer_name: 'María',
        payment_method: 'YAPE',
        amount: 42.0,
        item_ids: ['uuid-item-2'],
        generate_document: true,
        document_type: 'BOLETA',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentItemDto)
  payments: SplitPaymentItemDto[];
}
