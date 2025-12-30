import {
  IsString,
  IsEnum,
  IsEmail,
  IsOptional,
  MaxLength,
  Matches,
  Length,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { tipo_documento_identidad } from 'src/generated/prisma/enums';

export class CreateClientDto {
  @ApiProperty({
    description: 'Tipo de documento de identidad',
    enum: tipo_documento_identidad,
    example: tipo_documento_identidad.DNI,
  })
  @IsEnum(tipo_documento_identidad)
  tipo_documento: tipo_documento_identidad;

  @ApiProperty({
    description: 'Número de documento (DNI: 8 dígitos, RUC: 11 dígitos, etc.)',
    example: '12345678',
    maxLength: 15,
  })
  @IsString()
  @MaxLength(15)
  @ValidateIf((o) => o.tipo_documento === tipo_documento_identidad.DNI)
  @Length(8, 8, { message: 'DNI debe tener 8 dígitos' })
  @Matches(/^\d+$/, { message: 'DNI debe contener solo números' })
  @ValidateIf((o) => o.tipo_documento === tipo_documento_identidad.RUC)
  @Length(11, 11, { message: 'RUC debe tener 11 dígitos' })
  @Matches(/^\d+$/, { message: 'RUC debe contener solo números' })
  numero_documento: string;

  @ApiProperty({
    description:
      'Razón social (para empresas) o Nombres y Apellidos (para personas)',
    example: 'EMPRESA EJEMPLO SAC',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  razon_social: string;

  @ApiPropertyOptional({
    description: 'Nombre comercial',
    example: 'Mi Empresa',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre_comercial?: string;

  @ApiPropertyOptional({
    description: 'Dirección fiscal',
    example: 'Av. Principal 123, Lima',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Código de ubigeo INEI (6 dígitos)',
    example: '150101',
    maxLength: 6,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Ubigeo debe tener 6 dígitos' })
  @Matches(/^\d+$/, { message: 'Ubigeo debe contener solo números' })
  ubigeo?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico',
    example: 'contacto@empresa.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({
    description: 'Teléfono',
    example: '01-1234567',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Estado activo',
    example: true,
    default: true,
  })
  @IsOptional()
  is_active?: boolean;
}
