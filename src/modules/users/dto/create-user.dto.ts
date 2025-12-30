import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { user_role } from 'src/generated/prisma/enums';

export class CreateUserDto {
  @ApiProperty({
    example: 'Jose Manuel',
    description: 'Nombre completo del trabajador',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: '70809010', description: 'DNI de 8 dígitos' })
  @IsString({ message: 'El DNI debe ser texto' })
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  dni: string;

  @ApiProperty({
    example: 'jmanuel',
    description: 'Nombre de usuario para el sistema',
  })
  @IsString({ message: 'El nombre de usuario debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MinLength(4, { message: 'El nombre de usuario es muy corto' })
  username: string;

  @ApiProperty({ example: 'Mankora2025!', description: 'Contraseña de acceso' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    enum: user_role,
    example: 'MESERO',
    description: 'Rol asignado en el restaurante',
  })
  @IsEnum(user_role, { message: 'El rol asignado no es válido' })
  role: user_role;

  @ApiProperty({
    example: '123456',
    description: 'PIN de 6 dígitos para acceso rápido',
    required: false,
  })
  @IsString({ message: 'El PIN debe ser texto' })
  @IsOptional()
  @Length(6, 6, { message: 'El PIN debe tener exactamente 6 dígitos' })
  pin?: string;
}
