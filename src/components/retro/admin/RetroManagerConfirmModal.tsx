'use client';

import { RetroModal } from './RetroModal';

export interface RetroManagerConfirmModalProps {
  open: boolean;
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  onRecharge?: () => void;
  zIndex?: number;
  title?: string;
}

export function RetroManagerConfirmModal({
  open,
  type,
  message,
  onClose,
  onRecharge,
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
        <div className="retro-manager-confirm__actions" style={{ flexDirection: 'column', gap: '8px' }}>
          {type === 'error' && message.toLowerCase().includes('insuficiente') && onRecharge && (
            <button
              type="button"
              className="retro-manager-btn retro-manager-btn--primary"
              style={{ backgroundColor: '#22c55e', color: 'white', borderColor: '#16a34a' }}
              onClick={() => {
                onClose();
                onRecharge();
              }}
            >
              Recargar panel ahora
            </button>
          )}
          <button type="button" className="retro-manager-btn retro-manager-btn--secondary" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </RetroModal>
  );
}
