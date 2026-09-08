'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSessionContext } from '../../../contexts/AdminSessionContext';
import { adminHubHref } from '../../../lib/adminHubSections';
import { AdminRecargaModal } from '../../../components/retro/admin';
import { RetroIcon } from '../../../components/retro';
import { AdminBalanceMeter } from '../../../components/retro/admin';

interface AppHubHomeProps {
  adminInfo?: ReturnType<typeof useAdminSessionContext>['adminInfo'];
}

export function AppHubHome({ adminInfo: adminInfoProp }: AppHubHomeProps) {
  const router = useRouter();
  const session = useAdminSessionContext();
  const adminInfo = adminInfoProp ?? session.adminInfo;
  const [showRecargaModal, setShowRecargaModal] = useState(false);

  return (
    <div className="retro-hub-content">
      <div className="retro-hub-user-card">
        <div className="retro-hub-user-card__welcome">
          <RetroIcon name="users/address_book_user" size={20} className="retro-hub-user-card__welcome-icon" alt="" />
          <p className="retro-hub-user-card__welcome-text">
            Bienvenido, <strong>{adminInfo?.name || 'Administrador'}</strong>
          </p>
        </div>

        <div className="retro-hub-user-card__funds">
          <span className="retro-hub-user-card__funds-icon" aria-hidden>
            <RetroIcon name="files/briefcase" size={22} alt="" />
          </span>
          <div className="retro-hub-user-card__funds-body">
            <p className="retro-hub-user-card__funds-label">
              {adminInfo && adminInfo.balance < 0
                ? 'Saldo en deuda'
                : adminInfo && adminInfo.balance === 0
                  ? 'Sin saldo disponible'
                  : 'Fondos disponibles'}
            </p>
            {adminInfo ? (
              <AdminBalanceMeter
                balance={adminInfo.balance ?? 0}
                topeDeuda={adminInfo.tope_deuda ?? 0}
              />
            ) : (
              <p className="retro-hub-user-card__funds-value">COP $0</p>
            )}
            <button
              type="button"
              className="retro-btn retro-hub-user-card__btn"
              onClick={() => setShowRecargaModal(true)}
            >
              Recargar
            </button>
          </div>
        </div>
      </div>

      <AdminRecargaModal
        open={showRecargaModal}
        onClose={() => setShowRecargaModal(false)}
        onRecargaExitosa={(newBalance) => {
          if (newBalance != null) session.updateBalance(newBalance);
          void session.refetch();
        }}
      />

      <h2 className="retro-hub-section-title">Selecciona APP</h2>

      <div className="retro-hub-app-grid">
        <button
          type="button"
          className="retro-hub-app-card"
          onClick={() => router.push(adminHubHref('nequi'))}
        >
          <span className="retro-hub-app-card__logo-wrap">
            <img src="/nequi-logo.png" alt="Nequi" className="retro-hub-app-card__logo" />
          </span>
          <span className="retro-hub-app-card__label">Nequi</span>
        </button>
        <button
          type="button"
          className="retro-hub-app-card"
          onClick={() => router.push(adminHubHref('bancolombia'))}
        >
          <span className="retro-hub-app-card__logo-wrap retro-hub-app-card__logo-wrap--bancolombia">
            <img
              src="/bancolombia-logo.png"
              alt="Bancolombia"
              className="retro-hub-app-card__logo retro-hub-app-card__logo--bancolombia"
            />
          </span>
          <span className="retro-hub-app-card__label">Bancolombia</span>
        </button>
        <button
          type="button"
          className="retro-hub-app-card"
          onClick={() => router.push(adminHubHref('daviplata'))}
        >
          <span className="retro-hub-app-card__logo-wrap retro-hub-app-card__logo-wrap--daviplata">
            <img
              src="/davi_logo.webp"
              alt="Daviplata Alpha"
              className="retro-hub-app-card__logo retro-hub-app-card__logo--daviplata"
            />
          </span>
          <span className="retro-hub-app-card__label">Daviplata Alpha</span>
        </button>
      </div>

      <div className="retro-hub-secondary-actions">
        <button
          type="button"
          className="retro-hub-app-card retro-hub-app-card--secondary"
          onClick={() => router.push(adminHubHref('paquetes'))}
        >
          <span className="retro-hub-app-card__logo-wrap retro-hub-app-card__logo-wrap--icon">
            <RetroIcon name="misc/package" size={32} className="retro-hub-app-card__logo" alt="" />
          </span>
          <span className="retro-hub-app-card__label">Paquetes</span>
        </button>
      </div>

      <p className="text-center text-[11px] m-0 mt-2" style={{ color: 'var(--retro-muted)' }}>
        Panel de administración · v0.1
      </p>
    </div>
  );
}
