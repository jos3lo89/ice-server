import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CashRegistersService } from '../../modules/cash-registers/cash-registers.service';
import { REQUIRE_CASH_REGISTER_KEY } from '../decorators/requireCashRegister.decorator';

@Injectable()
export class CashRegisterGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private cashRegistersService: CashRegistersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_CASH_REGISTER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isRequired) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new BadRequestException('Usuario no autenticado para validar caja');
    }
    const hasOpenCash = await this.cashRegistersService.hasOpenCashRegister(
      user.sub,
    );

    console.log({
      wwww: hasOpenCash,
    });

    if (!hasOpenCash) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'CASH_REGISTER_REQUIRED',
          message: 'Debe abrir una caja para realizar esta operación',
        },
      });
    }

    const cashRegisterId =
      await this.cashRegistersService.getOpenCashRegisterId(user.sub);

    request['cashRegisterId'] = cashRegisterId;

    return true;
  }
}
