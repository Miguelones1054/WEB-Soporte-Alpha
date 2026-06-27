'use client';

export type RetroAlertVariant = 'error' | 'success' | 'info';

export interface RetroAlertProps {
  children: React.ReactNode;
  variant?: RetroAlertVariant;
}

export function RetroAlert({ children, variant = 'info' }: RetroAlertProps) {
  return <div className={`retro-alert retro-alert--${variant}`}>{children}</div>;
}
