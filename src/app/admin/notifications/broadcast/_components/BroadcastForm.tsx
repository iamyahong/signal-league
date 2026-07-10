"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Plan { code: string; name: string }
interface UserResult { id: string; nickname: string; email: string }

interface BroadcastResult {
  success: boolean;
  queued?: boolean;
  jobId?: string;
  totalCount?: number;
  inappSentCount?: number;
  emailSentCount?: number;
  emailBlockedCount?: number;
  message?: string;
  error?: string;
}

interface PreviewData {
  totalCount: number;
  blockedCount: number;
}

export function BroadcastForm({ plans }: { plans: Plan[] }) {
  const [targetType, setTargetType] = useState<"ALL" | "PLAN" | "INDIVIDUAL">("ALL");
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [channelInapp, setChannelInapp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [emailSubject, setEmailSubject] = useState("");

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // User search debounce
  useEffect(() => {
    if (targetType !== "INDIVIDUAL") return;
    if (userSearch.length < 1) { setUserSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/internal/admin/notifications/broadcast/users?q=${encodeURIComponent(userSearch)}`);
        const data = await res.json();
        setUserSearchResults(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, targetType]);

  // Fetch preview
  const fetchPreview = useCallback(async () => {
    if (!channelInapp && !channelEmail) return;
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({ targetType });
      if (targetType === "PLAN" && selectedPlans.length) params.set("planCodes", selectedPlans.join(","));
      if (targetType === "INDIVIDUAL" && selectedUsers.length) params.set("userIds", selectedUsers.map(u => u.id).join(","));
      const res = await fetch(`/internal/admin/notifications/broadcast?${params}`);
      const data = await res.json();
      setPreview(data);
    } finally {
      setPreviewLoading(false);
    }
  }, [targetType, selectedPlans, selectedUsers, channelInapp, channelEmail]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Poll job status for background jobs
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/internal/admin/notifications/broadcast/jobs/${jobId}`);
      const data = await res.json();
      if (data.job) {
        setJobStatus(data.job.status);
        if (data.job.status === "COMPLETED" || data.job.status === "FAILED") {
          clearInterval(pollRef.current!);
          setResult(prev => prev ? {
            ...prev,
            inappSentCount: data.job.inappSentCount,
            emailSentCount: data.job.emailSentCount,
            emailBlockedCount: data.job.emailBlockedCount,
          } : prev);
        }
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId]);

  function togglePlan(code: string) {
    setSelectedPlans(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  }

  function addUser(u: UserResult) {
    if (!selectedUsers.find(x => x.id === u.id)) setSelectedUsers(prev => [...prev, u]);
    setUserSearch("");
    setUserSearchResults([]);
  }

  function removeUser(id: string) {
    setSelectedUsers(prev => prev.filter(u => u.id !== id));
  }

  const canSubmit =
    (channelInapp || channelEmail) &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (targetType !== "PLAN" || selectedPlans.length > 0) &&
    (targetType !== "INDIVIDUAL" || selectedUsers.length > 0);

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        targetType,
        channelInapp,
        channelEmail,
        title: title.trim(),
        content: content.trim(),
        linkUrl: linkUrl.trim() || undefined,
        emailSubject: emailSubject.trim() || undefined,
      };
      if (targetType === "PLAN") body.planCodes = selectedPlans;
      if (targetType === "INDIVIDUAL") body.userIds = selectedUsers.map(u => u.id);

      const res = await fetch("/internal/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: BroadcastResult = await res.json();
      setResult(data);
      if (data.jobId && data.queued) {
        setJobId(data.jobId);
        setJobStatus("QUEUED");
      }
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  if (result?.success) {
    return (
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">✓</div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {result.queued ? "발송 작업이 등록되었습니다" : "발송 완료"}
            </h2>
            {result.queued && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                상태: {jobStatus ?? "처리 중..."} — 자동 갱신 중
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--color-border-default)]">
            <span className="text-[var(--color-text-secondary)]">총 대상</span>
            <span className="font-medium">{result.totalCount?.toLocaleString()}명</span>
          </div>
          {channelInapp && (
            <div className="flex justify-between py-2 border-b border-[var(--color-border-default)]">
              <span className="text-[var(--color-text-secondary)]">인앱 알림 발송</span>
              <span className="font-medium text-green-600">
                {result.queued ? (result.inappSentCount != null ? `${result.inappSentCount}건` : "처리 중...") : `${result.inappSentCount}건`}
              </span>
            </div>
          )}
          {channelEmail && (
            <>
              <div className="flex justify-between py-2 border-b border-[var(--color-border-default)]">
                <span className="text-[var(--color-text-secondary)]">이메일 발송 성공</span>
                <span className="font-medium text-green-600">
                  {result.queued ? (result.emailSentCount != null ? `${result.emailSentCount}건` : "처리 중...") : `${result.emailSentCount}건`}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-text-secondary)]">이메일 차단(skip)</span>
                <span className="font-medium text-orange-500">
                  {result.queued ? (result.emailBlockedCount != null ? `${result.emailBlockedCount}건` : "처리 중...") : `${result.emailBlockedCount}건`}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null); setJobId(null); setJobStatus(null);
              setTitle(""); setContent(""); setLinkUrl(""); setEmailSubject("");
            }}
          >
            새 공지 발송
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-6 max-w-2xl space-y-6">
        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{result.error}</div>
        )}

        {/* 발송 대상 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">발송 대상</h2>
          <div className="flex gap-3">
            {(["ALL", "PLAN", "INDIVIDUAL"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="targetType" value={t} checked={targetType === t} onChange={() => setTargetType(t)} className="accent-[var(--color-accent-primary)]" />
                <span className="text-sm">{t === "ALL" ? "전체 회원" : t === "PLAN" ? "요금제 그룹" : "개별 회원"}</span>
              </label>
            ))}
          </div>

          {targetType === "PLAN" && (
            <div className="flex gap-3 pl-4">
              {plans.map((p) => (
                <label key={p.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlans.includes(p.code)}
                    onChange={() => togglePlan(p.code)}
                    className="accent-[var(--color-accent-primary)]"
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          )}

          {targetType === "INDIVIDUAL" && (
            <div className="pl-4 space-y-2">
              <Input
                placeholder="이메일 또는 닉네임으로 검색"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="text-sm"
              />
              {searching && <p className="text-xs text-[var(--color-text-tertiary)]">검색 중...</p>}
              {userSearchResults.length > 0 && (
                <div className="border border-[var(--color-border-default)] rounded-lg overflow-hidden">
                  {userSearchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addUser(u)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-muted)] flex items-center justify-between"
                    >
                      <span className="font-medium">{u.nickname}</span>
                      <span className="text-[var(--color-text-tertiary)]">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1.5 bg-[var(--color-surface-muted)] rounded-full px-2.5 py-1 text-xs">
                      {u.nickname}
                      <button type="button" onClick={() => removeUser(u.id)} className="text-[var(--color-text-tertiary)] hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 발송 채널 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">발송 채널</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={channelInapp} onChange={(e) => setChannelInapp(e.target.checked)} className="accent-[var(--color-accent-primary)]" />
              <span className="text-sm">인앱 알림</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} className="accent-[var(--color-accent-primary)]" />
              <span className="text-sm">이메일</span>
            </label>
          </div>
        </section>

        {/* 내용 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">알림 내용</h2>
          <div className="space-y-2">
            <label className="text-xs text-[var(--color-text-secondary)]">제목 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[var(--color-text-secondary)]">내용 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용"
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] resize-y"
            />
            <p className="text-xs text-[var(--color-text-tertiary)] text-right">{content.length}/2000</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[var(--color-text-secondary)]">관련 링크 (선택)</label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          {channelEmail && (
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-text-secondary)]">이메일 제목 (비워두면 알림 제목 사용)</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={title || "공지 제목"}
                maxLength={200}
              />
            </div>
          )}
        </section>

        {/* 예약 발송 안내 */}
        <section className="bg-[var(--color-surface-muted)] rounded-lg p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            📅 예약 발송은 추후 지원 예정입니다. 현재는 즉시 발송만 가능합니다.
          </p>
        </section>

        {/* 대상 미리보기 */}
        {(channelInapp || channelEmail) && (
          <section className="border border-[var(--color-border-default)] rounded-lg p-4 space-y-1.5">
            <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">발송 미리보기</h2>
            {previewLoading ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">계산 중...</p>
            ) : preview ? (
              <>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">총 {preview.totalCount.toLocaleString()}명에게 발송됩니다</p>
                {channelEmail && preview.blockedCount > 0 && (
                  <p className="text-xs text-orange-500">이 중 {preview.blockedCount}명은 이메일 차단 상태 — 인앱은 발송, 이메일은 자동 skip</p>
                )}
                {preview.totalCount >= 100 && (
                  <p className="text-xs text-[var(--color-text-tertiary)]">100명 이상 — 백그라운드 처리됩니다 (약 {Math.ceil(preview.totalCount / 4)}초 소요 예상)</p>
                )}
              </>
            ) : null}
          </section>
        )}

        <div className="pt-2">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit || previewLoading}
            className="w-full sm:w-auto"
          >
            발송 확인
          </Button>
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[var(--radius-xl)] p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">발송 확인</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              총 <strong>{preview?.totalCount?.toLocaleString() ?? "?"}명</strong>에게 발송하시겠습니까?
              <br />이 작업은 취소할 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>취소</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "발송 중..." : "발송 확정"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
