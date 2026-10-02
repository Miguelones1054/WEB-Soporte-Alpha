'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { RetroIcon } from '../RetroIcon';
import type { RetroIconName } from '../../../assets/icons/win98/registry';

export interface RetroModalProps {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  zIndex?: number;
  showClose?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
  role?: string;
  ariaLabelledBy?: string;
  icon?: RetroIconName;
}

export function RetroModal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth,
  zIndex = 100,
  showClose = true,
  width = 'md',
  bodyClassName,
  closeOnBackdrop = true,
  role = 'dialog',
  ariaLabelledBy,
  icon = 'navigation/program_manager',
}: RetroModalProps) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const bodyClass = bodyClassName
    ? `retro-modal__body ${bodyClassName}`
    : 'retro-modal__body';

  return createPortal(
    <div
      className="retro-modal-root"
      style={{ zIndex }}
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      <button
        type="button"
        className="retro-modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-label="Cerrar"
      />
      <div
        className={`retro-modal retro-modal--${width}`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {(title || showClose) && (
          <div className="retro-titlebar retro-modal__titlebar">
            <RetroIcon name={icon} size={14} className="retro-titlebar__icon-img" alt="" />
            <span className="retro-titlebar__text" id={ariaLabelledBy}>
              {title ?? 'Ventana'}
            </span>
            {showClose && onClose && (
              <button
                type="button"
                className="retro-titlebar__close-btn"
                onClick={onClose}
                aria-label="Cerrar"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className={bodyClass}>{children}</div>
        {footer && <div className="p-2 border-t border-t-[var(--retro-border-light,#dfdfdf)] bg-[var(--retro-bg,#c0c0c0)]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
