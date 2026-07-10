"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[150ms]",
            "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]",
            "focus:outline-none focus-visible:border-[var(--color-accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]/20",
            error && "border-[var(--color-accent-danger)] focus-visible:border-[var(--color-accent-danger)] focus-visible:ring-[var(--color-accent-danger)]/20",
            "disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--color-accent-danger)]"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--color-text-secondary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
