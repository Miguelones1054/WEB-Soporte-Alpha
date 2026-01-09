// Configuración global de la aplicación
export const API_CONFIG = {
  // URL base del backend
  BASE_URL: 'http://localhost:8000',

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
