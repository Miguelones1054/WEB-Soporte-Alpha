// Configuración global de la aplicación
export const API_CONFIG = {
  // URL base del backend - localhost para dev, API para producción
  BASE_URL: process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://apiadm.nequialpha.com',

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
