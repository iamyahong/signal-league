import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await prisma.broadcastJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      totalCount: true,
      inappSentCount: true,
      emailSentCount: true,
      emailBlockedCount: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ job });
}
