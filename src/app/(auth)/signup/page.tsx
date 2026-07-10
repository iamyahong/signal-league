"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { CheckCircle } from "lucide-react";
import { validateNickname } from "@/lib/validators/nickname";

const PLAN_OPTIONS = [
  { code: "BASIC", name: "Basic", price: "1,100원/월", score: "1,000점", target: "입문자" },
  { code: "STANDARD", name: "Standard", price: "3,900원/월", score: "4,000점", target: "일반 사용자" },
  { code: "PRO", name: "Pro", price: "9,900원/월", score: "10,000점", target: "적극 참여자" },
];

const CATEGORIES = [
  { slug: "economy", name: "경제·금융" },
  { slug: "international", name: "국제정세" },
  { slug: "society", name: "사회" },
  { slug: "tech", name: "기술·AI" },
  { slug: "culture", name: "문화·엔터" },
  { slug: "sports", name: "스포츠" },
];

const JOIN_PURPOSES = [
  "투자 판단력 검증",
  "사회 흐름 학습",
  "예측 커뮤니티",
  "기타",
];

function sanitizeNickname(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣_]/g, "").slice(0, 20);
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planFromUrl = searchParams?.get("plan")?.toUpperCase() || "BASIC";
  const refCode = searchParams?.get("ref") || "";
  const isGoogleFlow = searchParams?.get("provider") === "google";
  const googleEmail = searchParams?.get("email") || "";
  const googleName = searchParams?.get("name") || "";
  const suggestedNickname = sanitizeNickname(googleName);

  const [step, setStep] = useState(isGoogleFlow ? 2 : 1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: isGoogleFlow ? googleEmail : "",
    nickname: "",
    password: "",
    passwordConfirm: "",
    referralCode: refCode,
    planCode: PLAN_OPTIONS.find((p) => p.code === planFromUrl) ? planFromUrl : "BASIC",
    favoriteCategories: [] as string[],
    joinPurpose: "",
    agreeTerms: false,
    agreeScore: false,
    agreePrivacy: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referrerNickname, setReferrerNickname] = useState<string | null>(null);
  const [referralStatus, setReferralStatus] = useState<"idle" | "loading" | "found" | "not_found">(
    refCode ? "loading" : "idle"
  );

  const lookupReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferrerNickname(null);
      setReferralStatus("idle");
      return;
    }
    setReferralStatus("loading");
    try {
      const res = await fetch(`/internal/users/by-referral-code/${encodeURIComponent(code.toUpperCase())}`);
      if (res.ok) {
        const data = await res.json() as { nickname: string };
        setReferrerNickname(data.nickname);
        setReferralStatus("found");
      } else {
        setReferrerNickname(null);
        setReferralStatus("not_found");
      }
    } catch {
      setReferralStatus("idle");
    }
  };

  const handleReferralCodeChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    updateForm("referralCode", upper);
    if (upper.length >= 4) {
      lookupReferralCode(upper);
    } else {
      setReferrerNickname(null);
      setReferralStatus("idle");
    }
  };

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current && refCode) {
      hasMountedRef.current = true;
      lookupReferralCode(refCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleCategory = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      favoriteCategories: prev.favoriteCategories.includes(slug)
        ? prev.favoriteCategories.filter((c) => c !== slug)
        : [...prev.favoriteCategories, slug],
    }));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "올바른 이메일 형식을 입력해 주세요";
    const nickResult = validateNickname(form.nickname);
    if (!nickResult.ok) newErrors.nickname = nickResult.message;
    if (!form.password || form.password.length < 8)
      newErrors.password = "비밀번호는 8자 이상이어야 합니다";
    if (form.password !== form.passwordConfirm)
      newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGoogleStep2 = () => {
    const newErrors: Record<string, string> = {};
    const nickResult = validateNickname(form.nickname);
    if (!nickResult.ok) newErrors.nickname = nickResult.message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    if (isGoogleFlow && !validateGoogleStep2()) return;

    const newErrors: Record<string, string> = {};
    if (!form.agreeTerms) newErrors.agreeTerms = "이용약관에 동의해 주세요";
    if (!form.agreeScore) newErrors.agreeScore = "점수 정책에 동의해 주세요";
    if (!form.agreePrivacy) newErrors.agreePrivacy = "개인정보처리방침에 동의해 주세요";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/internal/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          nickname: form.nickname,
          ...(isGoogleFlow
            ? { provider: "google" }
            : { password: form.password }),
          planCode: form.planCode,
          favoriteCategories: form.favoriteCategories,
          joinPurpose: form.joinPurpose || undefined,
          agreeTerms: form.agreeTerms,
          agreeScore: form.agreeScore,
          agreePrivacy: form.agreePrivacy,
          ref: form.referralCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "회원가입 중 오류가 발생했습니다");
        return;
      }

      if (isGoogleFlow) {
        // Google 가입 완료 → Google OAuth 재실행으로 세션 생성
        // (이미 어댑터가 Account 연결을 준비했으므로 이번엔 통과됨)
        toast.success("가입이 완료되었습니다. Google 로그인을 진행합니다...");
        await signIn("google", { callbackUrl: "/pending" });
      } else {
        // 이메일 가입 완료 → credentials 자동 로그인
        const signInResult = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
          callbackUrl: "/pending",
        });
        if (signInResult?.ok) {
          router.push("/pending");
        } else {
          toast.success("회원가입이 완료되었습니다. 로그인해 주세요.");
          router.push("/login");
        }
      }
    } catch {
      toast.error("회원가입 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">베타 신청</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {isGoogleFlow
            ? "요금제와 닉네임을 선택하면 바로 시작할 수 있습니다"
            : "정보를 입력하고 Signal League 베타에 참여하세요"}
        </p>

        {!isGoogleFlow && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className={`flex items-center gap-2 ${s > 1 ? "ml-2" : ""}`}>
                {s > 1 && <div className="w-8 h-px bg-[var(--color-border-default)]" />}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step >= s
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)] border border-[var(--color-border-default)]"
                  }`}
                >
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                <span
                  className={`text-xs ${
                    step >= s
                      ? "text-[var(--color-text-primary)] font-medium"
                      : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {s === 1 ? "기본 정보" : "요금제·동의"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 1: 이메일/비밀번호 (일반 가입만) ── */}
      {step === 1 && !isGoogleFlow && (
        <Card className="p-6 space-y-4">
          <Input
            type="email"
            label="이메일"
            placeholder="이메일을 입력해 주세요"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            error={errors.email}
            autoComplete="email"
            aria-required="true"
          />
          <Input
            type="text"
            label="닉네임"
            placeholder="2~20자, 영문·한글·숫자·_ 사용 가능"
            value={form.nickname}
            onChange={(e) => updateForm("nickname", e.target.value)}
            error={errors.nickname}
            aria-required="true"
          />
          <Input
            type="password"
            label="비밀번호"
            placeholder="8자 이상 입력해 주세요"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            aria-required="true"
          />
          <Input
            type="password"
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력해 주세요"
            value={form.passwordConfirm}
            onChange={(e) => updateForm("passwordConfirm", e.target.value)}
            error={errors.passwordConfirm}
            autoComplete="new-password"
            aria-required="true"
          />
          <div>
            <Input
              type="text"
              label="추천 코드 (선택)"
              placeholder="추천인 코드를 입력해 주세요"
              value={form.referralCode}
              onChange={(e) => handleReferralCodeChange(e.target.value)}
              autoComplete="off"
              maxLength={8}
            />
            {referralStatus === "loading" && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">확인 중…</p>
            )}
            {referralStatus === "found" && referrerNickname && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                {referrerNickname}님의 초대 코드 — 첫 참여 시 양쪽 +500점
              </p>
            )}
            {referralStatus === "not_found" && form.referralCode.length >= 4 && (
              <p className="text-xs text-red-500 mt-1">추천 코드를 찾을 수 없습니다.</p>
            )}
          </div>
          <Button variant="primary" size="lg" className="w-full mt-2" onClick={handleNext}>
            다음 단계
          </Button>
        </Card>
      )}

      {/* ── Step 2: 요금제·동의 ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Google 플로우: 계정 정보 + 닉네임 입력 */}
          {isGoogleFlow && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Google 계정으로 가입 중</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{googleEmail}</p>
                </div>
              </div>
              <Input
                type="text"
                label="닉네임"
                placeholder={suggestedNickname ? `예: ${suggestedNickname}` : "2~20자, 영문·한글·숫자·_ 사용 가능"}
                value={form.nickname}
                onChange={(e) => updateForm("nickname", e.target.value)}
                error={errors.nickname}
                aria-required="true"
              />
            </Card>
          )}

          {/* 요금제 선택 */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              희망 요금제 선택 <span className="text-[var(--color-accent-danger)]">*</span>
            </p>
            <div className="space-y-2">
              {PLAN_OPTIONS.map((plan) => (
                <label
                  key={plan.code}
                  className={`flex items-center justify-between p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-colors ${
                    form.planCode === plan.code
                      ? "border-[var(--color-accent-primary)] bg-[#e8f4fd]"
                      : "border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="planCode"
                      value={plan.code}
                      checked={form.planCode === plan.code}
                      onChange={() => updateForm("planCode", plan.code)}
                      className="accent-[var(--color-accent-primary)]"
                      aria-label={plan.name}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{plan.name}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">추천: {plan.target}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--color-text-secondary)]">{plan.price}</div>
                    <div className="text-xs font-semibold text-[var(--color-accent-success)]">월 {plan.score}</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">베타 기간 중 실제 결제는 진행되지 않습니다.</p>
          </Card>

          {/* 관심 카테고리 */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">관심 카테고리 (선택)</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggleCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium border transition-colors ${
                    form.favoriteCategories.includes(cat.slug)
                      ? "bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)]"
                      : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                  aria-pressed={form.favoriteCategories.includes(cat.slug)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </Card>

          {/* 가입 목적 */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">가입 목적 (선택)</p>
            <div className="space-y-2">
              {JOIN_PURPOSES.map((purpose) => (
                <label key={purpose} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="joinPurpose"
                    value={purpose}
                    checked={form.joinPurpose === purpose}
                    onChange={() => updateForm("joinPurpose", purpose)}
                    className="accent-[var(--color-accent-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">{purpose}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* 이용 동의 */}
          <Card className="p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">이용 동의</p>
            <Checkbox
              checked={form.agreeTerms}
              onChange={(e) => updateForm("agreeTerms", e.target.checked)}
              error={errors.agreeTerms}
              label={
                <span>
                  Signal League{" "}
                  <Link href="/terms" target="_blank" className="text-[var(--color-accent-primary)] underline">
                    이용약관
                  </Link>
                  에 동의합니다 <span className="text-[var(--color-accent-danger)]">*</span>
                </span>
              }
            />
            <Checkbox
              checked={form.agreeScore}
              onChange={(e) => updateForm("agreeScore", e.target.checked)}
              error={errors.agreeScore}
              label={
                <span className="text-[var(--color-text-secondary)]">
                  Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산, 외부 포인트로 환전·교환·양도·판매할 수 없는
                  비금전성 서비스 점수임을 확인했습니다. (
                  <Link href="/score-policy" target="_blank" className="text-[var(--color-accent-primary)] underline">
                    점수 정책
                  </Link>
                  ) <span className="text-[var(--color-accent-danger)]">*</span>
                </span>
              }
            />
            <Checkbox
              checked={form.agreePrivacy}
              onChange={(e) => updateForm("agreePrivacy", e.target.checked)}
              error={errors.agreePrivacy}
              label={
                <span>
                  <Link href="/privacy" target="_blank" className="text-[var(--color-accent-primary)] underline">
                    개인정보처리방침
                  </Link>
                  에 동의합니다 <span className="text-[var(--color-accent-danger)]">*</span>
                </span>
              }
            />
          </Card>

          <div className="flex gap-3">
            {!isGoogleFlow && (
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>
                이전
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              className={isGoogleFlow ? "w-full" : "flex-1"}
              onClick={handleSubmit}
              loading={loading}
            >
              베타 신청 완료
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-5">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-[var(--color-accent-primary)] hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-lg animate-pulse h-96 bg-[var(--color-surface-muted)] rounded-[var(--radius-xl)]" />
      }
    >
      <SignupForm />
    </Suspense>
  );
}
