// Generado por scripts/migrate-win98-icons.py — no editar a mano
export const WIN98_ICON_CATEGORIES = [
  'accessibility', 'search', 'help', 'users', 'communication', 'security', 'games', 'network', 'hardware', 'media', 'navigation', 'office', 'files', 'system', 'misc'
] as const;

export type Win98IconCategory = (typeof WIN98_ICON_CATEGORIES)[number];

/** Ruta lógica: categoría/nombre_sin_ext (ej. navigation/homepage) */
export type RetroIconName = `${Win98IconCategory}/${string}`;

const ICON_BASE = '/icons/win98';

export function getRetroIconSrc(name: RetroIconName | string): string {
  return `${ICON_BASE}/${name}.ico`;
}

export function isWin98IconCategory(value: string): value is Win98IconCategory {
  return (WIN98_ICON_CATEGORIES as readonly string[]).includes(value);
}

export const RETRO_ICON_MANIFEST = {
  source: 'windows98-icons/ico',
  total: 626,
  categories: {
  "misc": 150,
  "media": 59,
  "system": 60,
  "accessibility": 14,
  "users": 20,
  "office": 18,
  "hardware": 92,
  "files": 73,
  "network": 45,
  "security": 29,
  "communication": 30,
  "navigation": 9,
  "games": 8,
  "help": 7,
  "search": 12
},
} as const;
