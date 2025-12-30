import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  Min,
  ValidateIf,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { comprobante_type, payment_method } from 'src/generated/prisma/enums';

export class SplitPaymentItemDto {
  @ApiProperty({
    description: 'Nombre del pagador',
    example: 'Juan',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  payer_name: string;

  @ApiProperty({
    description: 'Método de pago',
    enum: payment_method,
    example: 'EFECTIVO',
  })
  @IsEnum(payment_method)
  payment_method: payment_method;

  @ApiProperty({
    description: 'Monto a pagar',
    example: 42.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Monto recibido (solo para EFECTIVO)',
    example: 50.0,
    minimum: 0.01,
  })
  @ValidateIf((o) => o.payment_method === payment_method.EFECTIVO)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount_received?: number;

  @ApiProperty({
    description: 'IDs de los items que cubre este pago',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  item_ids: string[];

  @ApiProperty({
    description: 'Generar comprobante',
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
    description: 'UUID del cliente (para FACTURA)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    example: 'Pago de Juan',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  payer_notes?: string;
}
