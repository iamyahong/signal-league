import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { UserStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: UserStatus.BETA_ACTIVE,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, nickname: true, email: true },
    take: 20,
    orderBy: { nickname: "asc" },
  });

  return NextResponse.json({ users });
}
