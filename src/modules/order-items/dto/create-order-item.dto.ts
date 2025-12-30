import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VariantSelectionDto } from './variant-selection.dto';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'UUID del producto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  product_id: string;

  @ApiProperty({
    description: 'Cantidad',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Notas especiales',
    example: 'Sin cebolla',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Variantes seleccionadas',
    type: [VariantSelectionDto],
    example: [
      {
        group_name: 'Término de la carne',
        option_name: 'Tres cuartos',
        price_modifier: 0,
      },
      {
        group_name: 'Extras',
        option_name: 'Extra papas',
        price_modifier: 5.0,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantSelectionDto)
  variants?: VariantSelectionDto[];
}
