import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: LucideIcon;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = 'text',
  autoComplete,
  error,
  hint,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">{label}</label>
      <div
        className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all duration-200 ${
          error
            ? 'border-rose-200 ring-4 ring-rose-500/10'
            : 'border-slate-200 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>
      {error ? (
        <p className="text-xs leading-5 text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
};
