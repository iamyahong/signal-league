import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Signal League <no-reply@signalleague.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@signalleague.com";

export type EmailType =
  | "VERIFY_EMAIL"
  | "PASSWORD_RESET"
  | "SIGNUP_RECEIVED"
  | "BETA_APPROVED"
  | "QUESTION_APPROVED"
  | "QUESTION_REJECTED"
  | "RESULT_CONFIRMED"
  | "QUESTION_VOIDED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_UNSUSPENDED"
  | "REPORT_HANDLED"
  | "DISPUTE_HANDLED"
  | "ADMIN_BROADCAST";

const SYSTEM_EMAIL_TYPES: EmailType[] = [
  "VERIFY_EMAIL",
  "PASSWORD_RESET",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_UNSUSPENDED",
];

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: EmailType;
  userId?: string;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY가 설정되지 않아 이메일 발송을 건너뜁니다.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (opts.userId && !SYSTEM_EMAIL_TYPES.includes(opts.type)) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { emailBlocked: true, emailBlockedReason: true },
    });
    if (user?.emailBlocked) {
      await prisma.emailLog.create({
        data: {
          type: opts.type,
          toEmail: opts.to,
          userId: opts.userId,
          subject: opts.subject,
          status: "BLOCKED",
          errorMsg: `이메일 차단됨: ${user.emailBlockedReason ?? "UNKNOWN"}`,
        },
      });
      console.warn("[email] 차단된 사용자 — 발송 생략", {
        userId: opts.userId,
        type: opts.type,
        reason: user.emailBlockedReason,
      });
      return { success: false, skipped: true, error: "EMAIL_BLOCKED" };
    }
  }

  const log = await prisma.emailLog.create({
    data: {
      type: opts.type,
      toEmail: opts.to,
      userId: opts.userId ?? null,
      subject: opts.subject,
      status: "PENDING",
    },
  });

  const attempt = () =>
    resend.emails.send({
      from: FROM,
      to: opts.to,
      replyTo: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

  try {
    let result = await attempt();

    if (result.error) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await attempt();
    }

    if (result.error) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMsg: result.error.message },
      });
      return { success: false, error: result.error.message };
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        resendId: result.data?.id ?? null,
        sentAt: new Date(),
      },
    });

    return { success: true, resendId: result.data?.id };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg },
    });
    return { success: false, error: errorMsg };
  }
}
