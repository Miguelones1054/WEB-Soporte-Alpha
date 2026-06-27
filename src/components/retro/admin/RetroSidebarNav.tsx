'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { AdminInfo } from '../../../hooks/useAdminSession';
import { parseAdminHubSection } from '../../../lib/adminHubSections';
import { RetroIcon } from '../RetroIcon';
import type { RetroNavItem } from './adminNav';

interface RetroSidebarNavProps {
  adminInfo: AdminInfo | null;
  items: RetroNavItem[];
  onNavigate?: () => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

export function RetroSidebarNav(props: RetroSidebarNavProps) {
  return (
    <Suspense fallback={<RetroSidebarNavFallback adminInfo={props.adminInfo} items={props.items} />}>
      <RetroSidebarNavInner {...props} />
    </Suspense>
  );
}

function RetroSidebarNavFallback({
  adminInfo,
  items,
}: Pick<RetroSidebarNavProps, 'adminInfo' | 'items'>) {
  const visibleItems = items.filter(
    (item) => !item.ownerOnly || adminInfo?.role === 'owner'
  );

  return (
    <>
      <div className="retro-hub-sidebar__profile">
        <div className="retro-hub-sidebar__avatar" aria-hidden>
          {(adminInfo?.name || 'A')[0].toUpperCase()}
        </div>
        <div className="retro-hub-sidebar__profile-text">
          <p className="retro-hub-sidebar__name">{adminInfo?.name || 'Administrador'}</p>
          <p className="retro-hub-sidebar__meta">ID {adminInfo?.id ?? '—'}</p>
        </div>
      </div>

      <div className="retro-hub-sidebar__balance">
        <span className="retro-hub-sidebar__balance-label">Fondos</span>
        <span className="retro-hub-sidebar__balance-value">
          {adminInfo?.balance != null
            ? `$${Number(adminInfo.balance).toLocaleString('es-CO')}`
            : '$0'}
        </span>
      </div>

      <div className="retro-hub-sidebar__nav-box">
        <nav className="retro-hub-sidebar__nav" aria-label="Navegación principal">
          {visibleItems.map((item) => (
            <Link key={item.href} href={item.href} className="retro-hub-sidebar__link">
              {item.icon && (
                <RetroIcon name={item.icon} size={16} className="retro-hub-sidebar__link-icon-img" />
              )}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

function RetroSidebarNavInner({
  adminInfo,
  items,
  onNavigate,
  showLogout = true,
  onLogout,
}: RetroSidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = parseAdminHubSection(
    searchParams.get('section'),
    searchParams.get('app'),
  );
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  const visibleItems = items.filter(
    (item) => !item.ownerOnly || adminInfo?.role === 'owner'
  );

  const isActive = (href: string) => {
    if (href.startsWith('/admin-panel?section=') || href.startsWith('/admin-panel?app=')) {
      const url = new URL(href, 'http://local');
      const section = parseAdminHubSection(
        url.searchParams.get('section'),
        url.searchParams.get('app'),
      );
      return normalizedPath === '/admin-panel' && activeSection === section;
    }
    if (href === '/admin-panel') {
      return normalizedPath === '/admin-panel' && activeSection == null;
    }
    const normalizedHref = href.replace(/\/$/, '') || '/';
    return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
  };

  return (
    <>
      <div className="retro-hub-sidebar__profile">
        <div className="retro-hub-sidebar__avatar" aria-hidden>
          {(adminInfo?.name || 'A')[0].toUpperCase()}
        </div>
        <div className="retro-hub-sidebar__profile-text">
          <p className="retro-hub-sidebar__name">{adminInfo?.name || 'Administrador'}</p>
          <p className="retro-hub-sidebar__meta">ID {adminInfo?.id ?? '—'}</p>
        </div>
      </div>

      <div className="retro-hub-sidebar__balance">
        <span className="retro-hub-sidebar__balance-label">Fondos</span>
        <span className="retro-hub-sidebar__balance-value">
          {adminInfo?.balance != null
            ? `$${Number(adminInfo.balance).toLocaleString('es-CO')}`
            : '$0'}
        </span>
      </div>

      <div className="retro-hub-sidebar__nav-box">
        <nav className="retro-hub-sidebar__nav" aria-label="Navegación principal">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`retro-hub-sidebar__link ${
                isActive(item.href) ? 'retro-hub-sidebar__link--active' : ''
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              {item.icon && (
                <RetroIcon name={item.icon} size={16} className="retro-hub-sidebar__link-icon-img" />
              )}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {showLogout && onLogout && (
        <button
          type="button"
          className="retro-hub-sidebar__logout"
          onClick={() => {
            onNavigate?.();
            onLogout();
          }}
        >
          <RetroIcon name="system/shut_down_cool" size={16} className="retro-hub-sidebar__link-icon-img" />
          Cerrar sesión
        </button>
      )}
    </>
  );
}
