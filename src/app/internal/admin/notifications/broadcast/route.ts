import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { UserStatus, PlanCode } from "@prisma/client";
import { sendEmailNotification } from "@/lib/emailNotification";
import { adminBroadcastTemplate } from "@/lib/emailTemplates";
import { createAuditLog } from "@/lib/admin/audit";
import { z } from "zod";

const SYNC_THRESHOLD = 100;
const EMAIL_RATE_PER_SECOND = 4;

const broadcastSchema = z.object({
  targetType: z.enum(["ALL", "PLAN", "INDIVIDUAL"]),
  planCodes: z.array(z.enum(["BASIC", "STANDARD", "PRO"])).optional(),
  userIds: z.array(z.string().uuid()).optional(),
  channelInapp: z.boolean(),
  channelEmail: z.boolean(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  linkUrl: z.string().url().optional().or(z.literal("")),
  emailSubject: z.string().max(200).optional(),
});

async function resolveTargetUsers(
  targetType: "ALL" | "PLAN" | "INDIVIDUAL",
  planCodes?: string[],
  userIds?: string[]
) {
  if (targetType === "INDIVIDUAL") {
    if (!userIds?.length) return [];
    return prisma.user.findMany({
      where: { id: { in: userIds }, deletedAt: null, status: UserStatus.BETA_ACTIVE },
      select: { id: true, nickname: true, email: true },
    });
  }

  const planFilter =
    targetType === "PLAN" && planCodes?.length
      ? { subscription: { plan: { code: { in: planCodes as PlanCode[] } } } }
      : {};

  return prisma.user.findMany({
    where: { status: UserStatus.BETA_ACTIVE, deletedAt: null, ...planFilter },
    select: { id: true, nickname: true, email: true },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendEmailsThrottled(
  jobs: { userId: string; nickname: string; title: string; content: string; linkUrl?: string; emailSubject?: string }[]
): Promise<{ sent: number; blocked: number }> {
  let sent = 0;
  let blocked = 0;

  for (let i = 0; i < jobs.length; i += EMAIL_RATE_PER_SECOND) {
    const batch = jobs.slice(i, i + EMAIL_RATE_PER_SECOND);
    const results = await Promise.allSettled(
      batch.map(async (j) => {
        const tpl = adminBroadcastTemplate({
          nickname: j.nickname,
          title: j.title,
          content: j.content,
          linkUrl: j.linkUrl || undefined,
        });
        await sendEmailNotification({
          userId: j.userId,
          type: "ADMIN_BROADCAST",
          subject: j.emailSubject || tpl.subject,
          html: tpl.html,
          text: tpl.text,
          preferenceKey: "ADMIN_BROADCAST",
        });
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
    }
    if (i + EMAIL_RATE_PER_SECOND < jobs.length) await sleep(1000);
  }

  // Count blocked from email_logs (approximate: total - sent)
  blocked = jobs.length - sent;
  return { sent, blocked };
}

async function runBroadcastJob(
  jobId: string,
  users: { id: string; nickname: string; email: string }[],
  payload: {
    channelInapp: boolean;
    channelEmail: boolean;
    title: string;
    content: string;
    linkUrl?: string;
    emailSubject?: string;
    adminId: string;
  }
) {
  await prisma.broadcastJob.update({
    where: { id: jobId },
    data: { status: "IN_PROGRESS", startedAt: new Date(), totalCount: users.length },
  });

  let inappSent = 0;
  let emailSent = 0;
  let emailBlocked = 0;

  try {
    if (payload.channelInapp) {
      await prisma.$transaction(
        users.map((u) =>
          prisma.notification.create({
            data: {
              userId: u.id,
              type: "ADMIN_BROADCAST",
              title: payload.title,
              body: payload.content,
              data: payload.linkUrl ? { linkUrl: payload.linkUrl } : undefined,
            },
          })
        )
      );
      inappSent = users.length;
    }

    if (payload.channelEmail) {
      const emailJobs = users.map((u) => ({
        userId: u.id,
        nickname: u.nickname,
        title: payload.title,
        content: payload.content,
        linkUrl: payload.linkUrl,
        emailSubject: payload.emailSubject,
      }));
      const result = await sendEmailsThrottled(emailJobs);
      emailSent = result.sent;
      emailBlocked = result.blocked;
    }

    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        inappSentCount: inappSent,
        emailSentCount: emailSent,
        emailBlockedCount: emailBlocked,
      },
    });
  } catch (err) {
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
        inappSentCount: inappSent,
        emailSentCount: emailSent,
        emailBlockedCount: emailBlocked,
      },
    });
  }
}

