'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';

/**
 * Componente simple para animaciones de slide entre páginas
 * Funciona en Android/iOS y web con transiciones suaves
 * Evita el flash blanco durante la navegación
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  // Manejar botón back de Android
  useAndroidBackButton();
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // Solo animar si realmente cambió la ruta
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      
      // Iniciar transición
      setIsTransitioning(true);
      
      // Usar requestAnimationFrame para sincronizar con el render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayChildren(children);
          // Completar la animación después de que termine
          setTimeout(() => {
            setIsTransitioning(false);
          }, 300);
        });
      });
    } else {
      // Si no cambió la ruta, actualizar children sin animación
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div className="page-transition-wrapper">
      <div
        className={`page-transition ${isTransitioning ? 'slide-in' : ''}`}
      >
        {displayChildren}
      </div>
    </div>
  );
}

