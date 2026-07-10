import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyResendWebhook } from "@/lib/webhooks/resend-verify";
import { WebhookVerificationError } from "svix";

const HARD_BOUNCE_TYPES = ["hard", "Permanent"];

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[webhook/resend] svix 헤더 누락");
    return NextResponse.json({ error: "svix 헤더가 누락되었습니다." }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyResendWebhook(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      console.warn("[webhook/resend] 서명 검증 실패:", e.message);
      return NextResponse.json({ error: "서명 검증에 실패했습니다." }, { status: 401 });
    }
    console.warn("[webhook/resend] payload 파싱 실패:", e);
    return NextResponse.json({ error: "payload 파싱에 실패했습니다." }, { status: 400 });
  }

  const { type, data } = payload;
  const resendId = data.email_id;

  const logContext = { eventType: type, resendId, receivedAt: new Date().toISOString() };

  try {
    const existing = await prisma.emailLog.findFirst({
      where: { resendId },
      select: { id: true, status: true, userId: true },
    });

    if (!existing) {
      console.info("[webhook/resend] 매칭 실패 — resendId 없음", logContext);
      return NextResponse.json({ received: true, result: "not_found" });
    }

    if (type === "email.delivered") {
      if (!["SENT", "PENDING"].includes(existing.status)) {
        console.info("[webhook/resend] 멱등성 — 이미 처리됨", { ...logContext, currentStatus: existing.status });
        return NextResponse.json({ received: true, result: "idempotent" });
      }
      await prisma.emailLog.update({
        where: { id: existing.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });

    } else if (type === "email.bounced") {
      if (existing.status === "BOUNCED") {
        console.info("[webhook/resend] 멱등성 — 이미 BOUNCED", logContext);
        return NextResponse.json({ received: true, result: "idempotent" });
      }

      const bounceType = data.bounce?.type ?? "unknown";
      const bounceMessage = data.bounce?.message ?? null;
      const isHard = HARD_BOUNCE_TYPES.includes(bounceType);

      await prisma.$transaction(async (tx) => {
        await tx.emailLog.update({
          where: { id: existing.id },
          data: {
            status: "BOUNCED",
            bouncedAt: new Date(),
            errorMsg: bounceMessage,
            meta: { bounce_type: bounceType },
          },
        });

        if (!existing.userId) return;

        if (isHard) {
          await tx.user.updateMany({
            where: { id: existing.userId, emailBlocked: false },
            data: {
              emailBlocked: true,
              emailBlockedAt: new Date(),
              emailBlockedReason: "HARD_BOUNCE",
            },
          });
        } else {
          const updated = await tx.user.update({
            where: { id: existing.userId },
            data: { softBounceCount: { increment: 1 } },
            select: { softBounceCount: true, emailBlocked: true },
          });
          if (!updated.emailBlocked && updated.softBounceCount >= 5) {
            await tx.user.update({
              where: { id: existing.userId },
              data: {
                emailBlocked: true,
                emailBlockedAt: new Date(),
                emailBlockedReason: "SOFT_BOUNCE_LIMIT",
              },
            });
          }
        }
      });

    } else if (type === "email.complained") {
      if (existing.status === "COMPLAINED") {
        console.info("[webhook/resend] 멱등성 — 이미 COMPLAINED", logContext);
        return NextResponse.json({ received: true, result: "idempotent" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.emailLog.update({
          where: { id: existing.id },
          data: { status: "COMPLAINED", complainedAt: new Date() },
        });

        if (!existing.userId) return;

        await tx.user.updateMany({
          where: { id: existing.userId, emailBlocked: false },
          data: {
            emailBlocked: true,
            emailBlockedAt: new Date(),
            emailBlockedReason: "COMPLAINT",
          },
        });
      });

    } else {
      console.info("[webhook/resend] 처리 안 함 (선택적 이벤트)", logContext);
      return NextResponse.json({ received: true, result: "ignored" });
    }

    console.info("[webhook/resend] 처리 완료", {
      ...logContext,
      emailLogId: existing.id,
      result: "success",
    });

    return NextResponse.json({ received: true, result: "success" });
  } catch (e) {
    console.error("[webhook/resend] DB 에러", { ...logContext, error: String(e) });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
