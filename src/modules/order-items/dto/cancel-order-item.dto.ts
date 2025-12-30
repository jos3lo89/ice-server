import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderItemDto {
  @ApiProperty({
    description: 'Razón de la cancelación',
    example: 'Cliente cambió de opinión',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
