import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/lib/utils";
import { PlanCode, UserStatus, SubscriptionStatus } from "@prisma/client";

const signupSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해 주세요"),
  nickname: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다")
    .max(20, "닉네임은 20자 이하여야 합니다")
    .regex(/^[a-zA-Z0-9가-힣_]+$/, "닉네임에 허용되지 않는 문자가 포함되어 있습니다"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  planCode: z.enum(["BASIC", "STANDARD", "PRO"]),
  favoriteCategories: z.array(z.string()).optional(),
  joinPurpose: z.string().optional(),
  agreeTerms: z.boolean().refine((v) => v === true, "이용약관에 동의해 주세요"),
  agreeScore: z.boolean().refine((v) => v === true, "점수 정책에 동의해 주세요"),
  agreePrivacy: z.boolean().refine((v) => v === true, "개인정보처리방침에 동의해 주세요"),
  ref: z.string().optional(),
});

const FORBIDDEN_NICKNAMES = ["admin", "관리자", "운영자", "administrator", "operator", "system"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    // Check forbidden nicknames
    const lowerNick = data.nickname.toLowerCase();
    if (FORBIDDEN_NICKNAMES.some((f) => lowerNick.includes(f))) {
      return NextResponse.json(
        { error: "사용할 수 없는 닉네임입니다" },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다" },
        { status: 400 }
      );
    }

    // Check duplicate nickname
    const existingNick = await prisma.user.findUnique({ where: { nickname: data.nickname } });
    if (existingNick) {
      return NextResponse.json(
        { error: "이미 사용 중인 닉네임입니다" },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({ where: { code: data.planCode as PlanCode } });
    if (!plan) {
      return NextResponse.json({ error: "유효하지 않은 요금제입니다" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const referralCode = generateReferralCode();

    // Find referrer
    let referredByUserId: string | undefined;
    if (data.ref) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: data.ref } });
      referredByUserId = referrer?.id;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        nickname: data.nickname,
        passwordHash,
        status: UserStatus.PENDING_BETA,
        desiredPlanCode: data.planCode as PlanCode,
        referralCode,
        referredByUserId,
        profile: {
          create: {
            favoriteCategories: data.favoriteCategories ?? [],
            joinPurpose: data.joinPurpose,
          },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: SubscriptionStatus.PENDING_BETA,
          },
        },
      },
    });

    // Create referral record if referred
    if (referredByUserId) {
      await prisma.referral.create({
        data: {
          fromUserId: referredByUserId,
          toUserId: user.id,
        },
      });
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다" }, { status: 500 });
  }
}
