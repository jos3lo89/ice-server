import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseCashRegisterDto {
  @ApiProperty({
    description: 'Monto final contado en la caja',
    example: 2485.5,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  final_amount: number;

  @ApiPropertyOptional({
    description: 'Notas de cierre',
    example: 'Cierre sin novedad',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
