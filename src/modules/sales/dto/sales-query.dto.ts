import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  comprobante_type,
  estado_sunat,
  payment_method,
} from 'src/generated/prisma/enums';

export class SalesQueryDto {
  @ApiPropertyOptional({
    description: 'Tipo de comprobante',
    enum: comprobante_type,
    example: 'BOLETA',
  })
  @IsOptional()
  @IsEnum(comprobante_type)
  tipo?: comprobante_type;

  @ApiPropertyOptional({
    description: 'Método de pago',
    enum: payment_method,
    example: 'EFECTIVO',
  })
  @IsOptional()
  @IsEnum(payment_method)
  payment_method?: payment_method;

  @ApiPropertyOptional({
    description: 'Estado SUNAT',
    enum: estado_sunat,
    example: 'ACEPTADO',
  })
  @IsOptional()
  @IsEnum(estado_sunat)
  estado_sunat?: estado_sunat;

  @ApiPropertyOptional({
    description: 'Fecha desde (ISO)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (ISO)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
