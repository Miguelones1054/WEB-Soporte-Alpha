'use client';

import { InputHTMLAttributes } from 'react';

export interface RetroCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function RetroCheckbox({
  label,
  className = '',
  id,
  disabled,
  ...props
}: RetroCheckboxProps) {
  const inputId = id ?? `retro-checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <label
      htmlFor={inputId}
      className={`retro-checkbox ${disabled ? 'retro-checkbox--disabled' : ''} ${className}`.trim()}
    >
      <span className="retro-checkbox__control">
        <input
          type="checkbox"
          id={inputId}
          className="retro-checkbox__input"
          disabled={disabled}
          {...props}
        />
        <span className="retro-checkbox__box" aria-hidden="true" />
      </span>
      <span className="retro-checkbox__label">{label}</span>
    </label>
  );
}
