import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  onChange?: (value: string) => void;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  hint,
  icon: Icon,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span> : null}
      <div className={`field-shell ${error ? 'border-rose-200 ring-4 ring-rose-500/10' : ''}`}>
        {Icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        ) : null}
        <input
          className={`field-input ${className}`.trim()}
          onChange={(event) => onChange?.(event.target.value)}
          {...props}
        />
      </div>
      {error ? <span className="text-xs leading-5 text-rose-500">{error}</span> : null}
      {!error && hint ? <span className="text-xs leading-5 text-slate-400">{hint}</span> : null}
    </label>
  );
};
