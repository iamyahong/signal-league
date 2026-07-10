"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).slice(2);
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="flex items-start gap-2.5 cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            aria-invalid={!!error}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] accent-[var(--color-accent-primary)] cursor-pointer",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2",
              error && "border-[var(--color-accent-danger)]",
              className
            )}
            {...props}
          />
          {label && (
            <span className="text-sm text-[var(--color-text-primary)] leading-relaxed">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="text-xs text-[var(--color-accent-danger)] ml-6">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
