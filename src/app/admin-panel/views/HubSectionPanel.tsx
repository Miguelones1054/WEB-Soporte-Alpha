'use client';

import { ReactNode } from 'react';
import { RetroIcon } from '../../../components/retro';
import type { RetroIconName } from '../../../assets/icons/win98/registry';

interface HubSectionPanelProps {
  title: string;
  icon: RetroIconName;
  onClose?: () => void;
  bodyClassName?: string;
  children: ReactNode;
}

export function HubSectionPanel({
  title,
  icon,
  onClose,
  bodyClassName = '',
  children,
}: HubSectionPanelProps) {
  return (
    <div className="retro-hub-content retro-app-view">
      <div className="retro-hub-panel retro-panel retro-app-view__panel">
        <div className="retro-titlebar">
          <RetroIcon name={icon} size={14} className="retro-titlebar__icon-img" alt="" />
          <span className="retro-titlebar__text">{title}</span>
          {onClose && (
            <button
              type="button"
              className="retro-titlebar__close-btn"
              onClick={onClose}
              aria-label="Cerrar y volver al panel"
            >
              ×
            </button>
          )}
        </div>
        <div className={`retro-panel__body retro-hub-section-body ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
