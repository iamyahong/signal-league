import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR") || roles.includes("READ_ONLY");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);

  const where: Prisma.DisputeWhereInput = { deletedAt: null };
  if (status) where.status = status as Prisma.DisputeWhereInput["status"];

  const [total, disputes] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { nickname: true, email: true } },
        question: { select: { title: true, status: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, disputes, page, pageSize: PAGE_SIZE });
}
