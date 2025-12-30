import {
  IsNumber,
  IsOptional,
  IsString,
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initial_amount: number;

  @ApiPropertyOptional({
    description: 'Notas de apertura (billetes, monedas, etc.)',
    example: 'Apertura turno mañana - billetes: 10x50, monedas: suelto',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
