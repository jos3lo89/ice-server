import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { area_preparacion } from 'src/generated/prisma/enums';

export enum PrinterType {
  TERMICA_58 = 'TERMICA_58',
  TERMICA_80 = 'TERMICA_80',
  MATRICIAL = 'MATRICIAL',
  LASER = 'LASER',
}

export enum ConnectionType {
  USB = 'USB',
  NETWORK = 'NETWORK',
  BLUETOOTH = 'BLUETOOTH',
  SERIAL = 'SERIAL',
}

export class CreatePrinterDto {
  @ApiProperty({
    description: 'Nombre de la impresora',
    example: 'Impresora Cocina Principal',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre de la impresora es obligatorio.' })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Tipo de impresora',
    enum: PrinterType,
    example: PrinterType.TERMICA_80,
  })
  @IsNotEmpty({ message: 'El tipo de impresora es obligatorio.' })
  @IsEnum(PrinterType, {
    message: (args) =>
      `"${args.value}" no es un tipo de impresora válido. Use: ${Object.values(PrinterType).join(', ')}`,
  })
  type: string;

  @ApiProperty({
    description: 'Tipo de conexión',
    enum: ConnectionType,
    example: ConnectionType.NETWORK,
  })
  @IsNotEmpty({ message: 'El tipo de conexión es obligatorio.' })
  @IsEnum(ConnectionType, {
    message: (args) =>
      `"${args.value}" no es un tipo de conexión válido. Use: ${Object.values(ConnectionType).join(', ')}`,
  })
  connection_type: string;

  @ApiPropertyOptional({
    description: 'Dirección de conexión (IP para red, puerto para USB/Serial)',
    example: '192.168.1.100',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({
    message: 'La dirección de conexión debe ser una cadena de texto.',
  })
  @MaxLength(255, {
    message: 'La dirección es demasiado larga (máximo 255 caracteres).',
  })
  address?: string;

  @ApiProperty({
    description: 'Área de preparación asignada',
    enum: area_preparacion,
    example: area_preparacion.COCINA,
  })
  @IsNotEmpty({ message: 'El área de preparación es obligatoria.' })
  @IsEnum(area_preparacion, {
    message: (args) =>
      `"${args.value}" no es un área de preparación válida. Use: ${Object.values(area_preparacion).join(', ')}`,
  })
  area: area_preparacion;

  @ApiPropertyOptional({
    description: 'Es impresora por defecto del área',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'El valor "por defecto" debe ser un booleano (true/false).',
  })
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Estado activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano (true/false).' })
  is_active?: boolean;
}
