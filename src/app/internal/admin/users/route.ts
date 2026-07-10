import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { UserStatus, PlanCode } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;

    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as UserStatus | "all" | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const where: import("@prisma/client").Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { nickname: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(status && status !== "all" && { status: status as UserStatus }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: { select: { availableScore: true } },
          subscription: { include: { plan: { select: { code: true, name: true } } } },
          roles: { select: { role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        status: u.status,
        desiredPlanCode: u.desiredPlanCode,
        currentPlanCode: u.subscription?.plan?.code ?? null,
        availableScore: u.profile?.availableScore ?? 0,
        roles: u.roles.map((r) => r.role),
        createdAt: u.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
