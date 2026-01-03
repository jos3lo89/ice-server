import {
  IsInt,
  IsOptional,
  IsUUID,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'UUID de la mesa asignada a la orden',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({
    message: 'El ID de la mesa es obligatorio para crear una orden.',
  })
  @IsUUID('4', {
    message: 'El identificador de la mesa debe ser un UUID válido.',
  })
  table_id: string;

  @ApiProperty({
    description: 'Número de personas en la mesa',
    example: 4,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Debe indicar el número de comensales.' })
  @IsInt({ message: 'El número de comensales debe ser un número entero.' })
  @Min(1, { message: 'La orden debe tener al menos 1 comensal.' })
  diners_count: number;

  @ApiPropertyOptional({
    description: 'Notas generales de la orden o alergias',
    example: 'Cliente alérgico al maní',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto.' })
  notes?: string;
}
