'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useScrollLock } from '../../../hooks/useScrollLock';
import type { AdminInfo } from '../../../hooks/useAdminSession';
import { RetroButton } from '../RetroButton';
import type { RetroNavItem } from './adminNav';

export interface RetroDrawerProps {
  open: boolean;
  animating: boolean;
  adminInfo: AdminInfo | null;
  loading?: boolean;
  navItems?: RetroNavItem[];
  extraContent?: ReactNode;
  onClose: () => void;
}

export function RetroDrawer({
  open,
  animating,
  adminInfo,
  loading = false,
  navItems = [],
  extraContent,
  onClose,
}: RetroDrawerProps) {
  useScrollLock(open);

  if (!open) return null;

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || adminInfo?.role === 'owner'
  );

  return (
    <div className="retro-drawer-root" role="dialog" aria-modal="true" aria-label="Menú">
      <button
        type="button"
        className={`retro-drawer-backdrop ${animating ? 'retro-drawer-backdrop--open' : ''}`}
        onClick={onClose}
        aria-label="Cerrar menú"
      />
      <aside
        className={`retro-drawer ${animating ? 'retro-drawer--open' : ''}`}
      >
        <div className="retro-titlebar retro-drawer__titlebar">
          <span className="retro-titlebar__icon" aria-hidden />
          <span className="retro-titlebar__text">{adminInfo?.name || 'Administrador'}</span>
          <RetroButton
            type="button"
            className="retro-drawer__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </RetroButton>
        </div>

        <div className="retro-drawer__body">
          <div className="retro-drawer__info retro-drawer__box">
            <p className="retro-drawer__box-title">Administrador</p>
            <p><strong>ID:</strong> {adminInfo?.id ?? 'N/A'}</p>
            <p><strong>Correo:</strong> {adminInfo?.email ?? '—'}</p>
            <p><strong>Rol:</strong> {adminInfo?.role ?? '—'}</p>
            <p>
              <strong>Estado:</strong>{' '}
              <span className={adminInfo?.active ? 'retro-text-ok' : 'retro-text-error'}>
                {adminInfo?.active ? 'Activo' : 'Inactivo'}
              </span>
            </p>
          </div>

          <div className="retro-drawer__balance retro-drawer__box">
            <p className="retro-drawer__box-title">Fondos</p>
            <p className="retro-drawer__balance-value">
              {loading || !adminInfo
                ? '...'
                : `COP $${Number(adminInfo.balance).toLocaleString('es-CO')}`}
            </p>
          </div>

          {extraContent}

          <div className="retro-drawer__nav-box retro-drawer__box">
            <nav className="retro-drawer__nav">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="retro-drawer__link"
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}
