"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertTriangle, ChevronDown, ChevronUp, Lock } from "lucide-react";
import {
  DEFAULT_PREFERENCES,
  type Channel,
  type NotificationPreferences,
} from "@/lib/notificationPreferences";
import { validateNickname } from "@/lib/validators/nickname";

interface Category { slug: string; name: string }

interface Props {
  email: string;
  nickname: string;
  hasPassword: boolean;
  lastNicknameChangedAt: string | null;
  desiredPlanCode: string;
  createdAt: string;
  bio: string | null;
  favoriteCategories: string[];
  notificationPreferences: Record<string, { inApp: boolean; email: boolean }> | null;
  allCategories: Category[];
}

type MatrixRow =
  | { key: keyof NotificationPreferences; label: string; note?: string; inAppLocked?: false; emailLocked?: false }
  | { key: keyof NotificationPreferences; label: string; note: string; inAppLocked: true; emailLocked: true }
  | { key: keyof NotificationPreferences; label: string; note: string; inAppLocked?: false; emailLocked: true };

const NOTIFICATION_MATRIX: MatrixRow[] = [
  {
    key: "betaApproved",
    label: "베타 승인 완료",
    note: "운영성 필수 알림",
    inAppLocked: true,
    emailLocked: true,
  },
  { key: "questionApproved", label: "내 예측 문제 승인" },
  { key: "questionRejected",  label: "내 예측 문제 반려" },
  { key: "resultConfirmed",   label: "참여한 문제 결과 확정" },
  {
    key: "questionVoided",
    label: "예측 문제 무효 처리",
    note: "영향이 커서 이메일은 항상 발송",
    emailLocked: true,
  },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-6 mb-4">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-gray-300"
          : checked
            ? "bg-[var(--color-accent-primary)] cursor-pointer"
            : "bg-gray-300 cursor-pointer"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function toNewStructure(
  raw: Record<string, { inApp: boolean; email: boolean }> | null
): NotificationPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  const isNew = raw["questionApproved"] !== undefined && typeof raw["questionApproved"] === "object";
  if (isNew) {
    return {
      questionApproved: raw["questionApproved"] ?? DEFAULT_PREFERENCES.questionApproved,
      questionRejected:  raw["questionRejected"] ?? DEFAULT_PREFERENCES.questionRejected,
      resultConfirmed:   raw["resultConfirmed"]  ?? DEFAULT_PREFERENCES.resultConfirmed,
      betaApproved:      raw["betaApproved"]     ?? DEFAULT_PREFERENCES.betaApproved,
      questionVoided:    raw["questionVoided"]   ?? DEFAULT_PREFERENCES.questionVoided,
    };
  }
  return { ...DEFAULT_PREFERENCES };
}

