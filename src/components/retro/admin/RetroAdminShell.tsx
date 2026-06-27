'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '../../../hooks/useAdminSession';
import type { AdminInfo, AdminUser } from '../../../hooks/useAdminSession';
import { RetroButton } from '../RetroButton';
import { RetroLoadingOverlay } from '../RetroLoadingOverlay';
import { RetroDrawer } from './RetroDrawer';
import type { RetroNavItem } from './adminNav';

export type RetroAdminShellVariant = 'hub' | 'manager' | 'subpage';

export interface RetroAdminShellProps {
  title: string;
  documentTitle?: string;
  variant?: RetroAdminShellVariant;
  backHref?: string;
  loading?: boolean;
  loadingMessage?: string;
  drawerNavItems?: RetroNavItem[];
  drawerExtra?: ReactNode;
  children: ReactNode | ((ctx: { adminInfo: AdminInfo | null; user: AdminUser | null }) => ReactNode);
  skipSession?: boolean;
}

export function RetroAdminShell({
  title,
  documentTitle,
  variant = 'subpage',
  backHref = '/admin-panel',
  loading: externalLoading,
  loadingMessage = 'Cargando...',
  drawerNavItems = [],
  drawerExtra,
  children,
  skipSession = false,
}: RetroAdminShellProps) {
  const router = useRouter();
  const session = useAdminSession({
    documentTitle: skipSession ? undefined : documentTitle ?? title,
    redirectOnFail: !skipSession,
  });

  const [showProfile, setShowProfile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const loading = skipSession ? (externalLoading ?? false) : session.loading || (externalLoading ?? false);
  const adminInfo = skipSession ? null : session.adminInfo;
  const user = skipSession ? null : session.user;

  useEffect(() => {
    if (documentTitle) document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.retro-profile-popup') && !target.closest('.retro-profile-btn')) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      setIsAnimating(false);
      setTimeout(() => setIsDrawerOpen(false), 200);
    } else {
      setIsDrawerOpen(true);
      requestAnimationFrame(() => setTimeout(() => setIsAnimating(true), 30));
    }
  };

  const displayTitle =
    variant === 'hub' && user?.displayName ? `Hola, ${user.displayName}` : title;

  if (loading) {
    return <RetroLoadingOverlay message={loadingMessage} />;
  }

  return (
    <div className="retro-admin-shell min-h-screen flex flex-col">
      <header className="retro-admin-header">
        <div className="retro-admin-header__left">
          {variant === 'subpage' && (
            <RetroButton
              type="button"
              className="retro-admin-header__btn"
              onClick={() => router.push(backHref)}
              title="Volver"
            >
              ←
            </RetroButton>
          )}
          {variant === 'manager' && (
            <>
              <RetroButton
                type="button"
                className="retro-admin-header__btn"
                onClick={() => router.push('/admin-panel')}
                title="Inicio"
              >
                ⌂
              </RetroButton>
              <RetroButton
                type="button"
                className="retro-admin-header__btn"
                onClick={toggleDrawer}
                title="Menú"
              >
                ≡
              </RetroButton>
            </>
          )}
          {variant === 'hub' && (
            <RetroButton
              type="button"
              className="retro-admin-header__btn"
              onClick={toggleDrawer}
              title="Menú"
            >
              ≡
            </RetroButton>
          )}
          <h1 className="retro-admin-header__title">{displayTitle}</h1>
        </div>

        {variant !== 'subpage' && !skipSession && (
          <div className="retro-admin-header__right">
            <div className="relative">
              <RetroButton
                type="button"
                className="retro-profile-btn retro-admin-header__btn"
                onClick={() => setShowProfile(!showProfile)}
                title="Perfil"
              >
                👤
              </RetroButton>
              {showProfile && adminInfo && (
                <div className="retro-profile-popup">
                  <p className="retro-profile-popup__name">{user?.displayName}</p>
                  <p>{user?.email}</p>
                  <p className="retro-profile-popup__role">{user?.role}</p>
                  <hr className="retro-hr" />
                  <p>ID: {adminInfo.id}</p>
                  <p>
                    Estado:{' '}
                    <span className={adminInfo.active ? 'retro-text-ok' : 'retro-text-error'}>
                      {adminInfo.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <RetroButton
              type="button"
              className="retro-admin-header__btn"
              onClick={session.logout}
              title="Cerrar sesión"
            >
              ⎋
            </RetroButton>
          </div>
        )}
      </header>

      <main className="retro-admin-main flex-1">
        {typeof children === 'function' ? children({ adminInfo, user }) : children}
      </main>

      {!skipSession && (
        <RetroDrawer
          open={isDrawerOpen}
          animating={isAnimating}
          adminInfo={adminInfo}
          loading={session.loading}
          navItems={drawerNavItems}
          extraContent={drawerExtra}
          onClose={toggleDrawer}
        />
      )}
    </div>
  );
}

/** Enlace de app estilo retro para el hub */
export function RetroAppLink({
  href,
  logoSrc,
  logoAlt,
  label,
  variant,
}: {
  href: string;
  logoSrc: string;
  logoAlt: string;
  label: string;
  variant: 'nq' | 'bc';
}) {
  return (
    <Link
      href={href}
      className={`retro-app-link retro-app-link--${variant}`}
    >
      <span className="retro-app-link__logo-wrap">
        <img src={logoSrc} alt={logoAlt} className="retro-app-link__logo" />
      </span>
      <span className="retro-app-link__label">{label}</span>
    </Link>
  );
}
