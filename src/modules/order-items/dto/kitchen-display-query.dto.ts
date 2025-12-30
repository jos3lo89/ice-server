import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { area_preparacion } from 'src/generated/prisma/enums';

export class KitchenDisplayQueryDto {
  @ApiPropertyOptional({
    description: 'Área de preparación',
    enum: area_preparacion,
    default: 'COCINA',
  })
  @IsOptional()
  @IsEnum(area_preparacion)
  area?: area_preparacion;
}
