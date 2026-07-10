import { auth } from "@/lib/auth";
import { UserRoleType } from "@prisma/client";

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new AdminAuthError("로그인이 필요합니다.", 401);
  }
  const roles = (session.user.roles as string[]) || [];
  const isAdmin =
    roles.includes(UserRoleType.SUPER_ADMIN) ||
    roles.includes(UserRoleType.OPERATOR);
  if (!isAdmin) {
    throw new AdminAuthError("관리자 권한이 필요합니다.", 403);
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new AdminAuthError("로그인이 필요합니다.", 401);
  }
  const roles = (session.user.roles as string[]) || [];
  if (!roles.includes(UserRoleType.SUPER_ADMIN)) {
    throw new AdminAuthError("최고 관리자(SUPER_ADMIN) 권한이 필요합니다.", 403);
  }
  return session;
}

export function isOperatorOnly(roles: string[]) {
  return (
    roles.includes(UserRoleType.OPERATOR) &&
    !roles.includes(UserRoleType.SUPER_ADMIN)
  );
}
