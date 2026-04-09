import React from 'react';

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  kicker,
  title,
  description,
  aside,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`.trim()}>
      <div className="space-y-2">
        {kicker ? <div className="section-kicker">{kicker}</div> : null}
        <div className="page-title">{title}</div>
        {description ? <p className="page-caption max-w-2xl">{description}</p> : null}
      </div>
      {aside}
    </div>
  );
};
