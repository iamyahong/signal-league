"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { X, Plus, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  questionCount: number;
}

export function CategoriesClient({ categories, isSuperAdmin }: { categories: CategoryRow[]; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const patch = async (id: string, data: Record<string, unknown>) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/internal/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "오류가 발생했습니다.");
      toast.success("변경되었습니다.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleActive = (cat: CategoryRow) => {
    patch(cat.id, { isActive: !cat.isActive });
  };

  const handleMoveUp = (cat: CategoryRow) => {
    const above = categories.filter((c) => c.sortOrder < cat.sortOrder).at(-1);
    if (!above) return;
    Promise.all([
      patch(cat.id, { sortOrder: above.sortOrder }),
      fetch(`/internal/admin/categories/${above.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: cat.sortOrder }),
      }),
    ]).then(() => refresh());
  };

  const handleMoveDown = (cat: CategoryRow) => {
    const below = categories.filter((c) => c.sortOrder > cat.sortOrder)[0];
    if (!below) return;
    Promise.all([
      patch(cat.id, { sortOrder: below.sortOrder }),
      fetch(`/internal/admin/categories/${below.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: cat.sortOrder }),
      }),
    ]).then(() => refresh());
  };

  const handleSaveName = async (id: string) => {
    if (!editName.trim()) return;
    await patch(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/internal/admin/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      toast.success("카테고리가 삭제되었습니다.");
      setDeleteConfirm(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      {showAddModal && isSuperAdmin && (
        <AddCategoryModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); refresh(); }} />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          categoryId={deleteConfirm}
          categoryName={categories.find((c) => c.id === deleteConfirm)?.name ?? ""}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
          loading={loadingId === deleteConfirm}
        />
      )}

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">카테고리 목록</h2>
          {isSuperAdmin && (
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              카테고리 추가
            </Button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)] text-xs">
              <th className="text-left px-4 py-2.5 font-medium">순서</th>
              <th className="text-left px-4 py-2.5 font-medium">코드(슬러그)</th>
              <th className="text-left px-4 py-2.5 font-medium">카테고리명</th>
              <th className="text-center px-4 py-2.5 font-medium">활성</th>
              <th className="text-right px-4 py-2.5 font-medium">등록 문제 수</th>
              {isSuperAdmin && <th className="px-4 py-2.5 font-medium text-right">액션</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {categories.map((cat, idx) => (
              <tr key={cat.id} className={cat.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3 text-[var(--color-text-tertiary)]">
                  {isSuperAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={idx === 0 || loadingId === cat.id}
                        onClick={() => handleMoveUp(cat)}
                        className="p-0.5 rounded hover:bg-[var(--color-border-default)] disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-xs">{idx + 1}</span>
                      <button
                        disabled={idx === categories.length - 1 || loadingId === cat.id}
                        onClick={() => handleMoveDown(cat)}
                        className="p-0.5 rounded hover:bg-[var(--color-border-default)] disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{cat.slug}</td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(cat.id); if (e.key === "Escape") setEditingId(null); }}
                        className="border border-[var(--color-border-default)] rounded px-2 py-0.5 text-sm w-28 focus:outline-none focus:border-[var(--color-accent-primary)]"
                        autoFocus
                      />
                      <button onClick={() => handleSaveName(cat.id)} className="text-xs text-[var(--color-accent-primary)] font-medium">저장</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-[var(--color-text-tertiary)]">취소</button>
                    </div>
                  ) : (
                    <span
                      className={`font-medium text-[var(--color-text-primary)] ${isSuperAdmin ? "cursor-pointer hover:text-[var(--color-accent-primary)]" : ""}`}
                      onClick={() => { if (isSuperAdmin) { setEditingId(cat.id); setEditName(cat.name); } }}
                    >
                      {cat.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => handleToggleActive(cat)}
                      disabled={loadingId === cat.id}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${cat.isActive ? "bg-[var(--color-accent-primary)]" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${cat.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  ) : (
                    <span className={`text-xs font-medium ${cat.isActive ? "text-green-600" : "text-gray-400"}`}>
                      {cat.isActive ? "활성" : "비활성"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{cat.questionCount.toLocaleString()}개</td>
                {isSuperAdmin && (
                  <td className="px-4 py-3 text-right">
                    {cat.questionCount === 0 && (
                      <button
                        onClick={() => setDeleteConfirm(cat.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSuperAdmin && (
        <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
          카테고리 수정은 SUPER_ADMIN 권한이 필요합니다.
        </p>
      )}
    </>
  );
}

function AddCategoryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!slug.trim() || !name.trim()) { setError("슬러그와 카테고리명을 입력해 주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/internal/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      toast.success("카테고리가 추가되었습니다.");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">카테고리 추가</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">슬러그 *</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="예: politics" className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]" />
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">소문자·숫자·하이픈만 사용 가능합니다.</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">카테고리명 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 정치" className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]" />
        </div>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading}>{loading ? "추가 중..." : "추가"}</Button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ categoryId: _categoryId, categoryName, onClose, onConfirm, loading }: {
  categoryId: string; categoryName: string; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">카테고리 삭제</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              &quot;{categoryName}&quot; 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button variant="ghost" size="sm" onClick={onConfirm} disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
            {loading ? "삭제 중..." : "삭제 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
