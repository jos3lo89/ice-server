import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { tipo_nota_credito } from 'src/generated/prisma/enums';

export class VoidSaleDto {
  @ApiProperty({
    description: 'Motivo de anulación',
    example: 'Error en la digitación del documento',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;

  @ApiProperty({
    description: 'Tipo de nota de crédito',
    enum: tipo_nota_credito,
    example: 'ANULACION_OPERACION',
  })
  @IsEnum(tipo_nota_credito)
  tipo_nota: tipo_nota_credito;
}
