'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { adminHubHref } from '../../../lib/adminHubSections';
import { RetroLoadingOverlay, RetroIcon } from '../../../components/retro';
import {
  RetroModal,
  RetroModalBanner,
  RetroModalActions,
  RetroModalBtn,
  RetroUserDetailField,
  RetroManagerConfirmModal,
} from '../../../components/retro/admin';

const Z_DETAIL = 120;

interface ScrapingAlert {
  uid: string;
  numeroCel?: string | null;
  username?: string | null;
  consultas?: number | null;
  scraping_consultas?: number | null;
  scraping_alerta: string;
  last_login?: string | null;
  ultima_consulta?: string | null;
  ultimo_endpoint?: string | null;
  alerta_at?: string | null;
}

interface UserData {
  numeroCel: string;
  username: string;
  baneado: boolean;
  banned_reason?: string | null;
  saldo: string;
  sms: number;
  pin: string;
  device_status: string;
  device_linked: boolean;
  ok: string;
  role: string;
  type: string;
  vip_status: string;
}

function formatTs(raw?: string | null): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return raw;
  }
}

function formatMoney(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (Number.isNaN(n)) return '$0';
  return `$${n.toLocaleString('es-CO')}`;
}

export function AlertasSectionContent() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<ScrapingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ScrapingAlert | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'success' | 'error'>('success');

  const getToken = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
      return null;
    }
    return token;
  };

  const showResult = (message: string, type: 'success' | 'error') => {
    setConfirmMessage(message);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const fetchAlerts = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/scraping-alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al cargar alertas');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const openAlert = async (alert: ScrapingAlert) => {
    setSelected(alert);
    setUserData(null);
    setUserError(null);

    const phone = (alert.numeroCel || '').trim();
    if (!phone) {
      setUserError('Este usuario no tiene número de celular registrado');
      return;
    }

    const token = getToken();
    if (!token) return;

    setUserLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/user/${phone}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'No se pudo cargar la ficha del usuario');
      }

      const data: UserData = await response.json();
      setUserData(data);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Error al cargar usuario');
    } finally {
      setUserLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setUserData(null);
    setUserError(null);
  };

  const dismissAlert = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;

    setDismissing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/scraping-alerts/${selected.uid}/dismiss`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'No se pudo descartar la alerta');
      }

      setAlerts((prev) => prev.filter((a) => a.uid !== selected.uid));
      closeDetail();
      showResult('Alerta descartada', 'success');
    } catch (err) {
      showResult(err instanceof Error ? err.message : 'Error al descartar', 'error');
    } finally {
      setDismissing(false);
    }
  };

  const openInNequi = () => {
    const phone = (selected?.numeroCel || userData?.numeroCel || '').trim();
    if (!phone) return;
    router.push(`${adminHubHref('nequi')}&user=${encodeURIComponent(phone)}&keepQuery=true`);
  };

  if (loading) {
    return <RetroLoadingOverlay message="Cargando alertas..." />;
  }

  return (
    <div className="retro-plantillas">
      <div className="retro-plantillas__toolbar">
        <p className="retro-plantillas__hint">
          Usuarios con consultas a llaves/Bancolombia/QR y last_login mayor a 6 horas.
        </p>
        <button type="button" className="btn" onClick={() => void fetchAlerts()}>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="retro-plantillas__error" role="alert">
          {error}
        </div>
      )}

      {!error && alerts.length === 0 && (
        <div className="retro-table__empty">No hay alertas de scraping activas.</div>
      )}

      {alerts.length > 0 && (
        <div className="retro-table-wrap">
          <table className="retro-table">
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Usuario</th>
                <th>Consultas</th>
                <th>Alerta</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.uid}
                  style={{ cursor: 'pointer' }}
                  onClick={() => void openAlert(alert)}
                >
                  <td>{alert.numeroCel || '—'}</td>
                  <td>{alert.username || '—'}</td>
                  <td>{alert.consultas ?? alert.scraping_consultas ?? 0}</td>
                  <td>{alert.scraping_alerta}</td>
                  <td>{formatTs(alert.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RetroModal
          open
          title={selected.username || selected.numeroCel || 'Alerta scraping'}
          onClose={closeDetail}
          zIndex={Z_DETAIL}
          width="lg"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_warning"
        >
          <RetroModalBanner variant="warning">{selected.scraping_alerta}</RetroModalBanner>

          <div className="retro-user-panel__grid" style={{ marginTop: 12 }}>
            <RetroUserDetailField icon="office/appwizard_list" label="Consultas">
              {selected.consultas ?? selected.scraping_consultas ?? 0}
            </RetroUserDetailField>
            <RetroUserDetailField icon="network/network" label="Último endpoint">
              {selected.ultimo_endpoint || '—'}
            </RetroUserDetailField>
            <RetroUserDetailField icon="office/calendar" label="Última consulta">
              {formatTs(selected.ultima_consulta)}
            </RetroUserDetailField>
            <RetroUserDetailField icon="system/clock" label="Last login">
              {formatTs(selected.last_login)}
            </RetroUserDetailField>
          </div>

          {userLoading && (
            <p style={{ marginTop: 16 }}>Cargando ficha del usuario…</p>
          )}
          {userError && (
            <p className="retro-plantillas__error" style={{ marginTop: 16 }}>
              {userError}
            </p>
          )}

          {userData && (
            <div className="retro-user-panel" style={{ marginTop: 16 }}>
              <div className="retro-user-panel__header">
                <strong>{userData.username}</strong>
                <span>{userData.numeroCel}</span>
                <div
                  className={`retro-user-panel__status ${
                    userData.baneado ? 'retro-user-panel__status--danger' : ''
                  }`}
                >
                  <RetroIcon
                    name={
                      userData.baneado
                        ? 'communication/msg_error'
                        : 'communication/msg_information'
                    }
                    size={14}
                    alt=""
                  />
                  {userData.baneado ? 'Baneado' : 'Activo'}
                </div>
              </div>

              {userData.baneado && userData.banned_reason && (
                <div className="retro-user-panel__alert">
                  <div className="retro-user-panel__alert-title">Razón del ban</div>
                  <div className="retro-user-panel__alert-body">{userData.banned_reason}</div>
                </div>
              )}

              <div className="retro-user-panel__grid">
                <RetroUserDetailField icon="office/calculator" label="Saldo" valueSize="lg">
                  {formatMoney(
                    parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'),
                  )}
                </RetroUserDetailField>
                <RetroUserDetailField
                  icon="communication/message_file"
                  label="SMS"
                  valueVariant="success"
                >
                  {userData.sms}
                </RetroUserDetailField>
                <RetroUserDetailField
                  icon="security/key_win"
                  label="Clave"
                  valueVariant="warning"
                >
                  {userData.pin || 'No disponible'}
                </RetroUserDetailField>
                <RetroUserDetailField
                  icon="system/palm_computer"
                  label="Dispositivo"
                  valueVariant={userData.device_linked ? 'success' : 'danger'}
                >
                  {userData.device_status}
                </RetroUserDetailField>
                <RetroUserDetailField
                  icon="navigation/world_star"
                  label="VIP"
                  valueVariant={userData.vip_status === 'VIP' ? 'warning' : 'muted'}
                >
                  {userData.vip_status}
                </RetroUserDetailField>
                <RetroUserDetailField icon="users/address_book_users" label="Rol / tipo">
                  {userData.role} / {userData.type}
                </RetroUserDetailField>
              </div>
            </div>
          )}

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={closeDetail} disabled={dismissing}>
              Cerrar
            </RetroModalBtn>
            {selected.numeroCel && (
              <RetroModalBtn variant="secondary" onClick={openInNequi} disabled={dismissing}>
                Abrir en Nequi
              </RetroModalBtn>
            )}
            <RetroModalBtn onClick={() => void dismissAlert()} disabled={dismissing}>
              {dismissing ? 'Descartando…' : 'Descartar alerta'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerConfirmModal
        open={confirmOpen}
        message={confirmMessage}
        type={confirmType}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