export function SettingsClient({
  email,
  nickname: initialNickname,
  hasPassword,
  lastNicknameChangedAt,
  createdAt,
  bio: initialBio,
  favoriteCategories: initialFavCats,
  notificationPreferences: initialNotifPrefs,
  allCategories,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameError, setNicknameError] = useState("");
  const [bio, setBio] = useState(initialBio ?? "");
  const [favCats, setFavCats] = useState<string[]>(initialFavCats);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    () => toNewStructure(initialNotifPrefs)
  );

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");

  const nicknameChangedDate = lastNicknameChangedAt ? new Date(lastNicknameChangedAt) : null;
  const canChangeNickname =
    !nicknameChangedDate ||
    Date.now() - nicknameChangedDate.getTime() > 30 * 24 * 60 * 60 * 1000;

  function toggleFavCat(slug: string) {
    setFavCats((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 6
          ? [...prev, slug]
          : prev
    );
  }

  function setChannel(key: keyof NotificationPreferences, field: "inApp" | "email", value: boolean) {
    setNotifPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function saveProfile() {
    if (canChangeNickname && nickname !== initialNickname) {
      const nickResult = validateNickname(nickname);
      if (!nickResult.ok) {
        setNicknameError(nickResult.message);
        return;
      }
    }
    setNicknameError("");
    startTransition(async () => {
      const res = await fetch("/internal/me/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio, favoriteCategories: favCats }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("프로필이 저장되었습니다.");
        router.refresh();
      } else {
        toast.error(data.error ?? "저장 중 오류가 발생했습니다.");
      }
    });
  }

  async function changePassword() {
    if (newPw !== confirmPw) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/internal/me/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("비밀번호가 변경되었습니다.");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        toast.error(data.error ?? "변경 중 오류가 발생했습니다.");
      }
    });
  }

  async function saveNotifPrefs() {
    const snapshot = notifPrefs;
    startTransition(async () => {
      const res = await fetch("/internal/me/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: notifPrefs }),
      });
      if (res.ok) {
        toast.success("알림 설정이 저장되었습니다.");
      } else {
        setNotifPrefs(snapshot);
        toast.error("저장 중 오류가 발생했습니다.");
      }
    });
  }

  async function deactivate() {
    if (!confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    startTransition(async () => {
      const res = await fetch("/internal/me/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deactivateReason }),
      });
      if (res.ok) {
        toast.success("회원 탈퇴가 처리되었습니다.");
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json();
        toast.error(data.error ?? "탈퇴 처리 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div>
      {/* Account info */}
      <Section title="계정 정보">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-default)]">
            <span className="text-[var(--color-text-secondary)]">이메일</span>
            <span className="font-medium text-[var(--color-text-primary)]">{email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[var(--color-text-secondary)]">가입일</span>
            <span className="text-[var(--color-text-primary)]">
              {new Date(createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </Section>

      {/* Profile edit */}
      <Section title="프로필 수정" description="닉네임, 자기소개, 관심 카테고리를 변경합니다.">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNicknameError(""); }}
              onBlur={() => {
                if (canChangeNickname && nickname !== initialNickname) {
                  const r = validateNickname(nickname);
                  setNicknameError(r.ok ? "" : r.message);
                }
              }}
              disabled={!canChangeNickname}
              className={`w-full rounded-[var(--radius-lg)] border px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-[var(--color-text-tertiary)] ${nicknameError ? "border-red-400" : "border-[var(--color-border-default)]"}`}
            />
            {nicknameError && (
              <p className="text-xs text-red-500 mt-1">{nicknameError}</p>
            )}
            {!canChangeNickname && nicknameChangedDate && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {nicknameChangedDate.toLocaleDateString("ko-KR")} 이후 변경 가능합니다.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              자기소개 <span className="text-[var(--color-text-tertiary)] font-normal">({bio.length}/300)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              rows={3}
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none"
              placeholder="나를 소개하는 한 줄을 적어보세요."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              관심 카테고리 <span className="text-[var(--color-text-tertiary)] font-normal">(최대 6개)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggleFavCat(cat.slug)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    favCats.includes(cat.slug)
                      ? "bg-[var(--color-accent-primary)] text-white border-transparent"
                      : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={saveProfile}
            disabled={isPending}
            className="rounded-[var(--radius-lg)] bg-[var(--color-accent-primary)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            프로필 저장
          </button>
        </div>
      </Section>

      {/* Password change */}
      {hasPassword && (
        <Section title="비밀번호 변경">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm"
                placeholder="영문+숫자 포함 8자 이상"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={changePassword}
              disabled={isPending || !currentPw || !newPw || !confirmPw}
              className="rounded-[var(--radius-lg)] bg-[var(--color-accent-primary)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              비밀번호 변경
            </button>
          </div>
        </Section>
      )}

      {/* Notification preferences — matrix UI */}
      <Section title="알림 설정" description="수신할 알림 유형과 채널을 선택합니다.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pb-3 text-[var(--color-text-secondary)] font-medium pr-4" />
                <th className="pb-3 text-center text-[var(--color-text-secondary)] font-medium w-16">인앱</th>
                <th className="pb-3 text-center text-[var(--color-text-secondary)] font-medium w-16">이메일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {NOTIFICATION_MATRIX.map((row) => {
                const inAppLocked = (row as { inAppLocked?: boolean }).inAppLocked === true;
                const emailLocked = (row as { emailLocked?: boolean }).emailLocked === true;
                return (
                  <tr key={row.key} className="align-middle">
                    <td className="py-3 pr-4">
                      <p className="text-[var(--color-text-primary)] font-medium">{row.label}</p>
                      {row.note && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3 flex-shrink-0" />
                          {row.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={inAppLocked ? true : notifPrefs[row.key].inApp}
                          disabled={inAppLocked}
                          onChange={inAppLocked ? undefined : (v) => setChannel(row.key, "inApp", v)}
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={emailLocked ? true : notifPrefs[row.key].email}
                          disabled={emailLocked}
                          onChange={emailLocked ? undefined : (v) => setChannel(row.key, "email", v)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={saveNotifPrefs}
          disabled={isPending}
          className="mt-4 rounded-[var(--radius-lg)] bg-[var(--color-accent-primary)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          알림 설정 저장
        </button>
      </Section>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-[var(--radius-xl)] p-6">
        <button
          onClick={() => setShowDeactivate(!showDeactivate)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">회원 탈퇴</span>
          </div>
          {showDeactivate ? (
            <ChevronUp className="h-4 w-4 text-red-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-red-500" />
          )}
        </button>
        {showDeactivate && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              탈퇴 시 계정이 비활성화되며 보유 점수와 활동 내역은 복구되지 않습니다.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                탈퇴 사유 <span className="text-[var(--color-text-tertiary)] font-normal">(선택)</span>
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                rows={2}
                className="w-full rounded-[var(--radius-lg)] border border-red-200 px-3 py-2 text-sm resize-none"
                placeholder="더 나은 서비스를 위해 의견을 남겨주세요."
              />
            </div>
            <button
              onClick={deactivate}
              disabled={isPending}
              className="rounded-[var(--radius-lg)] bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              탈퇴하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
