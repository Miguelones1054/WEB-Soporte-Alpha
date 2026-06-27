import type { Dispatch, SetStateAction } from 'react';

export interface AdminBalanceDeduction {
  amount_deducted: number;
  previous_balance: number;
  new_balance: number;
}

export function extractAdminBalanceDeduction(result: unknown): AdminBalanceDeduction | null {
  if (!result || typeof result !== 'object') return null;

  const payload = result as Record<string, unknown>;
  const raw = payload.admin_balance_deduction;

  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const amount = Number(data.amount_deducted);

  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    amount_deducted: amount,
    previous_balance: Number(data.previous_balance ?? 0),
    new_balance: Number(data.new_balance ?? 0),
  };
}

export function formatAdminBalanceCop(amount: number): string {
  return Number(amount || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function syncAdminInfoBalance<T extends { balance?: number }>(
  setAdminInfo: Dispatch<SetStateAction<T | null>>,
  deduction: AdminBalanceDeduction | null | undefined,
) {
  if (!deduction) return;
  setAdminInfo((prev) => (prev ? { ...prev, balance: deduction.new_balance } : prev));
}

export function applyAdminBalanceDeduction<T extends { balance?: number }>(
  deduction: AdminBalanceDeduction | null | undefined,
  options?: {
    setLocalAdminInfo?: Dispatch<SetStateAction<T | null>>;
    syncGlobalBalance?: (deduction: AdminBalanceDeduction) => void;
  },
) {
  if (!deduction) return;
  if (options?.setLocalAdminInfo) {
    syncAdminInfoBalance(options.setLocalAdminInfo, deduction);
  }
  options?.syncGlobalBalance?.(deduction);
}
