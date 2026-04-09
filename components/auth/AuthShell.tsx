import React, { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  badge?: string;
  asideTitle?: string;
  asideDescription?: string;
  highlights?: string[];
  compact?: boolean;
  maxWidthClassName?: string;
  className?: string;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  onClose,
  children,
  badge = 'MediMate',
  asideTitle,
  asideDescription,
  highlights = [],
  compact = false,
  maxWidthClassName = 'max-w-5xl',
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close auth dialog"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-xl transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative w-full ${maxWidthClassName} overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] transition-all duration-300 ${
          mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
        } ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-teal-50/40" />
        <div className="absolute -top-24 right-0 h-60 w-60 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-slate-100/80 blur-3xl" />

        <div className={`relative grid ${compact || !asideTitle ? 'grid-cols-1' : 'lg:grid-cols-[0.96fr_1.04fr]'}`}>
          {!compact && asideTitle && (
            <aside className="hidden lg:flex min-h-[640px] flex-col justify-between border-r border-slate-200/70 px-8 py-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  {badge}
                </div>

                <div className="max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {asideDescription ?? 'Trusted access'}
                  </p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                    {asideTitle}
                  </h2>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <section className="relative p-5 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                {badge}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-950 hover:shadow-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-8 space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                {subtitle}
              </p>
            </div>

            {children}
          </section>
        </div>
      </div>
    </div>
  );
};
