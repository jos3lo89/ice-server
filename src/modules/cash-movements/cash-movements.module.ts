import { Module } from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementsController } from './cash-movements.controller';
import { CashRegistersService } from '../cash-registers/cash-registers.service';

@Module({
  controllers: [CashMovementsController],
  providers: [CashMovementsService, CashRegistersService],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}
