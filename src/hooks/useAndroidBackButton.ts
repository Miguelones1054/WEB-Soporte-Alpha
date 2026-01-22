'use client';

import { useEffect } from 'react';

/**
 * Hook para manejar el botón back de Android
 * Este hook está deshabilitado en entornos web para evitar errores de compilación
 * Solo funciona en aplicaciones móviles nativas con Capacitor
 */
export function useAndroidBackButton() {
  // En entorno web, este hook no hace nada
  // Solo funciona en aplicaciones móviles nativas
  useEffect(() => {
    // Hook vacío para compatibilidad
    // La funcionalidad real solo existe en apps móviles con Capacitor
  }, []);
}

