'use client';

import { ButtonHTMLAttributes, useState } from 'react';

export interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  pressed?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | string;
}

export function RetroButton({
  fullWidth = false,
  pressed = false,
  variant,
  className = '',
  children,
  disabled,
  type = 'button',
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  ...props
}: RetroButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const showPressed = pressed || isPressed;

  const classes = [
    'retro-btn',
    variant ? `retro-btn--${variant}` : '',
    fullWidth ? 'retro-btn--full' : '',
    showPressed ? 'retro-btn--pressed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onMouseDown={(e) => {
        if (!disabled) setIsPressed(true);
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setIsPressed(false);
        onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        setIsPressed(false);
        onMouseLeave?.(e);
      }}
      onTouchStart={(e) => {
        if (!disabled) setIsPressed(true);
        onTouchStart?.(e);
      }}
      onTouchEnd={(e) => {
        setIsPressed(false);
        onTouchEnd?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
