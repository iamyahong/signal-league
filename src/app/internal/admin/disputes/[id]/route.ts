import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR") || roles.includes("READ_ONLY");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true, email: true } },
      question: {
        select: {
          id: true, title: true, status: true, resolvedAt: true, totalParticipants: true, totalAllocated: true,
          options: { where: { deletedAt: null }, select: { id: true, label: true, participantCount: true, isResolved: true } },
        },
      },
    },
  });

  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const otherDisputeCount = await prisma.dispute.count({
    where: { questionId: dispute.questionId, id: { not: id }, deletedAt: null },
  });

  return NextResponse.json({ dispute, otherDisputeCount });
}
