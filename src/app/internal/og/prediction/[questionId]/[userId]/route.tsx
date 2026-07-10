import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string; userId: string }> }
) {
  const { questionId, userId } = await params;

  const [question, participation] = await Promise.all([
    prisma.predictionQuestion.findUnique({
      where: { id: questionId },
      select: {
        title: true,
        status: true,
        options: { select: { id: true, label: true, isResolved: true } },
      },
    }),
    prisma.predictionParticipation.findUnique({
      where: { questionId_userId: { questionId, userId } },
      select: {
        optionId: true,
        earnedScore: true,
        user: { select: { nickname: true } },
        option: { select: { isResolved: true } },
      },
    }),
  ]);

  if (!question || !participation) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "630px",
            background: "#0f1117",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "32px",
            fontFamily: "sans-serif",
          }}
        >
          Signal League
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const selectedOption = question.options.find((o) => o.id === participation.optionId);
  const isResolved = question.status === "RESOLVED";
  const isCorrect = isResolved && (participation.option?.isResolved === true);
  const nickname = participation.user.nickname;

  const resultColor = isResolved
    ? isCorrect
      ? "#34d399"
      : "#f87171"
    : "#60a5fa";

  const resultLabel = isResolved
    ? isCorrect
      ? "✓ 적중"
      : "✗ 불일치"
    : "참여 중";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "20px", color: "#60a5fa", fontWeight: 700, letterSpacing: "0.15em" }}>
            SIGNAL LEAGUE
          </div>
          <div
            style={{
              background: `rgba(${isResolved ? (isCorrect ? "52,211,153" : "248,113,113") : "96,165,250"}, 0.15)`,
              border: `1px solid ${resultColor}40`,
              borderRadius: "12px",
              padding: "8px 20px",
              fontSize: "15px",
              color: resultColor,
              fontWeight: 700,
            }}
          >
            {resultLabel}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.3,
            }}
          >
            {question.title.length > 80 ? question.title.slice(0, 80) + "…" : question.title}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "15px", color: "#6b7280" }}>
              {`${nickname}님의 선택`}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: `${resultColor}15`,
                border: `1px solid ${resultColor}40`,
                borderRadius: "12px",
                padding: "20px 24px",
              }}
            >
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: resultColor, flexShrink: 0 }} />
              <div style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>
                {selectedOption?.label ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "24px", fontSize: "15px", color: "#4b5563" }}>
          signalleague.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
