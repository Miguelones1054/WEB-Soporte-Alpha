'use client';

import { RetroModal } from './RetroModal';

export interface RetroManagerConfirmModalProps {
  open: boolean;
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  zIndex?: number;
  title?: string;
}

export function RetroManagerConfirmModal({
  open,
  type,
  message,
  onClose,
  zIndex = 110,
  title = 'Resultado',
}: RetroManagerConfirmModalProps) {
  return (
    <RetroModal
      open={open}
      title={title}
      onClose={onClose}
      zIndex={zIndex}
      showClose={false}
      role="alertdialog"
      icon={type === 'success' ? 'communication/msg_information' : 'communication/msg_error'}
      bodyClassName="retro-manager-modal__body"
    >
      <div className={`retro-manager-confirm retro-manager-confirm--${type}`}>
        <div className="retro-manager-confirm__icon" aria-hidden="true">
          {type === 'success' ? '✓' : '✕'}
        </div>
        <p className="retro-manager-confirm__message">{message}</p>
        <div className="retro-manager-confirm__actions">
          <button type="button" className="retro-manager-btn retro-manager-btn--primary" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </RetroModal>
  );
}
