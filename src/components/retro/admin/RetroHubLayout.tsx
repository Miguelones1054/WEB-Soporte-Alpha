'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAdminSession } from '../../../hooks/useAdminSession';
import { RetroIcon } from '../RetroIcon';
import { RetroLoadingOverlay } from '../RetroLoadingOverlay';
import { HUB_SIDEBAR_NAV } from './adminNav';
import { RetroSidebarNav } from './RetroSidebarNav';

export interface RetroHubLayoutProps {
  documentTitle?: string;
  children: ReactNode | ((ctx: { adminInfo: ReturnType<typeof useAdminSession>['adminInfo'] }) => ReactNode);
}

export function RetroHubLayout({ documentTitle = 'Admin Apps', children }: RetroHubLayoutProps) {
  const session = useAdminSession({ documentTitle, redirectOnFail: true });
  const { adminInfo, user, loading, logout } = session;

  const [showProfile, setShowProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAnimating, setMobileAnimating] = useState(false);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileAnimating(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.retro-hub-profile') && !target.closest('.retro-hub-profile-btn')) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openMobile = () => {
    setMobileOpen(true);
    requestAnimationFrame(() => setTimeout(() => setMobileAnimating(true), 20));
  };

  const closeMobile = () => {
    setMobileAnimating(false);
    setTimeout(() => setMobileOpen(false), 200);
  };

  if (loading) {
    return <RetroLoadingOverlay message="Cargando panel..." />;
  }

  return (
    <div className="retro-hub-layout">
      <header className="retro-hub-header">
        <div className="retro-titlebar retro-hub-header__titlebar">
          <button
            type="button"
            className="retro-icon-btn retro-hub-header__menu-btn"
            onClick={openMobile}
            aria-label="Abrir menú"
          >
            <RetroIcon name="system/start_menu_shortcuts" size={14} alt="Menú" />
          </button>
          <RetroIcon
            name="system/computer"
            size={14}
            className="retro-titlebar__icon-img retro-hub-header__titlebar-icon"
            alt=""
          />
          <span className="retro-titlebar__text">Administración Alpha</span>
          <div className="retro-hub-header__actions">
            <div className="retro-hub-profile">
              <button
                type="button"
                className="retro-hub-profile-btn"
                onClick={() => setShowProfile(!showProfile)}
                aria-expanded={showProfile}
                aria-haspopup="true"
              >
                <span className="retro-hub-profile-btn__icon" aria-hidden="true">
                  <RetroIcon
                    name="users/address_book_user"
                    size={14}
                    className="retro-hub-profile-btn__icon-img"
                    alt=""
                  />
                </span>
                <span className="retro-hub-profile-btn__label">{user?.displayName || 'Admin'}</span>
                <span className="retro-hub-profile-btn__caret" aria-hidden="true">
                  <RetroIcon
                    name="media/netshow_arrow"
                    size={8}
                    className="retro-hub-profile-btn__caret-img"
                    alt=""
                  />
                </span>
              </button>
              {showProfile && adminInfo && (
                <div className="retro-hub-profile-popup">
                  <p className="retro-hub-profile-popup__name">{user?.displayName}</p>
                  <p>{user?.email}</p>
                  <p className="retro-hub-profile-popup__role">{user?.role}</p>
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
          </div>
        </div>
      </header>

      <div className="retro-hub-frame">
        <aside className="retro-hub-sidebar retro-hub-sidebar--desktop" aria-label="Menú lateral">
          <RetroSidebarNav adminInfo={adminInfo} items={HUB_SIDEBAR_NAV} onLogout={logout} />
        </aside>

        <main className="retro-hub-main">
          {typeof children === 'function' ? children({ adminInfo }) : children}
        </main>
      </div>

      {mobileOpen && (
        <div className="retro-hub-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            className={`retro-hub-mobile-backdrop ${mobileAnimating ? 'retro-hub-mobile-backdrop--open' : ''}`}
            onClick={closeMobile}
            aria-label="Cerrar menú"
          />
          <aside
            className={`retro-hub-sidebar retro-hub-sidebar--mobile ${mobileAnimating ? 'retro-hub-sidebar--open' : ''}`}
          >
            <div className="retro-hub-sidebar__mobile-head">
              <span>Menú</span>
              <button
                type="button"
                className="retro-icon-btn"
                onClick={closeMobile}
                aria-label="Cerrar"
              >
                <RetroIcon name="misc/no" size={14} alt="Cerrar" />
              </button>
            </div>
            <RetroSidebarNav
              adminInfo={adminInfo}
              items={HUB_SIDEBAR_NAV}
              onNavigate={closeMobile}
              onLogout={logout}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
