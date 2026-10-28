import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & { user?: RequestUser; id?: string };

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
