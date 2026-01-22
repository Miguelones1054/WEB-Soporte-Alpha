'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Hook para manejar el botón back de Android
 * Navega hacia atrás en el historial de Next.js en lugar de cerrar la app
 */
export function useAndroidBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    // Solo ejecutar en navegador (client-side)
    if (typeof window === 'undefined') {
      return;
    }

    // Importar Capacitor dinámicamente para evitar errores de compilación
    const setupCapacitorBackButton = async () => {
      try {
        // Importar módulos con typing flexible para evitar errores de compilación
        const capacitorCore = await import('@capacitor/core');
        const capacitorApp = await import('@capacitor/app');

        const Capacitor = capacitorCore.Capacitor as any;
        const App = capacitorApp.App as any;

        // Solo funciona en plataformas nativas (Android/iOS)
        if (!Capacitor?.isNativePlatform?.()) {
          return;
        }

        // Registrar la ruta actual en el historial
        if (navigationHistoryRef.current.length === 0 ||
            navigationHistoryRef.current[navigationHistoryRef.current.length - 1] !== pathname) {
          navigationHistoryRef.current.push(pathname);
          // Mantener solo las últimas 50 rutas para evitar memoria excesiva
          if (navigationHistoryRef.current.length > 50) {
            navigationHistoryRef.current.shift();
          }
        }

        // Listener para el botón back
        const handler = await App?.addListener?.('backButton', () => {
          // Si estamos en la página principal (login), cerrar la app
          if (pathname === '/' || pathname === '') {
            App?.exitApp?.();
            return;
          }

          // Si hay historial de navegación, navegar hacia atrás
          if (navigationHistoryRef.current.length > 1) {
            // Remover la ruta actual del historial
            navigationHistoryRef.current.pop();
            // Navegar hacia atrás
            router.back();
          } else {
            // Si no hay historial, navegar a la página principal
            router.push('/');
          }
        });

        // Retornar función de limpieza
        return () => {
          handler?.remove?.();
        };
      } catch (error) {
        // Silenciar errores - este hook es opcional para apps móviles
        console.warn('Capacitor back button setup failed (expected in web environment):', error);
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupCapacitorBackButton().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    // Limpiar listener al desmontar o cambiar de ruta
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [router, pathname]);
}

