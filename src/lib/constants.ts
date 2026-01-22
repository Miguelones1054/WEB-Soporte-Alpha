// Configuración global de la aplicación
export const API_CONFIG = {
  // URL base del backend - usar siempre producción
  BASE_URL: 'https://apiadm.nequialpha.com',

  // Endpoints principales
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      ME: '/admin/me',
    },
    ADMIN: {
      USERS: '/admin/users',
      USER: '/admin/user',
      STATS: '/admin/stats',
    },
  },
} as const;

// URL completa del backend
export const API_BASE_URL = API_CONFIG.BASE_URL;
