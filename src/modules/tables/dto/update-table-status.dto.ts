import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { table_status } from 'src/generated/prisma/enums';

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: table_status,
    example: 'OCUPADA',
    description: 'Nuevo estado de la mesa',
  })
  @IsEnum(table_status)
  status: table_status;
}
