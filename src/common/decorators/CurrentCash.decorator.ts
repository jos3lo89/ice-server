import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCash = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.cashRegisterId;
});
