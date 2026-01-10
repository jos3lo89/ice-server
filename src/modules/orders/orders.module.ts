import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CashRegistersService } from '../cash-registers/cash-registers.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, CashRegistersService],
  exports: [OrdersService],
})
export class OrdersModule {}
