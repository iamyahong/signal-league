"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Bell, ChevronDown, Info, LayoutDashboard, LogOut, TrendingUp, BarChart2, Trophy, Plus, FileQuestion, CheckCheck } from "lucide-react";
import { toast } from "sonner";

interface RecentNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface AppHeaderClientProps {
  nickname: string;
  score: number;
  isAdmin: boolean;
  isBetaActive: boolean;
  notifications: RecentNotif[];
  unreadCount: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function AppHeaderClient({
  nickname,
  score,
  isAdmin,
  isBetaActive,
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
}: AppHeaderClientProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [scoreTooltip, setScoreTooltip] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const initial = nickname.charAt(0).toUpperCase();

  async function markAllRead() {
    const res = await fetch("/internal/notifications/read-all", { method: "POST" });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("모든 알림을 읽음 처리했습니다.");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <Link href="/home" className="flex items-center gap-1 font-extrabold tracking-tight text-base">
              <span className="text-[var(--color-accent-primary)]">Signal</span>
              <span>League</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link href="/home" className="rounded-lg px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />홈
              </Link>
              <Link href="/predictions" className="rounded-lg px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" />예측
              </Link>
              <Link href="/rankings" className="rounded-lg px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />랭킹
              </Link>
            </nav>
          </div>

          {/* Right: create button + score + bell + profile */}
          <div className="flex items-center gap-2">
            {isBetaActive && (
              <Link
                href="/predictions/new"
                className="hidden sm:flex items-center gap-1 rounded-xl border border-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-primary)] hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />문제 만들기
              </Link>
            )}

            {/* Score badge */}
            <div className="relative">
              <Link
                href="/me/score"
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#e8f4fd] px-3 py-1.5 text-sm font-semibold text-[#1a6fa0] hover:bg-[#d0e9f7] transition-colors"
              >
                <span>보유 {score.toLocaleString()}점</span>
                <button
                  onClick={(e) => { e.preventDefault(); setScoreTooltip(!scoreTooltip); }}
                  className="text-[#1a6fa0]/70 hover:text-[#1a6fa0]"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Link>
              {scoreTooltip && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-3 text-xs text-[var(--color-text-secondary)] shadow-lg z-50">
                  점수는 Signal League 안에서 예측 참여, 문제 생성, 랭킹 산정에 사용되는 비금전성 서비스 점수입니다. 현금, 상품권, 가상자산으로 교환할 수 없습니다.
                  <button onClick={() => setScoreTooltip(false)} className="absolute right-2 top-2 text-[var(--color-text-tertiary)]">✕</button>
                </div>
              )}
            </div>

            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
                className="relative p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-[var(--color-border-default)] flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      알림 {unreadCount > 0 && <span className="text-red-500">({unreadCount})</span>}
                    </p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-[var(--color-accent-primary)] hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />모두 읽음
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                      알림이 없습니다.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-[var(--color-border-default)] last:border-0 ${
                            n.isRead ? "" : "bg-blue-50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${n.isRead ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-1 mt-0.5">
                                {n.body}
                              </p>
                            </div>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-2.5 border-t border-[var(--color-border-default)]">
                    <Link
                      href="/notifications"
                      onClick={() => setBellOpen(false)}
                      className="text-xs text-[var(--color-accent-primary)] hover:underline"
                    >
                      전체 알림 보기 →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--color-accent-primary)] flex items-center justify-center text-white text-xs font-bold">
                  {initial}
                </div>
                <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)] max-w-[80px] truncate">{nickname}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white shadow-lg z-50 py-1">
                  <div className="px-3 py-2 border-b border-[var(--color-border-default)]">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{nickname}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/me" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                      <LayoutDashboard className="h-4 w-4" />마이페이지
                    </Link>
                    <Link href="/predictions" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                      <BarChart2 className="h-4 w-4" />예측 문제
                    </Link>
                    {isBetaActive && (
                      <Link href="/me/questions" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                        <FileQuestion className="h-4 w-4" />내가 만든 문제
                      </Link>
                    )}
                    <Link href="/me/score" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                      <TrendingUp className="h-4 w-4" />점수 내역
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-accent-primary)] hover:bg-[var(--color-surface-muted)]">
                        <LayoutDashboard className="h-4 w-4" />관리자 페이지
                      </Link>
                    )}
                    <div className="border-t border-[var(--color-border-default)] mt-1 pt-1">
                      <button onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" />로그아웃
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {(profileOpen || bellOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setProfileOpen(false); setBellOpen(false); }} />
      )}
    </header>
  );
}
