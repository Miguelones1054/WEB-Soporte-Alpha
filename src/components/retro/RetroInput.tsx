'use client';

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface RetroInputProps extends InputHTMLAttributes<HTMLInputElement> {
  suffix?: ReactNode;
}

export const RetroInput = forwardRef<HTMLInputElement, RetroInputProps>(
  function RetroInput({ suffix, className = '', disabled, ...props }, ref) {
    const inputClasses = [
      'retro-input',
      suffix ? 'retro-input--with-suffix' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (!suffix) {
      return <input ref={ref} className={inputClasses} disabled={disabled} {...props} />;
    }

    return (
      <div className="retro-input-wrap">
        <input ref={ref} className={inputClasses} disabled={disabled} {...props} />
        <div className="retro-input-suffix">{suffix}</div>
      </div>
    );
  }
);
