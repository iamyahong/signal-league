"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("이메일을 입력해 주세요");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/internal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "오류가 발생했습니다");
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error("오류가 발생했습니다. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">비밀번호 찾기</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          가입 시 사용한 이메일 주소를 입력하세요
        </p>
      </div>

      <Card className="p-6">
        {submitted ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-900/10 mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-[var(--color-text-primary)] font-medium mb-2">메일을 확인해주세요</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              해당 이메일로 가입된 계정이 있다면 비밀번호 재설정 링크를 발송했습니다.
              <br />
              메일이 도착하지 않으면 스팸함을 확인해 주세요.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              type="email"
              label="이메일"
              placeholder="가입 이메일을 입력해 주세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              재설정 링크 보내기
            </Button>
          </form>
        )}
      </Card>

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-5">
        <Link href="/login" className="text-[var(--color-accent-primary)] hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>

      <div className="mt-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        Google 계정으로 가입하신 경우 Google 계정의 비밀번호 찾기를 이용해 주세요.
      </div>
    </div>
  );
}
