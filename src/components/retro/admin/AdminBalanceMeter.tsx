'use client';

export function formatAdminCop(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function balanceTone(balance: number): 'positive' | 'negative' | 'zero' {
  if (balance < 0) return 'negative';
  if (balance > 0) return 'positive';
  return 'zero';
}

interface AdminBalanceMeterProps {
  balance: number;
  topeDeuda?: number | null;
  compact?: boolean;
  showTope?: boolean;
}

export function AdminBalanceMeter({
  balance,
  topeDeuda = 0,
  compact = false,
}: AdminBalanceMeterProps) {
  const tope = Math.max(0, Number(topeDeuda) || 0);
  const debtUsed = balance < 0 ? Math.abs(balance) : 0;
  const tone = balanceTone(balance);
  const atLimit = tope > 0 && debtUsed >= tope;
  const fillPct = tope > 0 ? Math.min(100, (debtUsed / tope) * 100) : debtUsed > 0 ? 100 : 0;

  const caption =
    tone === 'negative'
      ? atLimit
        ? 'Alcanzaste el tope de deuda. Recarga para volver a operar.'
        : 'Saldo en deuda. Recarga para no llegar al tope.'
      : tone === 'zero'
        ? 'Sin saldo. Recarga para poder operar.'
        : 'Puede operar con normalidad.';

  return (
    <div
      className={`retro-balance-meter retro-balance-meter--${tone} ${compact ? 'retro-balance-meter--compact' : ''}`}
    >
      <p className="retro-balance-meter__label">
        Balance actual:{' '}
        <span className={`retro-balance-meter__value retro-balance-meter__value--${tone}`}>
          {formatAdminCop(balance)}
        </span>
      </p>
      {!compact && (
        <p className={`retro-balance-meter__caption retro-balance-meter__caption--${tone}`}>{caption}</p>
      )}

      <div className="retro-balance-meter__bar-row">
        <span className={`retro-balance-meter__start retro-balance-meter__start--${tone}`} aria-hidden />
        <div
          className="retro-balance-meter__track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={tope || 100}
          aria-valuenow={debtUsed}
        >
          <span
            className={`retro-balance-meter__fill ${
              fillPct > 0 ? 'retro-balance-meter__fill--negative' : 'retro-balance-meter__fill--empty'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className="retro-balance-meter__tope">{tope > 0 ? formatAdminCop(tope) : 'Sin tope'}</span>
      </div>
    </div>
  );
}
