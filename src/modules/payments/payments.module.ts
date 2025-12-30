import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { CashMovementsModule } from '../cash-movements/cash-movements.module';
import { SalesModule } from '../sales/sales.module';
import { CashRegistersModule } from '../cash-registers/cash-registers.module';

@Module({
  imports: [
    OrdersModule,
    CashMovementsModule,
    SalesModule,
    CashRegistersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
