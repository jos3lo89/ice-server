import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenCashRegisterDto {
  @ApiProperty({
    description: 'Monto inicial de la caja',
    example: 500.0,
    minimum: 0,
  })
  @IsNotEmpty({
    message: 'El monto inicial es obligatorio para abrir la caja.',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'El monto inicial debe ser un número con un máximo de 2 decimales.',
    },
  )
  @Min(0, { message: 'El monto inicial no puede ser un valor negativo.' })
  initial_amount: number;

  @ApiPropertyOptional({
    description: 'Notas de apertura (billetes, monedas, etc.)',
    example: 'Apertura turno mañana - billetes: 10x50, monedas: suelto',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'Las notas no pueden exceder los 1000 caracteres.',
  })
  notes?: string;
}
