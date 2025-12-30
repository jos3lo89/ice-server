import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExportType {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportType {
  SALES = 'sales',
  PRODUCTS = 'products',
  WAITERS = 'waiters',
  CASH_REGISTERS = 'cash-registers',
  DAILY_CLOSE = 'daily-close',
}

export class ExportParamsDto {
  @ApiProperty({
    description: 'Tipo de exportación',
    enum: ExportType,
    example: 'pdf',
  })
  @IsEnum(ExportType)
  type: ExportType;
}
