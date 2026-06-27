'use client';

import { createPortal } from 'react-dom';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { RetroIcon } from '../RetroIcon';

export interface RetroManagerProgressModalProps {
  open: boolean;
  message?: string;
  zIndex?: number;
}

export function RetroManagerProgressModal({
  open,
  message = 'Procesando operación...',
  zIndex = 120,
}: RetroManagerProgressModalProps) {
  useScrollLock(open);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="retro-modal-root"
      style={{ zIndex }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="retro-modal-backdrop" aria-hidden="true" />
      <div className="retro-modal retro-modal--sm">
        <div className="retro-titlebar retro-modal__titlebar">
          <RetroIcon name="misc/clock" size={14} className="retro-titlebar__icon-img" alt="" />
          <span className="retro-titlebar__text">Procesando</span>
        </div>
        <div className="retro-modal__body retro-manager-modal__body retro-manager-progress">
          <div className="retro-hourglass" aria-hidden="true">
            <div className="retro-hourglass__frame">
              <span className="retro-hourglass__top-sand" />
              <span className="retro-hourglass__stream" />
              <span className="retro-hourglass__bottom-sand" />
            </div>
          </div>
          <p className="retro-manager-progress__message">{message}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
