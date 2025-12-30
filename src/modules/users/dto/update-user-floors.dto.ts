import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserFloorsDto {
  @ApiProperty({
    description: 'Arreglo de UUIDs de los pisos que se asignarán al usuario',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '671e8400-e29b-41d4-a716-446655441111',
    ],
    type: [String],
  })
  @IsArray({ message: 'floorIds debe ser un arreglo' })
  @IsUUID('4', {
    each: true,
    message: 'Cada ID de piso debe ser un UUID válido',
  })
  floorIds: string[];
}
