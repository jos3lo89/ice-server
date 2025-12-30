import {
  IsString,
  IsNumber,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateVariantGroupDto } from './variant.dto';
import { area_preparacion } from 'src/generated/prisma/enums';

export class CreateProductDto {
  @ApiProperty({
    description: 'ID de la categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  category_id: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Lomo Saltado',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Nombre corto para tickets',
    example: 'Lomo Salt.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  short_name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    example: 'Lomo fino salteado con papas fritas y arroz',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Precio de venta',
    example: 42.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Costo del producto',
    example: 15.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiProperty({
    description: 'Área de preparación',
    enum: area_preparacion,
    example: 'COCINA',
  })
  @IsEnum(area_preparacion)
  area_preparacion: area_preparacion;

  @ApiPropertyOptional({
    description: 'Unidad de medida SUNAT',
    example: 'NIU',
    default: 'NIU',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  unidad_medida?: string;

  @ApiPropertyOptional({
    description: 'Código del producto',
    example: 'LOMO001',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo_producto?: string;

  @ApiPropertyOptional({
    description: 'Código de afectación IGV SUNAT',
    example: '10',
    default: '10',
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  afectacion_igv?: string;

  @ApiPropertyOptional({
    description: 'Aplica impuesto ICBPER (bolsas plásticas)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  aplica_icbper?: boolean;

  @ApiPropertyOptional({
    description: 'El stock es administrado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_stock_managed?: boolean;

  @ApiPropertyOptional({
    description: 'Stock actual',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_actual?: number;

  @ApiPropertyOptional({
    description: 'Stock mínimo',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @ApiPropertyOptional({
    description: 'Ruta de la imagen',
    example: '/uploads/products/lomo-saltado.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_path?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Producto disponible para venta',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @ApiPropertyOptional({
    description: 'Producto activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Producto destacado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({
    description: 'Grupos de variantes del producto',
    type: [CreateVariantGroupDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantGroupDto)
  variant_groups?: CreateVariantGroupDto[];
}
