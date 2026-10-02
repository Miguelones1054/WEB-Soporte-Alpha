'use client';

export type RetroAlertVariant = 'error' | 'success' | 'info';

export interface RetroAlertProps {
  children: React.ReactNode;
  variant?: RetroAlertVariant;
  onClose?: () => void;
}

export function RetroAlert({ children, variant = 'info', onClose }: RetroAlertProps) {
  return (
    <div className={`retro-alert retro-alert--${variant} flex items-center justify-between`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer bg-transparent border-0"
          aria-label="Cerrar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
