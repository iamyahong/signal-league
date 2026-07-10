import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSnapshots } from "@/lib/ranking/generateSnapshots";

const CRON_SECRET = process.env.CRON_SECRET;

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronToken = authHeader?.replace("Bearer ", "");
  const hasValidCronSecret = CRON_SECRET && cronToken === CRON_SECRET;

  if (!hasValidCronSecret) {
    const session = await auth();
    const roles = (session?.user?.roles as string[]) ?? [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await generateSnapshots();
    return NextResponse.json({
      success: true,
      snapshotsCreated: result.snapshotsCreated,
      usersProcessed: result.usersProcessed,
      combinationsProcessed: result.combinationsProcessed,
      durationMs: result.durationMs,
      message: `${result.usersProcessed}명 처리, ${result.snapshotsCreated}개 스냅샷 생성 완료 (${result.durationMs}ms)`,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message ?? "스냅샷 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
