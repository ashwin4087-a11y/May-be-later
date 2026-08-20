import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  count?: number;
  countLabel?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  count,
  countLabel = 'items',
  action,
  footer,
}: PageHeaderProps) {
  return (
    <div className="page-header-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="flex flex-col gap-3 min-w-0">
          <h1 className="font-display-lg text-[32px] md:text-[36px] text-primary tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="font-body-md text-on-surface-variant leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
          {count !== undefined && (
            <span className="count-badge">
              {count} {count === 1 ? countLabel.replace(/s$/, '') : countLabel}
            </span>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {footer && <div className="mt-5 pt-5 border-t border-outline-variant/30">{footer}</div>}
    </div>
  );
}
