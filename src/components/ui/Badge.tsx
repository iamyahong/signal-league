import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "info" | "success" | "danger" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]",
  info: "bg-[#e8f4fd] text-[#1a6fa0] border border-[#b8dcf5]",
  success: "bg-[#e8f8ee] text-[#1a7a42] border border-[#b3e6c8]",
  danger: "bg-[#fdf0f0] text-[#c0392b] border border-[#f5b7b7]",
  warning: "bg-[#fef7ee] text-[#9a6600] border border-[#f5d5a0]",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
