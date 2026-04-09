import React from 'react';

type BadgeVariant = 'accent' | 'neutral' | 'success';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className = '',
  ...props
}) => {
  return <span className={`status-badge status-badge--${variant} ${className}`.trim()} {...props} />;
};
