import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { area_preparacion } from 'src/generated/prisma/enums';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Postres',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Slug único para la categoría',
    example: 'postres',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Postres y dulces de la casa',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría padre (para subcategorías)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({
    description: 'Área de preparación por defecto',
    enum: area_preparacion,
    example: 'COCINA',
    default: 'COCINA',
  })
  @IsEnum(area_preparacion)
  default_area: area_preparacion;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Icono de la categoría',
    example: 'cake',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color en formato hexadecimal',
    example: '#FFAAA5',
    maxLength: 7,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Ruta de la imagen',
    example: '/uploads/categories/postres.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_path?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la categoría',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
