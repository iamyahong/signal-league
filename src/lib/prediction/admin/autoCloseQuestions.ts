import prisma from "@/lib/prisma";

export interface AutoCloseResult {
  closedCount: number;
  closedIds: string[];
}

export async function autoCloseQuestions(): Promise<AutoCloseResult> {
  const now = new Date();

  const overdue = await prisma.predictionQuestion.findMany({
    where: {
      status: "OPEN",
      closesAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true, title: true },
  });

  if (overdue.length === 0) {
    return { closedCount: 0, closedIds: [] };
  }

  const closedIds = overdue.map((q) => q.id);

  await prisma.$transaction(async (tx) => {
    await tx.predictionQuestion.updateMany({
      where: { id: { in: closedIds } },
      data: { status: "CLOSED", lastAutoClosedAt: now },
    });

    for (const q of overdue) {
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "AUTO_CLOSE_QUESTION",
          targetType: "PredictionQuestion",
          targetId: q.id,
          before: { status: "OPEN" },
          after: { status: "CLOSED", autoClosedAt: now.toISOString() },
        },
      });
    }
  });

  return { closedCount: overdue.length, closedIds };
}
