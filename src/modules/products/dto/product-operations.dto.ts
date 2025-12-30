import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    description:
      'Cantidad a ajustar (positivo para agregar, negativo para restar)',
    example: -5,
  })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Razón del ajuste',
    example: 'Venta del día',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  reason?: string;
}

export class ToggleAvailabilityDto {
  @ApiProperty({
    description: 'Estado de disponibilidad',
    example: false,
  })
  @IsBoolean()
  is_available: boolean;

  @ApiPropertyOptional({
    description: 'Razón del cambio',
    example: 'Producto agotado temporalmente',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class AddVariantGroupDto {
  @ApiProperty({
    description: 'Nombre del grupo de variantes',
    example: 'Extras',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Es requerido',
    example: false,
  })
  @IsBoolean()
  is_required: boolean;

  @ApiProperty({
    description: 'Máximo de selecciones',
    example: 3,
  })
  @IsInt()
  max_selections: number;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 0,
  })
  @IsInt()
  display_order?: number;
}
