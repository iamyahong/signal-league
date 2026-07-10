import { auth } from "@/lib/auth";
import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }
  return session;
}

export async function requireBetaUser() {
  const session = await requireSession();
  const status = session.user.status;
  if (status === UserStatus.SUSPENDED) {
    throw new AuthError("현재 이용이 제한되어 있습니다.", 403, "SUSPENDED");
  }
  if (status === UserStatus.PENDING_BETA) {
    throw new AuthError("베타 승인 후 이용할 수 있습니다.", 403, "PENDING_BETA");
  }
  if (status !== UserStatus.BETA_ACTIVE && status !== UserStatus.ACTIVE) {
    throw new AuthError("이용 권한이 없습니다.", 403, "FORBIDDEN");
  }
  return session;
}

export function handleAuthError(e: unknown): NextResponse {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.statusCode });
  }
  throw e;
}
