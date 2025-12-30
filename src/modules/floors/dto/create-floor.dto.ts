import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({
    example: 'Primer Piso',
    description: 'Nombre descriptivo del área',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'Nivel numérico único para el piso' })
  @IsInt()
  @Min(0)
  level: number;

  @ApiProperty({
    example: 'Salón principal con vista a la calle',
    description: 'Detalles adicionales sobre el área',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
