"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Clock, Settings, Users, CheckCircle, TrendingUp, FileText, Tag, MessageSquare, Flag, ClipboardCheck, Scale, Trophy, GitFork, ScrollText, Mail, PieChart, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "대시보드", icon: BarChart2, exact: true },
  { href: "/admin/users", label: "회원 관리", icon: Users },
  { href: "/admin/beta/pending", label: "베타 승인 대기", icon: Clock },
  { href: "/admin/predictions", label: "예측 문제", icon: FileText },
  { href: "/admin/results", label: "결과 확정 큐", icon: ClipboardCheck },
  { href: "/admin/categories", label: "카테고리", icon: Tag },
  { href: "/admin/comments", label: "댓글 관리", icon: MessageSquare },
  { href: "/admin/reports", label: "신고 처리", icon: Flag },
  { href: "/admin/disputes", label: "이의제기", icon: Scale },
  { href: "/admin/rankings", label: "랭킹 관리", icon: Trophy },
  { href: "/admin/referrals", label: "추천 관리", icon: GitFork },
  { href: "/admin/scores", label: "점수 관리", icon: TrendingUp },
  { href: "/admin/scores/ledger", label: "점수 원장", icon: CheckCircle },
  { href: "/admin/logs", label: "감사 로그", icon: ScrollText },
  { href: "/admin/email-logs", label: "이메일 발송 로그", icon: Mail },
  { href: "/admin/email-stats", label: "이메일 통계", icon: PieChart },
  { href: "/admin/notifications/broadcast", label: "공지 발송", icon: Megaphone },
  { href: "/admin/settings", label: "서비스 설정", icon: Settings },
];

export function AdminSidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-48 shrink-0 hidden md:block">
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-lg)] text-sm transition-colors",
                active
                  ? "bg-[var(--color-accent-primary)] text-white font-medium"
                  : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {!isSuperAdmin && (
        <p className="mt-4 px-3 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
          서비스 설정 변경은 SUPER_ADMIN 권한이 필요합니다.
        </p>
      )}
    </aside>
  );
}
