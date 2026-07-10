"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, FileQuestion, TrendingUp, Settings, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/me", label: "마이페이지", icon: LayoutDashboard, exact: true },
  { href: "/me/predictions", label: "참여 내역", icon: BarChart2 },
  { href: "/me/questions", label: "내가 만든 문제", icon: FileQuestion },
  { href: "/me/score", label: "점수 내역", icon: TrendingUp },
  { href: "/me/referral", label: "친구 초대", icon: Gift },
  { href: "/settings", label: "설정", icon: Settings },
];

export function MeSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-44 shrink-0 hidden md:block">
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
    </aside>
  );
}
