import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { payment_method } from 'src/generated/prisma/enums';
import { comprobante_type } from 'src/generated/prisma/enums';

export class ItemAllocationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del item de la orden',
  })
  @IsNotEmpty({ message: 'El ID del item es obligatorio' })
  item_id: string;

  @ApiProperty({
    example: 2,
    description: 'Cantidad a pagar de este item',
  })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  quantity: number;

  @ApiProperty({
    example: 25.5,
    description: 'Monto a pagar por este item',
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  amount: number;
}

export class IncrementalPaymentDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre del pagador',
  })
  @IsString({ message: 'El nombre del pagador debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del pagador es obligatorio' })
  payer_name: string;

  @ApiProperty({
    enum: payment_method,
    example: 'EFECTIVO',
    description: 'Método de pago',
  })
  @IsEnum(payment_method, { message: 'El método de pago no es válido' })
  payment_method: payment_method;

  @ApiProperty({
    example: 50.0,
    description: 'Monto total del pago',
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  amount: number;

  @ApiProperty({
    example: 60.0,
    description: 'Monto recibido (solo para efectivo)',
    required: false,
  })
  @IsNumber({}, { message: 'El monto recibido debe ser un número' })
  @IsOptional()
  @Min(0.01, { message: 'El monto recibido mínimo es 0.01' })
  amount_received?: number;

  @ApiProperty({
    example: true,
    description: 'Generar comprobante fiscal',
    required: false,
  })
  @IsOptional()
  generate_document?: boolean;

  @ApiProperty({
    enum: comprobante_type,
    example: 'BOLETA',
    description: 'Tipo de comprobante (si se genera)',
    required: false,
  })
  @IsOptional()
  @IsEnum(comprobante_type, { message: 'El tipo de comprobante no es válido' })
  document_type?: comprobante_type;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del cliente (requerido para FACTURA)',
    required: false,
  })
  @IsOptional()
  client_id?: string;

  @ApiProperty({
    example: 'Paga parte de la cena',
    description: 'Notas del pagador',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  payer_notes?: string;

  @ApiProperty({
    type: [ItemAllocationDto],
    description: 'Items y cantidades a pagar',
  })
  @IsArray({ message: 'Las asignaciones de items deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => ItemAllocationDto)
  item_allocations: ItemAllocationDto[];
}

export class CreateIncrementalPaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la orden',
  })
  @IsNotEmpty({ message: 'El ID de la orden es obligatorio' })
  order_id: string;

  @ApiProperty({
    type: [IncrementalPaymentDto],
    description: 'Array de pagos incrementales',
  })
  @IsArray({ message: 'Los pagos deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => IncrementalPaymentDto)
  payments: IncrementalPaymentDto[];
}
