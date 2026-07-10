"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#2d9cdb] text-white border border-[#2589c4] hover:bg-[#2589c4] active:bg-[#1f76aa] disabled:bg-[#a8d5f0] disabled:border-[#a8d5f0] disabled:cursor-not-allowed",
  secondary:
    "bg-white text-[#0e0f11] border border-[#e6e8ea] hover:bg-[#f7f8f9] active:bg-[#eef0f2] disabled:text-[#a4abb5] disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-[#0e0f11] border border-transparent hover:bg-[#f7f8f9] active:bg-[#eef0f2] disabled:text-[#a4abb5] disabled:cursor-not-allowed",
  danger:
    "bg-[#eb5757] text-white border border-[#d44a4a] hover:bg-[#d44a4a] active:bg-[#bc3f3f] disabled:bg-[#f5a5a5] disabled:border-[#f5a5a5] disabled:cursor-not-allowed",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-[var(--radius-md)]",
  md: "h-9 px-4 text-sm rounded-[var(--radius-md)]",
  lg: "h-11 px-6 text-base rounded-[var(--radius-lg)]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-[150ms] focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2",
        variantStyles[variant],
        sizeStyles[size],
        loading && "cursor-wait",
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
