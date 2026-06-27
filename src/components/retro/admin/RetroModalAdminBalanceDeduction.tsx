'use client';

import {
  formatAdminBalanceCop,
  type AdminBalanceDeduction,
} from '../../../lib/adminBalanceDeduction';

export function RetroModalAdminBalanceDeduction({
  deduction,
  showHeading = true,
}: {
  deduction?: AdminBalanceDeduction | null;
  showHeading?: boolean;
}) {
  if (!deduction) return null;

  return (
    <div className="retro-manager-modal__admin-balance">
      {showHeading && (
        <p className="retro-manager-modal__admin-balance-title">Tu saldo de administrador</p>
      )}
      <p>
        Descontado: <strong>${formatAdminBalanceCop(deduction.amount_deducted)}</strong>
      </p>
      <p>
        Saldo anterior: <strong>${formatAdminBalanceCop(deduction.previous_balance)}</strong>
      </p>
      <p>
        Saldo actual: <strong>${formatAdminBalanceCop(deduction.new_balance)}</strong>
      </p>
    </div>
  );
}
