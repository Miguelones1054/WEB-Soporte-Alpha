'use client';

import { ReactNode } from 'react';
import { RetroIcon } from '../RetroIcon';
import type { RetroIconName } from '../../../assets/icons/win98/registry';

export interface RetroUserDetailFieldProps {
  icon: RetroIconName;
  label: string;
  children: ReactNode;
  valueVariant?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
  valueSize?: 'md' | 'lg';
  onAdd?: () => void;
  onSubtract?: () => void;
  addTitle?: string;
  subtractTitle?: string;
}

export function RetroUserDetailField({
  icon,
  label,
  children,
  valueVariant = 'default',
  valueSize = 'md',
  onAdd,
  onSubtract,
  addTitle = 'Agregar',
  subtractTitle = 'Restar',
}: RetroUserDetailFieldProps) {
  const hasActions = Boolean(onAdd || onSubtract);

  return (
    <div className="retro-user-field">
      <div className="retro-user-field__label">
        <RetroIcon name={icon} size={16} alt="" />
        <span>{label}</span>
      </div>
      <div
        className={`retro-user-field__value-row${hasActions ? ' retro-user-field__value-row--actions' : ''}`}
      >
        <div
          className={`retro-user-field__value retro-user-field__value--${valueVariant} retro-user-field__value--${valueSize}`}
        >
          {children}
        </div>
        {hasActions && (
          <div className="retro-user-field__actions">
            {onSubtract && (
              <button
                type="button"
                className="retro-user-field__action-btn"
                onClick={onSubtract}
                title={subtractTitle}
                aria-label={subtractTitle}
              >
                −
              </button>
            )}
            {onAdd && (
              <button
                type="button"
                className="retro-user-field__action-btn"
                onClick={onAdd}
                title={addTitle}
                aria-label={addTitle}
              >
                +
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