// GET — preview count
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const targetType = (sp.get("targetType") as "ALL" | "PLAN" | "INDIVIDUAL") ?? "ALL";
  const planCodes = sp.get("planCodes")?.split(",").filter(Boolean) ?? [];
  const userIds = sp.get("userIds")?.split(",").filter(Boolean) ?? [];

  const users = await resolveTargetUsers(targetType, planCodes, userIds);
  const blockedCount = users.filter((u) =>
    // We can't know email-block status without extra query; do a join query instead
    false
  ).length;

  const [total, blocked] = await Promise.all([
    Promise.resolve(users.length),
    prisma.user.count({
      where: {
        id: { in: users.map((u) => u.id) },
        emailBlocked: true,
      },
    }),
  ]);

  return NextResponse.json({ totalCount: total, blockedCount: blocked });
}

// POST — execute broadcast
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다.", details: parsed.error.flatten() }, { status: 400 });

  const { targetType, planCodes, userIds, channelInapp, channelEmail, title, content, linkUrl, emailSubject } =
    parsed.data;

  if (!channelInapp && !channelEmail)
    return NextResponse.json({ error: "발송 채널을 하나 이상 선택해 주세요." }, { status: 400 });

  if (targetType === "INDIVIDUAL" && (!userIds || userIds.length === 0))
    return NextResponse.json({ error: "개별 발송 대상을 선택해 주세요." }, { status: 400 });

  if (targetType === "PLAN" && (!planCodes || planCodes.length === 0))
    return NextResponse.json({ error: "요금제를 선택해 주세요." }, { status: 400 });

  const users = await resolveTargetUsers(targetType, planCodes, userIds);
  if (users.length === 0)
    return NextResponse.json({ error: "발송 대상 사용자가 없습니다." }, { status: 400 });

  const adminId = session.user.id;

  // Create broadcast job record
  const job = await prisma.broadcastJob.create({
    data: {
      createdByUserId: adminId,
      status: users.length >= SYNC_THRESHOLD ? "QUEUED" : "IN_PROGRESS",
      targetType,
      targetPlanCodes: planCodes?.length ? planCodes : undefined,
      targetUserIds: userIds?.length ? userIds : undefined,
      channelInapp,
      channelEmail,
      title,
      content,
      linkUrl: linkUrl || null,
      emailSubject: emailSubject || null,
      totalCount: users.length,
    },
  });

  // Audit log
  await createAuditLog({
    actorId: adminId,
    action: "ADMIN_BROADCAST_SEND",
    targetType: "BroadcastJob",
    targetId: job.id,
    after: {
      targetType,
      planCodes: planCodes ?? null,
      individualCount: targetType === "INDIVIDUAL" ? userIds?.length : null,
      totalCount: users.length,
      channelInapp,
      channelEmail,
      title,
    },
  });

  if (users.length >= SYNC_THRESHOLD) {
    // Background — fire and forget
    setImmediate(() => {
      runBroadcastJob(job.id, users, { channelInapp, channelEmail, title, content, linkUrl: linkUrl || undefined, emailSubject, adminId }).catch(
        (err) => console.error("[broadcast] background job failed:", err)
      );
    });

    return NextResponse.json({
      success: true,
      queued: true,
      jobId: job.id,
      totalCount: users.length,
      message: `발송 작업이 시작되었습니다. 총 ${users.length}명 대상으로 백그라운드 처리 중입니다.`,
    });
  }

  // Sync — process immediately
  let inappSent = 0;
  let emailSent = 0;
  let emailBlockedCount = 0;

  if (channelInapp) {
    await prisma.$transaction(
      users.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            type: "ADMIN_BROADCAST",
            title,
            body: content,
            data: linkUrl ? { linkUrl } : undefined,
          },
        })
      )
    );
    inappSent = users.length;
  }

  if (channelEmail) {
    const emailJobs = users.map((u) => ({
      userId: u.id,
      nickname: u.nickname,
      title,
      content,
      linkUrl: linkUrl || undefined,
      emailSubject,
    }));
    const sentAt = new Date();
    await sendEmailsThrottled(emailJobs);

    // Count actual sent/blocked from email_logs (opt-out skips produce no log entry)
    const [sentLogs, blockedLogs] = await Promise.all([
      prisma.emailLog.count({
        where: {
          userId: { in: users.map((u) => u.id) },
          type: "ADMIN_BROADCAST",
          createdAt: { gte: sentAt },
          status: { in: ["SENT", "DELIVERED", "BOUNCED"] },
        },
      }),
      prisma.emailLog.count({
        where: {
          userId: { in: users.map((u) => u.id) },
          type: "ADMIN_BROADCAST",
          createdAt: { gte: sentAt },
          status: "BLOCKED",
        },
      }),
    ]);
    emailSent = sentLogs;
    emailBlockedCount = blockedLogs;
  }

  await prisma.broadcastJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      inappSentCount: inappSent,
      emailSentCount: emailSent,
      emailBlockedCount: emailBlockedCount,
    },
  });

  return NextResponse.json({
    success: true,
    queued: false,
    jobId: job.id,
    totalCount: users.length,
    inappSentCount: inappSent,
    emailSentCount: emailSent,
    emailBlockedCount: emailBlockedCount,
  });
}
