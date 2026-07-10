import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/lib/utils";
import { DEFAULT_PREFERENCES, toJsonValue } from "@/lib/notificationPreferences";
import { PlanCode, UserStatus, SubscriptionStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { verifyEmailTemplate, signupReceivedTemplate } from "@/lib/emailTemplates";

const signupSchema = z
  .object({
    email: z.string().email("올바른 이메일 형식을 입력해 주세요"),
    nickname: z
      .string()
      .trim()
      .min(1, "닉네임을 입력해 주세요")
      .min(2, "닉네임은 2자 이상이어야 합니다")
      .max(20, "닉네임은 20자 이하여야 합니다")
      .regex(/^[a-zA-Z0-9가-힣_]+$/, "닉네임에 허용되지 않는 문자가 포함되어 있습니다"),
    provider: z.enum(["google"]).optional(),
    password: z.string().optional(),
    planCode: z.enum(["BASIC", "STANDARD", "PRO"]),
    favoriteCategories: z.array(z.string()).optional(),
    joinPurpose: z.string().optional(),
    agreeTerms: z.boolean().refine((v) => v === true, "이용약관에 동의해 주세요"),
    agreeScore: z.boolean().refine((v) => v === true, "점수 정책에 동의해 주세요"),
    agreePrivacy: z.boolean().refine((v) => v === true, "개인정보처리방침에 동의해 주세요"),
    ref: z.string().optional(),
  })
  .refine(
    (data) => data.provider === "google" || (data.password && data.password.length >= 8),
    { message: "비밀번호는 8자 이상이어야 합니다", path: ["password"] }
  );

const FORBIDDEN_NICKNAMES = ["admin", "관리자", "운영자", "administrator", "operator", "system"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    const lowerNick = data.nickname.toLowerCase();
    if (FORBIDDEN_NICKNAMES.some((f) => lowerNick.includes(f))) {
      return NextResponse.json({ error: "사용할 수 없는 닉네임입니다" }, { status: 400 });
    }

    const isGoogleFlow = data.provider === "google";

    const existingByEmail = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingByEmail && !isGoogleFlow) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 400 });
    }

    const existingNick = await prisma.user.findUnique({ where: { nickname: data.nickname } });
    if (existingNick && existingNick.email !== data.email) {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { code: data.planCode as PlanCode } });
    if (!plan) {
      return NextResponse.json({ error: "유효하지 않은 요금제입니다" }, { status: 400 });
    }

    const referralCode = generateReferralCode();

    let referredByUserId: string | undefined;
    if (data.ref) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: data.ref } });
      referredByUserId = referrer?.id;
    }

    let userId: string;

    if (isGoogleFlow) {
      // Google 신규 가입 — 어댑터가 미리 생성한 레코드를 업데이트
      // existingByEmail이 null인 엣지케이스에도 Google 경로를 유지 (VERIFY_EMAIL 발송 금지)
      const updated = await prisma.$transaction(async (tx) => {
        const baseData = {
          nickname: data.nickname,
          status: UserStatus.PENDING_BETA,
          desiredPlanCode: data.planCode as PlanCode,
          // Google OAuth 사용자는 이메일 인증 불필요
          emailVerifiedAt: new Date(),
          referredByUserId: referredByUserId ?? null,
        };

        const u = existingByEmail
          ? await tx.user.update({
              where: { email: data.email },
              data: {
                ...baseData,
                referralCode: existingByEmail.referralCode ?? referralCode,
                referredByUserId:
                  referredByUserId ?? existingByEmail.referredByUserId ?? null,
              },
            })
          : await tx.user.create({
              data: {
                ...baseData,
                email: data.email,
                referralCode,
              },
            });

        await tx.userProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            favoriteCategories: data.favoriteCategories ?? [],
            joinPurpose: data.joinPurpose,
            notificationPreferences: toJsonValue(DEFAULT_PREFERENCES),
          },
          update: {
            favoriteCategories: data.favoriteCategories ?? [],
            joinPurpose: data.joinPurpose,
          },
        });

        const existingSub = await tx.subscription.findUnique({ where: { userId: u.id } });
        if (!existingSub) {
          await tx.subscription.create({
            data: {
              userId: u.id,
              planId: plan.id,
              status: SubscriptionStatus.PENDING_BETA,
            },
          });
        } else {
          await tx.subscription.update({
            where: { userId: u.id },
            data: { planId: plan.id, status: SubscriptionStatus.PENDING_BETA },
          });
        }

        return u;
      });

      userId = updated.id;

      // Google 가입: 베타 신청 접수 안내 이메일만 발송 (VERIFY_EMAIL 발송 금지)
      void sendEmail({
        to: data.email,
        ...signupReceivedTemplate({ nickname: data.nickname, planName: plan.name, provider: "google" }),
        type: "SIGNUP_RECEIVED",
        userId,
      });
    } else {
      // 이메일+비밀번호 가입
      const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: data.email,
            nickname: data.nickname,
            passwordHash,
            status: UserStatus.PENDING_BETA,
            desiredPlanCode: data.planCode as PlanCode,
            referralCode,
            referredByUserId,
          },
        });

        await tx.userProfile.create({
          data: {
            userId: u.id,
            favoriteCategories: data.favoriteCategories ?? [],
            joinPurpose: data.joinPurpose,
            notificationPreferences: toJsonValue(DEFAULT_PREFERENCES),
          },
        });

        await tx.subscription.create({
          data: {
            userId: u.id,
            planId: plan.id,
            status: SubscriptionStatus.PENDING_BETA,
          },
        });

        return u;
      });

      userId = user.id;

      if (referredByUserId) {
        await prisma.referral.create({
          data: { fromUserId: referredByUserId, toUserId: userId },
        });
      }

      // 이메일 인증 토큰 생성 + 발송 (비동기, 가입 응답 지연 없음)
      void (async () => {
        try {
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await prisma.emailVerification.create({
            data: { userId, email: data.email, token, expiresAt },
          });

          await Promise.all([
            sendEmail({
              to: data.email,
              ...verifyEmailTemplate({ nickname: data.nickname, token }),
              type: "VERIFY_EMAIL",
              userId,
            }),
            sendEmail({
              to: data.email,
              ...signupReceivedTemplate({ nickname: data.nickname, planName: plan.name, provider: "email" }),
              type: "SIGNUP_RECEIVED",
              userId,
            }),
          ]);
        } catch (e) {
          console.error("[signup] 이메일 발송 실패:", e);
        }
      })();
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다" }, { status: 500 });
  }
}
