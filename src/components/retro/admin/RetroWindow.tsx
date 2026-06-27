'use client';

import { ReactNode } from 'react';

export interface RetroWindowProps {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  fullWidth?: boolean;
}

export function RetroWindow({
  title,
  children,
  className = '',
  bodyClassName = '',
  fullWidth = false,
}: RetroWindowProps) {
  return (
    <div
      className={`retro-panel retro-window ${fullWidth ? 'retro-window--full' : ''} ${className}`.trim()}
    >
      <div className="retro-titlebar">
        <span className="retro-titlebar__icon" aria-hidden />
        <span className="retro-titlebar__text">{title}</span>
      </div>
      <div className={`retro-panel__body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}
