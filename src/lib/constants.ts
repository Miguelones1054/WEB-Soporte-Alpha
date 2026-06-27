// Configuración global de la aplicación
export const API_CONFIG = {
  BASE_URL_DEV: 'http://127.0.0.1:8000',
  BASE_URL_PROD: 'https://apiadm.nequialpha.com',

  // Endpoints principales
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      ME: '/admin/me',
    },
    ADMIN: {
      USERS: '/admin/users',
      USER: '/admin/user',
    },
  },
} as const;

// En desarrollo usa el servidor local, en producción usa el dominio real
export const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? API_CONFIG.BASE_URL_DEV
    : API_CONFIG.BASE_URL_PROD;

/** API Darklivery (Wompi recargas admin panel). Siempre producción salvo override por env. */
export const DARKLIVERY_API_BASE = (
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DARKLIVERY_API_BASE) ||
  'https://api.darklivery.com'
).replace(/\/$/, '');

/** Enlace al grupo de Telegram (Administradores Alpha) para /recargar_panel. */
export const TELEGRAM_RECARGA_PANEL_GROUP_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TELEGRAM_RECARGA_PANEL_GROUP) ||
  'https://t.me/+bUHk5Cz8M285YWQx';

/**
 * Abre el chat del grupo con el texto listo: `/recargar_panel {id}`.
 * Usa el parámetro `text` de t.me.
 */
export function getTelegramRecargarPanelUrl(adminId: number) {
  const u = new URL(TELEGRAM_RECARGA_PANEL_GROUP_BASE);
  u.searchParams.set('text', `/recargar_panel ${adminId}`);
  return u.toString();
}
