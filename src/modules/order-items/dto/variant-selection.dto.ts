import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VariantSelectionDto {
  @ApiProperty({
    description: 'Nombre del grupo de variante',
    example: 'Término de la carne',
  })
  @IsString()
  @IsNotEmpty()
  group_name: string;

  @ApiProperty({
    description: 'Nombre de la opción seleccionada',
    example: 'Tres cuartos',
  })
  @IsString()
  @IsNotEmpty()
  option_name: string;

  @ApiProperty({
    description: 'Modificador de precio',
    example: 5.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  price_modifier: number;
}
