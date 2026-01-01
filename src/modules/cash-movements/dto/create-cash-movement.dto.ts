import {
  IsEnum,
  IsNumber,
  IsString,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { cash_movement_type } from 'src/generated/prisma/enums';

export class CreateCashMovementDto {
  @ApiProperty({
    description: 'Tipo de movimiento (INGRESO o EGRESO)',
    enum: cash_movement_type,
    example: cash_movement_type.EGRESO,
  })
  @IsNotEmpty({ message: 'El tipo de movimiento es obligatorio.' })
  @IsEnum(cash_movement_type, {
    message: (args) =>
      `"${args.value}" no es un tipo de movimiento válido. Use uno de estos: ${Object.values(cash_movement_type).join(', ')}`,
  })
  type: cash_movement_type;

  @ApiProperty({
    description: 'Monto del movimiento',
    example: 50.0,
    minimum: 0.0,
  })
  @IsNotEmpty({ message: 'El monto del movimiento es obligatorio.' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales.' },
  )
  @Min(0.0, { message: 'El monto mínimo de movimiento debe ser de 0.01.' })
  amount: number;

  @ApiProperty({
    description: 'Descripción detallada del motivo del movimiento',
    example: 'Compra de insumos de limpieza',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'La descripción del movimiento es obligatoria.' })
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede exceder los 500 caracteres.',
  })
  description: string;
}
