import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { tipo_documento_identidad } from 'src/generated/prisma/enums';

export class SearchClientDto {
  @ApiPropertyOptional({
    description: 'Número de documento a buscar',
    example: '20123456789',
  })
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento',
    enum: tipo_documento_identidad,
  })
  @IsOptional()
  @IsEnum(tipo_documento_identidad)
  tipo?: tipo_documento_identidad;

  @ApiPropertyOptional({
    description: 'Buscar por nombre o razón social',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Email del cliente',
    example: 'cliente@email.com',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
