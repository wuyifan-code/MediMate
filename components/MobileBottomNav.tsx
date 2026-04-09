import React from 'react';
import { Search, Mail, FileText, Home, Sparkles } from 'lucide-react';
import { PageType } from '../types';

interface MobileBottomNavProps {
  currentPage: PageType;
  onNavigate: (path: string) => void;
  onAIAssistantClick: () => void;
  unreadCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
  onAIAssistantClick,
  unreadCount,
}) => {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 flex justify-between items-end px-6 py-4 lg:hidden z-50"
      style={{
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)'
      }}
    >
      {/* 首页 */}
      <NavButton
        isActive={currentPage === 'home'}
        onClick={() => onNavigate('/')}
        icon={<Home style={{ width: '1.625rem', height: '1.625rem' }} />}
        label="首页"
      />

      {/* 发现 */}
      <NavButton
        isActive={currentPage === 'explore'}
        onClick={() => onNavigate('/explore')}
        icon={<Search style={{ width: '1.625rem', height: '1.625rem' }} />}
        label="发现"
      />

      {/* AI 助手 - 浮动按钮 */}
      <button
        onClick={onAIAssistantClick}
        className="relative"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginTop: '-1.5rem'
        }}
      >
        <div
          className="relative"
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(13, 148, 136, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(13, 148, 136, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
          }}
        >
          <Sparkles style={{ 
            width: '1.5rem', 
            height: '1.5rem', 
            color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
          }} />
        </div>
        
        {/* 浮动效果光环 */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '9999px',
            background: 'radial-gradient(circle, rgba(13, 148, 136, 0.3) 0%, transparent 70%)',
            transform: 'scale(1.5)'
          }}
        />
      </button>

      {/* 通知 */}
      <NavButton
        isActive={currentPage === 'notifications'}
        onClick={() => onNavigate('/notifications')}
        icon={<FileText style={{ width: '1.625rem', height: '1.625rem' }} />}
        label="通知"
      />

      {/* 消息 */}
      <NavButton
        isActive={currentPage === 'messages'}
        onClick={() => onNavigate('/messages')}
        icon={<Mail style={{ width: '1.625rem', height: '1.625rem' }} />}
        label="消息"
        badge={unreadCount}
      />
      
    </nav>
  );
};

interface NavButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const NavButton: React.FC<NavButtonProps> = ({ isActive, onClick, icon, label, badge }) => {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem 0.75rem',
        borderRadius: '1rem',
        transition: 'all 0.2s ease',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          transition: 'all 0.2s ease'
        }}
      >
        {icon}
      </div>
      
      {/* 标签文字 */}
      <span
        style={{
          fontSize: '0.625rem',
          fontWeight: isActive ? '600' : '400',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          transition: 'all 0.2s ease'
        }}
      >
        {label}
      </span>
      
      {/* 活跃指示器 */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            width: '1.5rem',
            height: '3px',
            borderRadius: '9999px',
            background: 'var(--color-primary)'
          }}
        />
      )}
      
      {/* 徽章 */}
      {badge && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '0.25rem',
            right: '0.25rem',
            minWidth: '1rem',
            height: '1rem',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.25rem',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};
