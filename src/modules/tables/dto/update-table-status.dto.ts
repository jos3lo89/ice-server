import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { table_status } from 'src/generated/prisma/enums';

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: table_status,
    example: 'OCUPADA',
    description: 'Nuevo estado de la mesa',
  })
  @IsNotEmpty({ message: 'El estado de la mesa es obligatorio.' })
  @IsEnum(table_status, {
    message:
      'El estado seleccionado no es válido. Opciones permitidas: LIBRE, OCUPADA, RESERVADA, LIMPIEZA.',
  })
  status: table_status;
}
