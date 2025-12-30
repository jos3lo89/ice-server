import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({
    example: 'uuid-del-piso',
    description: 'ID del piso al que pertenece la mesa',
  })
  @IsUUID()
  floor_id: string;

  @ApiProperty({
    example: 101,
    description: 'Número único de la mesa en el piso',
  })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({
    example: 'Mesa Familiar 1',
    required: false,
    description: 'Nombre personalizado para la mesa',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 4, description: 'Capacidad de comensales' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    example: 150,
    description: 'Posición X en el mapa visual',
    required: false,
  })
  @IsInt()
  @IsOptional()
  pos_x?: number;

  @ApiProperty({
    example: 200,
    description: 'Posición Y en el mapa visual',
    required: false,
  })
  @IsInt()
  @IsOptional()
  pos_y?: number;
}
