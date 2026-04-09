import React from 'react';
import { Bot } from 'lucide-react';
import { Language, PageType } from '../../types';
import { buildNavigationItems } from './navConfig';

interface MobileBottomDockProps {
  lang: Language;
  currentPage: PageType;
  unreadCount?: number;
  onNavigate: (path: string) => void;
  onOpenAI: () => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  lang,
  currentPage,
  unreadCount = 0,
  onNavigate,
  onOpenAI,
}) => {
  const dockItems = buildNavigationItems(lang).filter((item) =>
    ['home', 'explore', 'messages', 'profile'].includes(item.pageType),
  );

  return (
    <div className="app-dock">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.pageType === currentPage;
        const badgeCount = item.pageType === 'messages' ? unreadCount : 0;

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={`app-dock__item ${isActive ? 'app-dock__item--active' : ''}`}
          >
            <span className="relative inline-flex">
              <Icon className="h-5 w-5" />
              {badgeCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              ) : null}
            </span>
            <span className="truncate text-[11px] font-semibold">{item.label}</span>
          </button>
        );
      })}

      <button type="button" onClick={onOpenAI} className="app-dock__item app-dock__ai">
        <Bot className="h-5 w-5" />
        <span className="text-[11px] font-semibold">AI</span>
      </button>
    </div>
  );
};
