import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsBoolean,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { area_preparacion } from 'src/generated/prisma/enums';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Postres',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio.' })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Slug único para la categoría',
    example: 'postres',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El slug es obligatorio para la URL.' })
  @IsString({ message: 'El slug debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'El slug no puede exceder los 100 caracteres.' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Postres y dulces de la casa',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres.',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría padre (para subcategorías)',
    example: 'uuid-1234',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'El ID de la categoría padre debe ser un ID válido.',
  })
  parent_id?: string;

  @ApiProperty({
    description: 'Área de preparación por defecto',
    enum: area_preparacion,
    example: 'BEBIDAS',
    default: 'COCINA',
  })
  @IsEnum(area_preparacion, {
    message: (args) =>
      `El área "${args.value}" no es válida. Use una de estas: ${Object.values(area_preparacion).join(', ')}`,
  })
  default_area: area_preparacion;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'El orden de visualización debe ser un número entero.' })
  @Min(1, { message: 'El orden de visualización no puede ser menor a 1.' })
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Icono de la categoría',
    example: 'cake',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El nombre del icono debe ser una cadena de texto.' })
  @MaxLength(50, {
    message: 'El nombre del icono no puede exceder los 50 caracteres.',
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color en formato hexadecimal',
    example: '#FFAAA5',
    maxLength: 7,
  })
  @IsOptional()
  @IsString({ message: 'El código de color debe ser una cadena de texto.' })
  @MaxLength(7, {
    message:
      'El código de color debe tener el formato #XXXXXX (máximo 7 caracteres).',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Ruta de la imagen',
    example: '/uploads/categories/postres.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La ruta de la imagen debe ser una cadena de texto.' })
  @MaxLength(500, {
    message: 'La ruta de la imagen es demasiado larga (máximo 500 caracteres).',
  })
  image_path?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la categoría',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'El estado activo debe ser un valor booleano (true/false).',
  })
  is_active?: boolean;
}
