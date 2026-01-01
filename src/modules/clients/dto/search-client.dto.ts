import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { tipo_documento_identidad } from 'src/generated/prisma/enums';

export class SearchClientDto {
  @ApiPropertyOptional({
    description: 'Número de documento a buscar',
    example: '20123456789',
  })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser una cadena de texto.' })
  documento?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento',
    enum: tipo_documento_identidad,
  })
  @IsOptional()
  @IsEnum(tipo_documento_identidad, {
    message: (args) =>
      `"${args.value}" no es un tipo de documento válido. Use uno de estos: ${Object.values(tipo_documento_identidad).join(', ')}`,
  })
  tipo?: tipo_documento_identidad;

  @ApiPropertyOptional({
    description: 'Buscar por nombre o razón social',
    example: 'Juan',
  })
  @IsOptional()
  @IsString({ message: 'El nombre de búsqueda debe ser una cadena de texto.' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Email del cliente',
    example: 'cliente@email.com',
  })
  @IsOptional()
  @IsString({ message: 'El correo electrónico debe ser una cadena de texto.' })
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  email?: string;
}
