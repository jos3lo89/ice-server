import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'La contraseña actual del usuario para verificar identidad',
    example: 'MiClaveAntigua123!',
  })
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debes ingresar tu contraseña actual' })
  currentPassword: string;

  @ApiProperty({
    description: 'La nueva contraseña que se desea establecer',
    example: 'NuevaClaveSegura2026!',
    minLength: 6,
  })
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  newPassword: string;
}
