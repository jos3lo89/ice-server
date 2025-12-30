import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { comprobante_type, payment_method } from 'src/generated/prisma/enums';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'UUID de la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Método de pago',
    enum: payment_method,
    example: 'EFECTIVO',
  })
  @IsEnum(payment_method)
  payment_method: payment_method;

  @ApiProperty({
    description: 'Monto a pagar',
    example: 125.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Monto recibido (solo para EFECTIVO)',
    example: 150.0,
    minimum: 0.01,
  })
  @ValidateIf((o) => o.payment_method === payment_method.EFECTIVO)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount_received?: number;

  @ApiProperty({
    description: 'Generar comprobante electrónico',
    example: true,
  })
  @IsBoolean()
  generate_document: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de comprobante',
    enum: comprobante_type,
    example: 'BOLETA',
  })
  @ValidateIf((o) => o.generate_document === true)
  @IsEnum(comprobante_type)
  document_type?: comprobante_type;

  @ApiPropertyOptional({
    description: 'UUID del cliente (requerido para FACTURA)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales del pagador',
    example: 'Cliente satisfecho',
  })
  @IsOptional()
  @IsString()
  payer_notes?: string;
}
