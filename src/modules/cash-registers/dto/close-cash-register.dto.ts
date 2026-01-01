import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseCashRegisterDto {
  @ApiProperty({
    description: 'Monto final contado físicamente en la caja',
    example: 2485.5,
    minimum: 0,
  })
  @IsNotEmpty({
    message: 'El monto final contado es obligatorio para cerrar la caja.',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'El monto final debe ser un número con un máximo de 2 decimales.',
    },
  )
  @Min(0, { message: 'El monto final no puede ser un valor negativo.' })
  final_amount: number;

  @ApiPropertyOptional({
    description: 'Notas u observaciones del cierre (ej: motivo de faltantes)',
    example: 'Cierre sin novedad - se adjunta reporte de tickets',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Las notas de cierre deben ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'Las notas no pueden exceder los 1000 caracteres.',
  })
  notes?: string;
}
