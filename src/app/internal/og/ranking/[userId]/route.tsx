import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      nickname: true,
      profile: { select: { totalScore: true, correctPredictions: true, totalPredictions: true } },
    },
  });

  const snapshot = await prisma.rankingSnapshot.findFirst({
    where: { userId, periodType: "ALL_TIME", deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const nickname = user?.nickname ?? "—";
  const totalScore = user?.profile?.totalScore ?? 0;
  const rank = snapshot?.rank ?? "?";
  const correct = user?.profile?.correctPredictions ?? 0;
  const total = user?.profile?.totalPredictions ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "48px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "20px", color: "#60a5fa", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "8px" }}>
              SIGNAL LEAGUE
            </div>
            <div style={{ fontSize: "16px", color: "#6b7280" }}>예측 리그 랭킹</div>
          </div>
          <div
            style={{
              background: "rgba(96, 165, 250, 0.15)",
              border: "1px solid rgba(96, 165, 250, 0.3)",
              borderRadius: "12px",
              padding: "8px 20px",
              fontSize: "14px",
              color: "#60a5fa",
            }}
          >
            ALL TIME
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "40px", marginBottom: "48px" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            {nickname.slice(0, 1)}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "42px", fontWeight: 800, color: "white", marginBottom: "8px" }}>
              {nickname}
            </div>
            <div style={{ fontSize: "20px", color: "#9ca3af" }}>Signal League 예측가</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "12px" }}>전체 순위</div>
            <div style={{ fontSize: "52px", fontWeight: 900, color: "#facc15" }}>{`# ${rank}`}</div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "12px" }}>총 점수</div>
            <div style={{ fontSize: "52px", fontWeight: 900, color: "#34d399" }}>
              {String(totalScore)}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "12px" }}>적중률</div>
            <div style={{ fontSize: "52px", fontWeight: 900, color: "#60a5fa" }}>{`${accuracy}%`}</div>
          </div>
        </div>

        <div style={{ marginTop: "auto", fontSize: "15px", color: "#4b5563" }}>
          signalleague.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
