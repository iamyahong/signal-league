import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const isNeon = process.env.USE_NEON_DB === "true";

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        target: isNeon ? "neon" : "helium",
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        target: isNeon ? "neon" : "helium",
        message,
        timestamp,
      },
      { status: 503 }
    );
  }
}
