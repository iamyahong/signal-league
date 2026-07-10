import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError, isOperatorOnly } from "@/lib/admin/auth";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { createAuditLog } from "@/lib/admin/audit";
import prisma from "@/lib/prisma";
import { ScoreLedgerType } from "@prisma/client";

const OPERATOR_MAX = 5000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const roles = (session.user.roles as string[]) || [];
    const body = await req.json() as { direction: "add" | "subtract"; amount: number; reason: string };
    const { direction, amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "올바른 점수를 입력해 주세요." }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "사유를 입력해 주세요." }, { status: 400 });
    }
    if (isOperatorOnly(roles) && amount > OPERATOR_MAX) {
      return NextResponse.json(
        { error: `OPERATOR는 ${OPERATOR_MAX.toLocaleString()}점 이하만 조정할 수 있습니다. 더 큰 조정은 SUPER_ADMIN 권한이 필요합니다.` },
        { status: 403 }
      );
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { availableScore: true } });
    if (!profile) return NextResponse.json({ error: "회원 프로필을 찾을 수 없습니다." }, { status: 404 });

    const actualAmount = direction === "subtract" ? -amount : amount;
    const type = direction === "add" ? ScoreLedgerType.ADMIN_ADJUST_ADD : ScoreLedgerType.ADMIN_ADJUST_SUBTRACT;

    const result = await prisma.$transaction(async (tx) => {
      const scoreResult = await applyScoreChange({
        userId,
        type,
        amount: actualAmount,
        description: reason,
        createdByUserId: adminId,
        isSystemGenerated: false,
        tx,
      });
      await createAuditLog({
        actorId: adminId,
        action: direction === "add" ? "SCORE_ADJUST_ADD" : "SCORE_ADJUST_SUBTRACT",
        targetType: "USER",
        targetId: userId,
        before: { availableScore: scoreResult.balanceBefore },
        after: { availableScore: scoreResult.balanceAfter, amount: actualAmount, reason },
      }, tx);
      return scoreResult;
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
