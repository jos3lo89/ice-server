import {
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVariantOptionDto {
  @ApiProperty({
    description: 'Nombre de la opción (ej: Término medio, Extra Queso)',
    example: 'Término medio',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre de la opción es obligatorio.' })
  @IsString({ message: 'El nombre de la opción debe ser una cadena de texto.' })
  @MaxLength(100, {
    message: 'El nombre de la opción no puede exceder los 100 caracteres.',
  })
  name: string;

  @ApiProperty({
    description:
      'Modificador de precio (cuánto aumenta o disminuye el precio base)',
    example: 0,
    default: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'El modificador de precio debe ser un número con hasta 2 decimales.',
    },
  )
  price_modifier: number;

  @ApiPropertyOptional({
    description: 'Indica si esta opción viene seleccionada por defecto',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'El valor de "por defecto" debe ser booleano (true/false).',
  })
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Estado activo de la opción',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano (true/false).' })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Orden de visualización en el menú',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El orden de visualización debe ser un número entero.' })
  @Min(0, { message: 'El orden de visualización no puede ser menor a 0.' })
  display_order?: number;
}

export class CreateVariantGroupDto {
  @ApiProperty({
    description: 'Nombre del grupo (ej: Término de la carne, Elige tu bebida)',
    example: 'Término de la carne',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre del grupo de variantes es obligatorio.' })
  @IsString({ message: 'El nombre del grupo debe ser una cadena de texto.' })
  @MaxLength(100, {
    message: 'El nombre del grupo no puede exceder los 100 caracteres.',
  })
  name: string;

  @ApiPropertyOptional({
    description:
      'Si es verdadero, el cliente debe seleccionar al menos una opción',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'El valor de "requerido" debe ser booleano (true/false).',
  })
  is_required?: boolean;

  @ApiProperty({
    description: 'Número máximo de opciones que el cliente puede elegir',
    example: 1,
    default: 1,
  })
  @IsInt({
    message: 'El número máximo de selecciones debe ser un número entero.',
  })
  @Min(1, { message: 'Debe permitir al menos 1 selección máxima.' })
  max_selections: number;

  @ApiPropertyOptional({
    description: 'Orden de visualización del grupo',
    example: 1,
    default: 3,
  })
  @IsOptional()
  @IsInt({ message: 'El orden del grupo debe ser un número entero.' })
  @Min(0, { message: 'El orden del grupo no puede ser menor a 0.' })
  display_order?: number;

  @ApiProperty({
    description: 'Lista de opciones pertenecientes a este grupo',
    type: [CreateVariantOptionDto],
  })
  @IsArray({ message: 'Las opciones deben enviarse en una lista (array).' })
  @IsNotEmpty({ message: 'El grupo debe tener al menos una opción.' })
  @ValidateNested({
    each: true,
    message: 'Una de las opciones enviadas no es válida.',
  })
  @Type(() => CreateVariantOptionDto)
  options: CreateVariantOptionDto[];
}
