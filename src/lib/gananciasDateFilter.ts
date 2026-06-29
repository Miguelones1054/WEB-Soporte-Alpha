const TZ_COLOMBIA = 'America/Bogota';

export type GananciasTimeRange = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const GANANCIAS_TIME_RANGE_LABELS: Record<GananciasTimeRange, string> = {
  all: 'Todo',
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Últimos 7 días',
  month: 'Este mes',
  custom: 'Rango personalizado',
};

/** Fecha calendario YYYY-MM-DD en hora Colombia. */
export function toColombiaDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function todayColombiaDateKey(): string {
  return toColombiaDateKey(new Date().toISOString());
}

function parseDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** Suma días a una clave YYYY-MM-DD (calendario, sin DST). */
export function shiftDateKey(key: string, days: number): string {
  const { y, m, d } = parseDateKey(key);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function monthStartColombiaDateKey(): string {
  return `${todayColombiaDateKey().slice(0, 7)}-01`;
}

export function formatDateKeyEs(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export function getRangeBounds(
  range: GananciasTimeRange,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  const today = todayColombiaDateKey();

  switch (range) {
    case 'all':
      return null;
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = shiftDateKey(today, -1);
      return { from: y, to: y };
    }
    case 'week':
      return { from: shiftDateKey(today, -6), to: today };
    case 'month':
      return { from: monthStartColombiaDateKey(), to: today };
    case 'custom':
      if (!customFrom || !customTo) return null;
      return {
        from: customFrom <= customTo ? customFrom : customTo,
        to: customTo >= customFrom ? customTo : customFrom,
      };
    default:
      return null;
  }
}

export function isTimestampInRange(
  iso: string,
  range: GananciasTimeRange,
  customFrom: string,
  customTo: string,
): boolean {
  if (range === 'all') return true;

  const bounds = getRangeBounds(range, customFrom, customTo);
  if (!bounds) return range !== 'custom';

  const key = toColombiaDateKey(iso);
  return key >= bounds.from && key <= bounds.to;
}
