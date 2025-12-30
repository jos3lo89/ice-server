import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'admin',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MinLength(3, {
    message: 'El nombre de usuario es muy corto (mínimo 3 caracteres)',
  })
  @MaxLength(50, {
    message: 'El nombre de usuario es muy largo (máximo 50 caracteres)',
  })
  username: string;

  @ApiProperty({
    description: 'Contraseña de acceso a la cuenta',
    example: 'admin123',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class LoginPinDto {
  @ApiProperty({
    description: 'PIN de seguridad de 6 dígitos asignado al trabajador',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'El PIN debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El PIN es obligatorio' })
  @MinLength(6, { message: 'El PIN debe tener exactamente 6 caracteres' })
  @MaxLength(6, { message: 'El PIN no puede exceder los 6 caracteres' })
  pin: string;
}
