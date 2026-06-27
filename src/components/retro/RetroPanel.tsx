'use client';

import { ReactNode } from 'react';

export interface RetroPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function RetroPanel({ title, children, className = '' }: RetroPanelProps) {
  return (
    <div className={`retro-panel w-full max-w-md ${className}`.trim()}>
      <div className="retro-titlebar">
        <span className="retro-titlebar__icon" aria-hidden />
        <span>{title}</span>
      </div>
      <div className="retro-panel__body">{children}</div>
    </div>
  );
}
