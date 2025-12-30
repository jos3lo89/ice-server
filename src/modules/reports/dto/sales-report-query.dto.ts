import { IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupByPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class SalesReportQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha inicio (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha fin (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Agrupar por periodo',
    enum: GroupByPeriod,
    example: 'day',
  })
  @IsOptional()
  @IsEnum(GroupByPeriod)
  groupBy?: GroupByPeriod;
}
