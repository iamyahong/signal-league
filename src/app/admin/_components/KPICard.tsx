interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function KPICard({ label, value, sub, accent }: KPICardProps) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-primary)]"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{sub}</p>}
    </div>
  );
}
