import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentDeveloper = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.developer;
  },
);