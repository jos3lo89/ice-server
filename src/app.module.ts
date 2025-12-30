import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FloorsModule } from './modules/floors/floors.module';
import { TablesModule } from './modules/tables/tables.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { PrintersModule } from './modules/printers/printers.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    AuthModule,
    UsersModule,
    FloorsModule,
    TablesModule,
    CategoriesModule,
    ProductsModule,
    PrintersModule,
    ClientsModule,
    CashRegistersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
