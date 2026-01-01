import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CashRegisterGuard } from '../guards/cashRegister.guard';

export const REQUIRE_CASH_REGISTER_KEY = 'requireCashRegister';

export function RequireCashRegister() {
  return applyDecorators(
    SetMetadata(REQUIRE_CASH_REGISTER_KEY, true),
    UseGuards(CashRegisterGuard),
  );
}
