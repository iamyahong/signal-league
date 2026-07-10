"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmActionModal } from "@/app/admin/_components/ConfirmActionModal";
import { UserRoleType } from "@prisma/client";
import { Edit2, Trash2, Plus } from "lucide-react";

interface SettingItem { id: string; key: string; value: string; label: string; description: string }
interface AdminRoleItem { id: string; role: UserRoleType; userId: string; email: string; nickname: string }

interface Props {
  settings: SettingItem[];
  adminRoles: AdminRoleItem[];
  isSuperAdmin: boolean;
  currentUserId: string;
}

interface EditTarget { key: string; current: string; label: string }

export function AdminSettingsClient({ settings, adminRoles, isSuperAdmin, currentUserId }: Props) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [newValue, setNewValue] = useState("");
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [addAdminRole, setAddAdminRole] = useState<UserRoleType>(UserRoleType.OPERATOR);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminRoleItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEditSetting = async (reason: string) => {
    if (!editTarget) return;
    const res = await fetch("/internal/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: editTarget.key, value: newValue, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
    toast.success("설정이 업데이트되었습니다.");
    router.refresh();
  };

  const handleAddAdmin = async () => {
    if (!addAdminEmail.trim()) { setError("이메일을 입력해 주세요."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/internal/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addAdminEmail.trim(), role: addAdminRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      toast.success("관리자 권한을 부여했습니다.");
      setShowAddAdmin(false);
      setAddAdminEmail("");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "오류 발생"); }
    finally { setLoading(false); }
  };

  const handleRevokeAdmin = async (reason: string) => {
    if (!revokeTarget) return;
    const res = await fetch("/internal/admin/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: revokeTarget.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
    toast.success("관리자 권한을 회수했습니다.");
    router.refresh();
  };

  return (
    <>
      {/* Settings Table */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border-default)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">서비스 설정 항목</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">항목</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)]">현재값</th>
              {isSuperAdmin && <th className="px-5 py-3 w-16"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {settings.map((s) => (
              <tr key={s.key} className="hover:bg-[var(--color-surface-muted)]">
                <td className="px-5 py-3">
                  <p className="font-medium text-[var(--color-text-primary)]">{s.label}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{s.description}</p>
                </td>
                <td className="px-5 py-3 text-right font-mono font-medium tabular-nums">{s.value}</td>
                {isSuperAdmin && (
                  <td className="px-5 py-3">
                    <button onClick={() => { setEditTarget({ key: s.key, current: s.value, label: s.label }); setNewValue(s.value); }}
                      className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-surface-muted)] rounded">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Management (SUPER_ADMIN only) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border-default)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">관리자 권한 관리</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowAddAdmin(!showAddAdmin)}>
              <Plus className="h-3.5 w-3.5" />관리자 추가
            </Button>
          </div>

          {showAddAdmin && (
            <div className="px-5 py-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">이메일</label>
                  <input value={addAdminEmail} onChange={(e) => setAddAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full h-8 border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">역할</label>
                  <select value={addAdminRole} onChange={(e) => setAddAdminRole(e.target.value as UserRoleType)}
                    className="h-8 border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]">
                    <option value={UserRoleType.OPERATOR}>OPERATOR</option>
                    <option value={UserRoleType.SUPER_ADMIN}>SUPER_ADMIN</option>
                  </select>
                </div>
                <Button variant="primary" size="sm" onClick={handleAddAdmin} disabled={loading}>부여</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddAdmin(false); setError(""); }}>취소</Button>
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">닉네임/이메일</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">역할</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {adminRoles.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-surface-muted)]">
                  <td className="px-5 py-3">
                    <p className="font-medium">{r.nickname}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{r.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.role === UserRoleType.SUPER_ADMIN ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-700"}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {r.userId !== currentUserId && (
                      <button onClick={() => setRevokeTarget(r)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit setting modal */}
      {editTarget && (
        <ConfirmActionModal
          title={`설정 변경 — ${editTarget.label}`}
          description="설정 변경 내역은 감사 로그에 기록됩니다."
          preview={
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--color-text-secondary)]">현재값</span>
                <span className="font-mono font-medium">{editTarget.current}</span>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">새 값</label>
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} type="number" step="any"
                  className="w-full h-8 border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 text-sm font-mono focus:outline-none focus:border-[var(--color-accent-primary)]" />
              </div>
            </div>
          }
          onClose={() => setEditTarget(null)}
          onConfirm={handleEditSetting}
        />
      )}

      {/* Revoke admin modal */}
      {revokeTarget && (
        <ConfirmActionModal
          title={`관리자 권한 회수 — ${revokeTarget.nickname}`}
          description={`${revokeTarget.nickname}님의 ${revokeTarget.role} 권한을 회수합니다. 이후 관리자 페이지에 접근할 수 없습니다.`}
          confirmLabel="회수 확인"
          confirmVariant="danger"
          onClose={() => setRevokeTarget(null)}
          onConfirm={handleRevokeAdmin}
        />
      )}
    </>
  );
}
