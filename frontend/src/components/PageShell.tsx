import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <main className={`page-shell ${className}`.trim()}>
      {children}
    </main>
  );
}
