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
  IsNotEmpty,
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
  @IsNotEmpty({ message: 'La categoría es obligatoria.' })
  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido.' })
  category_id: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Lomo Saltado',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio.' })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(255, { message: 'El nombre no puede exceder los 255 caracteres.' })
  name: string;

  @ApiPropertyOptional({
    description: 'Nombre corto para tickets',
    example: 'Lomo Salt.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El nombre corto debe ser una cadena de texto.' })
  @MaxLength(50, {
    message: 'El nombre corto no puede exceder los 50 caracteres.',
  })
  short_name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    example: 'Lomo fino salteado con papas fritas y arroz',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  description?: string;

  @ApiProperty({
    description: 'Precio de venta',
    example: 42.0,
  })
  @IsNotEmpty({ message: 'El precio es obligatorio.' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser menor a 0.' })
  price: number;

  @ApiPropertyOptional({
    description: 'Costo del producto',
    example: 15.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El costo debe ser un número válido.' },
  )
  @Min(0, { message: 'El costo no puede ser menor a 0.' })
  cost?: number;

  @ApiProperty({
    description: 'Área de preparación',
    enum: area_preparacion,
    example: 'COCINA',
  })
  @IsNotEmpty({ message: 'El área de preparación es obligatoria.' })
  @IsEnum(area_preparacion, {
    message: (args) =>
      `"${args.value}" no es un área válida. Use: ${Object.values(area_preparacion).join(', ')}`,
  })
  area_preparacion: area_preparacion;

  @ApiPropertyOptional({
    description: 'Unidad de medida SUNAT',
    example: 'NIU',
    default: 'NIU',
    maxLength: 3,
  })
  @IsOptional()
  @IsString({ message: 'La unidad de medida debe ser texto.' })
  @MaxLength(3, {
    message:
      'La unidad de medida debe tener máximo 3 caracteres (ej: NIU, KG).',
  })
  unidad_medida?: string;

  @ApiPropertyOptional({
    description: 'Código del producto',
    example: 'LOMO001',
    maxLength: 30,
  })
  @IsOptional()
  @IsString({ message: 'El código del producto debe ser texto.' })
  @MaxLength(30, { message: 'El código no puede exceder los 30 caracteres.' })
  codigo_producto?: string;

  @ApiPropertyOptional({
    description: 'Código de afectación IGV SUNAT',
    example: '10',
    default: '10',
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'El código de afectación debe ser texto.' })
  @MaxLength(2, { message: 'El código de afectación debe tener 2 caracteres.' })
  afectacion_igv?: string;

  @ApiPropertyOptional({
    description: 'Aplica impuesto ICBPER (bolsas plásticas)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El valor de ICBPER debe ser un booleano.' })
  aplica_icbper?: boolean;

  @ApiPropertyOptional({
    description: 'El stock es administrado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'La gestión de stock debe ser verdadera o falsa.' })
  is_stock_managed?: boolean;

  @ApiPropertyOptional({
    description: 'Stock actual',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El stock actual debe ser un número entero.' })
  @Min(0, { message: 'El stock actual no puede ser menor a 0.' })
  stock_actual?: number;

  @ApiPropertyOptional({
    description: 'Stock mínimo',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero.' })
  @Min(0, { message: 'El stock mínimo no puede ser menor a 0.' })
  stock_minimo?: number;

  @ApiPropertyOptional({
    description: 'Ruta de la imagen',
    example: '/uploads/products/lomo-saltado.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La ruta de la imagen debe ser texto.' })
  @MaxLength(500, { message: 'La ruta de la imagen es demasiado larga.' })
  image_path?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El orden de visualización debe ser entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Producto disponible para venta',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'La disponibilidad debe ser booleana.' })
  is_available?: boolean;

  @ApiPropertyOptional({
    description: 'Producto activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano.' })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Producto destacado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El valor destacado debe ser booleano.' })
  is_featured?: boolean;

  @ApiPropertyOptional({
    description: 'Grupos de variantes del producto',
    type: [CreateVariantGroupDto],
  })
  @IsOptional()
  @IsArray({ message: 'Las variantes deben ser una lista (array).' })
  @ValidateNested({
    each: true,
    message: 'Cada grupo de variantes debe ser válido.',
  })
  @Type(() => CreateVariantGroupDto)
  variant_groups?: CreateVariantGroupDto[];
}
