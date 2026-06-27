'use client';

import { useScrollLock } from '../../hooks/useScrollLock';

export interface RetroLoadingOverlayProps {
  message?: string;
}

export function RetroLoadingOverlay({ message = 'Cargando...' }: RetroLoadingOverlayProps) {
  useScrollLock(true);

  return (
    <div className="retro-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="retro-loading-box">
        <div className="retro-hourglass" aria-hidden="true">
          <div className="retro-hourglass__frame">
            <span className="retro-hourglass__top-sand" />
            <span className="retro-hourglass__stream" />
            <span className="retro-hourglass__bottom-sand" />
          </div>
        </div>
        <p>{message}</p>
      </div>
    </div>
  );
}
