import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  muted = false,
  className = '',
  ...props
}) => {
  return <div className={`surface-card ${muted ? 'surface-card--muted' : ''} ${className}`.trim()} {...props} />;
};
