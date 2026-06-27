'use client';

import type { AdminBalanceDeduction } from '../../../lib/adminBalanceDeduction';
import { RetroModal } from './RetroModal';
import { RetroModalAdminBalanceDeduction } from './RetroModalAdminBalanceDeduction';

export interface RetroAdminBalanceModalProps {
  open: boolean;
  deduction: AdminBalanceDeduction | null;
  onClose: () => void;
  zIndex?: number;
}

export function RetroAdminBalanceModal({
  open,
  deduction,
  onClose,
  zIndex = 100,
}: RetroAdminBalanceModalProps) {
  if (!deduction) return null;

  return (
    <RetroModal
      open={open}
      title="Tu saldo de administrador"
      onClose={onClose}
      zIndex={zIndex}
      width="sm"
      closeOnBackdrop={false}
      icon="office/calculator"
      bodyClassName="retro-manager-modal__body"
    >
      <RetroModalAdminBalanceDeduction deduction={deduction} showHeading={false} />
      <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
        <button
          type="button"
          className="retro-manager-btn retro-manager-btn--primary"
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </RetroModal>
  );
}
