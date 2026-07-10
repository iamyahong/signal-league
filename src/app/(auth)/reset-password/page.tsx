"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Card className="p-6 text-center">
        <p className="text-[var(--color-text-secondary)]">유효하지 않은 재설정 링크입니다.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          비밀번호 찾기 다시 시도하기
        </Link>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { password?: string; confirm?: string } = {};
    if (password.length < 8) newErrors.password = "비밀번호는 8자 이상이어야 합니다";
    if (password !== confirm) newErrors.confirm = "비밀번호가 일치하지 않습니다";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("/internal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "오류가 발생했습니다");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      toast.error("오류가 발생했습니다. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-900/10 mb-4">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-[var(--color-text-primary)] font-medium mb-2">비밀번호가 변경되었습니다</p>
        <p className="text-sm text-[var(--color-text-secondary)]">잠시 후 로그인 페이지로 이동합니다…</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          type="password"
          label="새 비밀번호"
          placeholder="8자 이상 입력해 주세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          type="password"
          label="새 비밀번호 확인"
          placeholder="비밀번호를 한 번 더 입력해 주세요"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          비밀번호 변경
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">비밀번호 재설정</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">새 비밀번호를 입력해 주세요</p>
      </div>
      <Suspense fallback={<div className="h-48 bg-[var(--color-surface-muted)] rounded-xl animate-pulse" />}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-5">
        <Link href="/login" className="text-[var(--color-accent-primary)] hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
