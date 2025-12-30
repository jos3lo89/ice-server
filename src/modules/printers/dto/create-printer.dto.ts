import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
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
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tipo de impresora',
    enum: PrinterType,
    example: PrinterType.TERMICA_80,
  })
  @IsEnum(PrinterType)
  type: string;

  @ApiProperty({
    description: 'Tipo de conexión',
    enum: ConnectionType,
    example: ConnectionType.NETWORK,
  })
  @IsEnum(ConnectionType)
  connection_type: string;

  @ApiPropertyOptional({
    description: 'Dirección de conexión (IP para red, puerto para USB/Serial)',
    example: '192.168.1.100',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    description: 'Área de preparación asignada',
    enum: area_preparacion,
    example: area_preparacion.COCINA,
  })
  @IsEnum(area_preparacion)
  area: area_preparacion;

  @ApiPropertyOptional({
    description: 'Es impresora por defecto del área',
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
}
