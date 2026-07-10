import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-5 py-4 border-b border-[var(--color-border-default)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-5 py-4 border-t border-[var(--color-border-default)]", className)} {...props}>
      {children}
    </div>
  );
}

export const CardContent = CardBody;
