import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloseOrderDto {
  @ApiPropertyOptional({
    description: 'Notas finales al cerrar la orden',
    example: 'Cliente satisfecho',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
