import {
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVariantOptionDto {
  @ApiProperty({
    description: 'Nombre de la opción',
    example: 'Término medio',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Modificador de precio',
    example: 0,
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  price_modifier: number;

  @ApiPropertyOptional({
    description: 'Es opción por defecto',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Estado activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class CreateVariantGroupDto {
  @ApiProperty({
    description: 'Nombre del grupo de variantes',
    example: 'Término de la carne',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Es requerido seleccionar',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiProperty({
    description: 'Número máximo de selecciones',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  max_selections: number;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiProperty({
    description: 'Opciones del grupo',
    type: [CreateVariantOptionDto],
  })
  @Type(() => CreateVariantOptionDto)
  options: CreateVariantOptionDto[];
}
