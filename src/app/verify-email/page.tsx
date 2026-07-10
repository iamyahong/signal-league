import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyResult success={false} message="인증 링크가 올바르지 않습니다." />;
  }

  const record = await prisma.emailVerification.findUnique({ where: { token } });

  if (!record) {
    return <VerifyResult success={false} message="유효하지 않은 인증 링크입니다." />;
  }

  if (record.usedAt) {
    return <VerifyResult success={false} message="이미 사용된 인증 링크입니다." />;
  }

  if (record.expiresAt < new Date()) {
    return <VerifyResult success={false} message="만료된 인증 링크입니다. 재발송 버튼을 눌러 새 인증 메일을 받으세요." />;
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  redirect("/pending?verified=1");
}

function VerifyResult({ success, message }: { success: boolean; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-muted)] p-4">
      <div className="w-full max-w-md text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
            success ? "bg-green-900/30" : "bg-red-900/30"
          }`}
        >
          <span className="text-3xl">{success ? "✓" : "✕"}</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
          {success ? "이메일 인증 완료" : "인증 실패"}
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">{message}</p>
        <Link
          href="/pending"
          className="inline-block px-6 py-2.5 bg-[var(--color-accent-primary)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          베타 대기 페이지로 이동
        </Link>
      </div>
    </div>
  );
}
