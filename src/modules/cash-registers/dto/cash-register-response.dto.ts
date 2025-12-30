import { ApiProperty } from '@nestjs/swagger';

export class CashRegisterTotalsDto {
  @ApiProperty({ example: 1850.5 })
  sales: number;

  @ApiProperty({ example: 50.0 })
  income: number;

  @ApiProperty({ example: 50.0 })
  expense: number;

  @ApiProperty({ example: 1850.5 })
  current_balance: number;
}
