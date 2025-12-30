import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CashRegisterGuard } from '../guards/cashRegister.guard';

export const REQUIRE_CASH_REGISTER_KEY = 'requireCashRegister';

/**
 * Decorador para marcar endpoints que requieren caja abierta
 *
 * Este decorador se usa en conjunto con el CashRegisterGuard para
 * asegurar que el usuario tenga una caja abierta antes de ejecutar
 * ciertas operaciones (pagos, ventas, movimientos de caja)
 *
 * @example
 * ```typescript
 * @RequireCashRegister()
 * @Post('payments')
 * async createPayment() { ... }
 * ```
 */
// export const RequireCashRegister = () =>
//   SetMetadata(REQUIRE_CASH_REGISTER_KEY, true);

export function RequireCashRegister() {
  return applyDecorators(
    SetMetadata(REQUIRE_CASH_REGISTER_KEY, true),
    UseGuards(CashRegisterGuard),
  );
}
