import { NextRequest, NextResponse } from "next/server";
import { autoCloseQuestions } from "@/lib/prediction/admin/autoCloseQuestions";
import { auth } from "@/lib/auth";

const CRON_SECRET = process.env.CRON_SECRET;

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronToken = authHeader?.replace("Bearer ", "");

  const hasValidCronSecret = CRON_SECRET && cronToken === CRON_SECRET;

  if (!hasValidCronSecret) {
    const session = await auth();
    const roles = (session?.user?.roles as string[]) || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await autoCloseQuestions();
    return NextResponse.json({
      success: true,
      closedCount: result.closedCount,
      closedIds: result.closedIds,
      message: result.closedCount > 0
        ? `${result.closedCount}개 문제를 자동 마감했습니다.`
        : "자동 마감할 문제가 없습니다.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: "자동 마감 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
