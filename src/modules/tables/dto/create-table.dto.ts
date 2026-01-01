import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({
    example: 'uuid-del-piso',
    description: 'ID del piso al que pertenece la mesa',
  })
  @IsUUID('4', {
    message: 'El ID del piso debe ser un identificador válido.',
  })
  floor_id: string;

  @ApiProperty({
    example: 101,
    description: 'Número único de la mesa en el piso',
  })
  @IsInt({ message: 'El número de mesa debe ser un número entero.' })
  @Min(1, { message: 'El número de mesa debe ser al menos 1.' })
  number: number;

  @ApiProperty({
    example: 'Mesa Familiar 1',
    required: false,
    description: 'Nombre personalizado para la mesa',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 4, description: 'Capacidad de comensales' })
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser de al menos 1 persona.' })
  capacity: number;

  @ApiProperty({
    example: 150,
    description: 'Posición X en el mapa visual',
    required: false,
  })
  @IsInt({ message: 'La posición X debe ser un número entero.' })
  @IsOptional()
  pos_x?: number;

  @ApiProperty({
    example: 200,
    description: 'Posición Y en el mapa visual',
    required: false,
  })
  @IsInt({ message: 'La posición Y debe ser un número entero.' })
  @IsOptional()
  pos_y?: number;
}
