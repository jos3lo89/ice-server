import { Module } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { OrderItemsController } from './order-items.controller';
import { OrdersModule } from '../orders/orders.module';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [OrdersModule, PrintersModule],
  controllers: [OrderItemsController],
  providers: [OrderItemsService],
})
export class OrderItemsModule {}
