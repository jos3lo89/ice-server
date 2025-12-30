import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { PrinterService } from './printer.service';

@Module({
  controllers: [PrintersController],
  providers: [PrintersService, PrinterService],
})
export class PrintersModule {}
