"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface NewQuestionFormProps {
  categories: Category[];
  currentScore: number;
  minCost: number;
  maxCost: number;
}

const QUICK_COSTS = [
  { label: "최소(5%)", getPct: (s: number, min: number) => min },
  { label: "10%", getPct: (s: number) => Math.floor(s * 0.1) },
  { label: "20%", getPct: (s: number) => Math.floor(s * 0.2) },
];

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getNextMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function NewQuestionForm({ categories, currentScore, minCost, maxCost }: NewQuestionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [closesAt, setClosesAt] = useState(getTomorrow());
  const [resolvesAt, setResolvesAt] = useState(getNextMonth());
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [options, setOptions] = useState([
    { label: "", description: "" },
    { label: "", description: "" },
  ]);
  const [costInput, setCostInput] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const cost = parseInt(costInput, 10) || 0;
  const costPct = currentScore > 0 ? ((cost / currentScore) * 100).toFixed(1) : "0.0";

  function costError(): string | null {
    if (!costInput) return null;
    if (isNaN(parseInt(costInput, 10))) return "정수를 입력해주세요.";
    if (cost < minCost) return `최소 ${minCost.toLocaleString()}점 이상 입력해야 합니다.`;
    if (cost > currentScore) return "보유 점수보다 큰 금액을 입력할 수 없습니다.";
    if (cost > maxCost) return `최대 ${maxCost.toLocaleString()}점까지 가능합니다.`;
    return null;
  }

  function addOption() {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, { label: "", description: "" }]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, field: "label" | "description", value: string) {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  function addSourceUrl() {
    if (sourceUrls.length >= 5) return;
    setSourceUrls((prev) => [...prev, ""]);
  }

  function updateSourceUrl(idx: number, value: string) {
    setSourceUrls((prev) => prev.map((u, i) => i === idx ? value : u));
  }

  function removeSourceUrl(idx: number) {
    setSourceUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  const inputErr = costError();

  async function handleSubmit() {
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!categoryId) { toast.error("카테고리를 선택해주세요."); return; }
    if (description.length < 20) { toast.error("설명을 20자 이상 입력해주세요."); return; }
    if (resolutionCriteria.length < 20) { toast.error("결과 확정 기준을 20자 이상 입력해주세요."); return; }
    if (options.some((o) => !o.label.trim())) { toast.error("선택지 텍스트를 모두 입력해주세요."); return; }
    const labels = options.map((o) => o.label.trim());
    if (new Set(labels).size !== labels.length) { toast.error("선택지 텍스트가 중복되었습니다."); return; }
    if (!costInput || inputErr) { toast.error(inputErr ?? "생성 비용을 입력해주세요."); return; }
    if (!agreed) { toast.error("동의 체크박스를 선택해주세요."); return; }

    const validUrls = sourceUrls.filter((u) => u.trim());

    setLoading(true);
    try {
      const res = await fetch("/internal/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, categoryId, description, resolutionCriteria,
          closesAt, resolvesAt,
          sourceUrls: validUrls,
          options: options.map((o) => ({ label: o.label.trim(), description: o.description.trim() || undefined })),
          creatorCost: cost,
        }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error ?? "제출에 실패했습니다."); return; }
      toast.success("예측 문제가 제출되었습니다. 운영자 검토 후 공개됩니다.");
      router.push("/me/questions?submitted=1");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">기본 정보</h2>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">제목 <span className="text-red-500">*</span></label>
            <span className="text-xs text-[var(--color-text-tertiary)]">{title.length}/100</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="예측 문제 제목을 입력하세요 (5~100자)"
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">카테고리 <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${categoryId === cat.id ? "bg-[var(--color-accent-primary)] text-white border-transparent" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">설명 <span className="text-red-500">*</span></label>
            <span className="text-xs text-[var(--color-text-tertiary)]">{description.length}/1000</span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">문제의 배경, 왜 중요한지, 주요 논쟁 지점을 적어주세요.</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="최소 20자 이상"
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">선택지 <span className="text-red-500">*</span></h2>
        <p className="text-xs text-[var(--color-text-tertiary)]">선택지는 서로 겹치지 않게, 명확하게 작성해주세요. (최소 2개, 최대 5개)</p>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--color-border-default)] bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-[10px] font-bold text-white leading-none">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">선택지</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  disabled={options.length <= 2}
                  className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  aria-label="선택지 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(idx, "label", e.target.value)}
                maxLength={50}
                placeholder={`예: ${idx === 0 ? "그렇다" : idx === 1 ? "아니다" : `선택지 ${idx + 1}`} (필수, 최대 50자)`}
                className="w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
              />
              <input
                type="text"
                value={opt.description}
                onChange={(e) => updateOption(idx, "description", e.target.value)}
                maxLength={200}
                placeholder="부가 설명 (선택, 최대 200자)"
                className="w-full rounded-lg border border-[var(--color-border-subtle,var(--color-border-default))] bg-white/70 px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/20"
              />
            </div>
          ))}
        </div>
        {options.length < 5 ? (
          <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-sm text-[var(--color-accent-primary)] hover:underline">
            <Plus className="h-4 w-4" />선택지 추가
          </button>
        ) : (
          <p className="text-xs text-[var(--color-text-tertiary)]">선택지는 최대 5개까지 추가할 수 있습니다.</p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">일정</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">참여 마감일 <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30" />
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">최소 24시간 이후</p>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">결과 확정 예정일 <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={resolvesAt} onChange={(e) => setResolvesAt(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30" />
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">참여 마감일 이후</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">결과 확정 기준 <span className="text-red-500">*</span></h2>
        <p className="text-xs text-[var(--color-text-tertiary)]">어떤 출처를 기준으로 결과를 확정할지, 무엇이 발생하면 어느 선택지가 정답이 되는지 객관적으로 작성해주세요.</p>
        <div className="flex justify-between">
          <span className="text-xs text-[var(--color-text-tertiary)]">최소 20자 이상</span>
          <span className="text-xs text-[var(--color-text-tertiary)]">{resolutionCriteria.length}/500</span>
        </div>
        <textarea
          value={resolutionCriteria}
          onChange={(e) => setResolutionCriteria(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="예: 2026년 5월 한국은행 금통위 결정을 기준으로 합니다. 기준금리가 인하되면 '인하'가 정답이 됩니다."
          className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
        />
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">참고 출처 URL <span className="text-[var(--color-text-tertiary)] font-normal">(선택, 최대 5개)</span></h2>
        {sourceUrls.map((url, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => updateSourceUrl(idx, e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
            />
            <button type="button" onClick={() => removeSourceUrl(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {sourceUrls.length < 5 && (
          <button type="button" onClick={addSourceUrl} className="flex items-center gap-1.5 text-sm text-[var(--color-accent-primary)] hover:underline">
            <Plus className="h-4 w-4" />URL 추가
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">생성 비용</h2>

        <div className="rounded-xl bg-gray-50 border border-[var(--color-border-default)] p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">현재 보유 점수</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{currentScore.toLocaleString()}점</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">최소 생성 비용 (보유의 5%)</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{minCost.toLocaleString()}점</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">최대 입력 가능</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{maxCost.toLocaleString()}점</span>
          </div>
        </div>

        <div>
          <input
            type="number"
            value={costInput}
            onChange={(e) => setCostInput(e.target.value)}
            placeholder={`최소 ${minCost}점`}
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          />
          {inputErr && <p className="mt-1 text-xs text-red-500">{inputErr}</p>}
          {costInput && !inputErr && cost > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">보유 점수의 {costPct}% ({cost.toLocaleString()}점)</p>
          )}
          <div className="mt-2 flex gap-1.5">
            {QUICK_COSTS.map(({ label, getPct }) => (
              <button key={label} type="button" onClick={() => setCostInput(String(getPct(currentScore, minCost)))}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50 hover:text-[var(--color-accent-primary)] transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">생성 비용은 문제 제출과 동시에 소진됩니다. 관리자가 문제를 반려하는 경우 운영 정책에 따라 반환될 수 있습니다.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[var(--color-accent-primary)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">위 내용으로 예측 문제를 제출하며, 입력한 생성 비용이 소진되는 것에 동의합니다.</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={loading || !agreed}
          className="mt-4 w-full rounded-xl bg-[var(--color-accent-primary)] py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "제출 중..." : "검토 요청하기"}
        </button>
      </div>
    </div>
  );
}
