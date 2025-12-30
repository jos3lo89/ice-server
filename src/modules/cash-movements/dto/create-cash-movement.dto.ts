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
    description: 'Tipo de movimiento',
    enum: cash_movement_type,
    example: cash_movement_type.EGRESO,
  })
  @IsEnum(cash_movement_type)
  type: cash_movement_type;

  @ApiProperty({
    description: 'Monto del movimiento',
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Descripción del movimiento',
    example: 'Compra de insumos de limpieza',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}
