import React from 'react';
import { LucideIcon } from 'lucide-react';

type PrimaryButtonVariant = 'solid' | 'secondary' | 'ghost';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PrimaryButtonVariant;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  block?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  variant = 'solid',
  icon: LeadingIcon,
  trailingIcon: TrailingIcon,
  block = false,
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'secondary'
      ? 'app-btn--secondary'
      : variant === 'ghost'
      ? 'app-btn--ghost'
      : '';

  return (
    <button
      className={`app-btn ${variantClass} ${block ? 'w-full' : ''} ${className}`.trim()}
      {...props}
    >
      {LeadingIcon ? <LeadingIcon className="h-[18px] w-[18px]" /> : null}
      <span>{children}</span>
      {TrailingIcon ? <TrailingIcon className="h-[18px] w-[18px]" /> : null}
    </button>
  );
};
