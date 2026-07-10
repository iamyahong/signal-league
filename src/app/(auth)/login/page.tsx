"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "이메일 또는 비밀번호가 올바르지 않습니다",
  AccessDenied: "접근 권한이 없습니다",
  Configuration: "인증 서버 설정 오류입니다. 관리자에게 문의하세요",
  UntrustedHost: "인증 서버 설정 오류입니다. 관리자에게 문의하세요",
};

function getAuthErrorMessage(error: string | null): string | null {
  if (!error) return null;
  return AUTH_ERROR_MESSAGES[error] ?? "로그인에 실패했습니다. 다시 시도해주세요";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/home";
  const urlError = getAuthErrorMessage(searchParams?.get("error") ?? null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "이메일을 입력해 주세요";
    if (!password) newErrors.password = "비밀번호를 입력해 주세요";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      toast.error("Google 로그인 중 오류가 발생했습니다");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">로그인</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">오신 것을 환영합니다. Signal League입니다</p>
      </div>

      {urlError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {urlError}
        </div>
      )}

      <Card className="p-6">
        {/* Google login */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full flex items-center gap-3 mb-5"
          onClick={handleGoogleLogin}
          loading={googleLoading}
          aria-label="Google로 로그인"
        >
          {!googleLoading && (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google로 계속하기
        </Button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border-default)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[var(--color-text-tertiary)]">또는</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
          <Input
            type="email"
            label="이메일"
            placeholder="이메일을 입력해 주세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            aria-required="true"
          />
          <Input
            type="password"
            label="비밀번호"
            placeholder="비밀번호를 입력해 주세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
            aria-required="true"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            로그인
          </Button>
        </form>
      </Card>

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-5">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-[var(--color-accent-primary)] hover:underline">
          베타 신청하기
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md animate-pulse h-96 bg-[var(--color-surface-muted)] rounded-[var(--radius-xl)]" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
