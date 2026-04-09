import React from 'react';
import { Bot, Menu, Sparkles } from 'lucide-react';
import { Language, UserInfo, UserRole } from '../../types';
import { RouteMeta } from '../../src/routes/routeMeta';

interface MobileTopBarProps {
  lang: Language;
  meta: RouteMeta;
  role: UserRole;
  user: UserInfo | null;
  onMenuOpen: () => void;
  onOpenAI: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  meta,
  role,
  user,
  onMenuOpen,
  onOpenAI,
}) => {
  const initials = user?.profile?.name?.slice(0, 1) || user?.email?.slice(0, 1) || (role === UserRole.GUEST ? 'G' : 'M');

  return (
    <div className="app-topbar">
      <div className="app-topbar__row">
        <button
          type="button"
          onClick={onMenuOpen}
          className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/85 text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{meta.title}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-700">
              <Sparkles className="h-3 w-3" />
              live
            </span>
          </div>
          {meta.subtitle ? (
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAI}
            className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-teal-100 bg-teal-50 text-teal-700 shadow-sm transition hover:-translate-y-0.5"
          >
            <Bot className="h-5 w-5" />
          </button>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold text-white shadow-lg">
            {initials.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};
