/** Formatea fecha ISO/Firestore para mostrar vigencia VIP en managers. */
export function formatVipVigenciaDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const date = parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const time = parsed.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} a las ${time}`;
}

/** Suma 1 mes calendario (misma regla que BC/DV backend). */
function addOneCalendarMonth(date: Date): Date {
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  let targetYear = year;
  if (month > 11) {
    month = 0;
    targetYear = year + 1;
  }
  const day = date.getDate();
  const lastDay = new Date(targetYear, month + 1, 0).getDate();
  const result = new Date(date.getTime());
  result.setFullYear(targetYear, month, Math.min(day, lastDay));
  return result;
}

/**
 * Fecha fin efectiva: usa vip_expires_at si existe;
 * si no, deriva vip_sub_active + 1 mes (como en apps BC/DV).
 */
export function resolveVipExpiresAt(
  vipExpiresAt: string | null | undefined,
  vipSubActive?: string | null | undefined,
): string | null {
  if (vipExpiresAt && String(vipExpiresAt).trim()) {
    return String(vipExpiresAt).trim();
  }
  if (!vipSubActive || !String(vipSubActive).trim()) return null;
  const start = new Date(String(vipSubActive).trim());
  if (Number.isNaN(start.getTime())) return null;
  return addOneCalendarMonth(start).toISOString();
}

export function vipInicioLabel(
  isVip: boolean,
  vipSubActive: string | null | undefined,
): string {
  if (!isVip) return '—';
  return formatVipVigenciaDate(vipSubActive) || 'No registrada';
}

export function vipFinLabel(
  isVip: boolean,
  vipExpiresAt: string | null | undefined,
  vipSubActive?: string | null | undefined,
): string {
  if (!isVip) return '—';
  return formatVipVigenciaDate(resolveVipExpiresAt(vipExpiresAt, vipSubActive)) || 'Indefinida';
}
