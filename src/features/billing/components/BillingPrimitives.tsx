import React from 'react';

export function StatusPill({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'primary' | 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const toneClasses =
    tone === 'primary'
      ? 'border-primary/20 bg-primary/10 text-primary'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : tone === 'red'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-slate-200 bg-white/80 text-slate-600';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${toneClasses}`}
    >
      {label}
    </span>
  );
}

export function FieldLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-2 text-sm font-semibold text-slate-700 ${className}`}>
      {children}
    </label>
  );
}
