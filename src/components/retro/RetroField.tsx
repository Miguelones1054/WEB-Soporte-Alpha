'use client';

import { ReactNode } from 'react';

export interface RetroFieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

export function RetroField({ label, htmlFor, children }: RetroFieldProps) {
  return (
    <div className="retro-field">
      <label className="retro-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
