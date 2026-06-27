'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroInteractiveTable, RetroLoadingOverlay, RetroIcon, type RetroTableColumn } from '../../../components/retro';

interface UserMovement {
  id: string;
  mvalue: string;
  date: string | number | { seconds?: number; _seconds?: number } | null;
  name: string;
  msj: string;
  type: 'INCOMING' | 'OUTGOING';
  amount: string;
  isQrPayment: boolean;
}

type MovementTab = 'normal' | 'deleted';

function getMovementTypeLabel(movement: UserMovement) {
  if (movement.isQrPayment) return 'Pago QR';
  return movement.type === 'INCOMING' ? 'Ingreso' : 'Egreso';
}

function getMovementTypeClass(movement: UserMovement) {
  if (movement.isQrPayment) return 'retro-user-movements__type-badge--qr';
  return movement.type === 'INCOMING'
    ? 'retro-user-movements__type-badge--incoming'
    : 'retro-user-movements__type-badge--outgoing';
}

function getMovementAmountClass(movement: UserMovement) {
  if (movement.isQrPayment) return 'retro-user-movements__amount--qr';
  return movement.type === 'INCOMING'
    ? 'retro-user-movements__amount--incoming'
    : 'retro-user-movements__amount--outgoing';
}

export function UserMovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const userPhone = searchParams.get('phone');

  const [movements, setMovements] = useState<UserMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MovementTab>('normal');

  useEffect(() => {
    document.title = 'Movimientos del usuario';

    if (!userId || !userPhone) {
      router.push('/admin-panel?section=nequi');
      return;
    }

    void fetchUserMovements();
  }, [userId, userPhone, activeTab, router]);

  const fetchUserMovements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const endpoint =
        activeTab === 'deleted'
          ? `${API_BASE_URL}/admin/user/${userPhone}/movements-deleted`
          : `${API_BASE_URL}/admin/user/${userPhone}/movements`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al cargar movimientos');
        setMovements([]);
      }
    } catch (err) {
      console.error('Error fetching user movements:', err);
      setError('Error de conexión');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (raw: UserMovement['date']) => {
    if (raw == null || raw === '') return '—';

    let date: Date | null = null;

    if (typeof raw === 'number') {
      const ms = raw > 1e12 ? raw : raw * 1000;
      date = new Date(ms);
    } else if (typeof raw === 'object') {
      const seconds = raw.seconds ?? raw._seconds;
      if (seconds != null) {
        date = new Date(seconds * 1000);
      }
    } else if (typeof raw === 'string') {
      let cleaned = raw.trim();
      // ISO inválido en JS: offset + Z (ej. 2024-01-15T10:00:00-05:00Z)
      if (/[+-]\d{2}:\d{2}Z$/i.test(cleaned)) {
        cleaned = cleaned.slice(0, -1);
      }
      date = new Date(cleaned);
      if (Number.isNaN(date.getTime())) {
        date = new Date(cleaned.replace(/Z$/i, ''));
      }
    }

    if (!date || Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleTabChange = (tab: MovementTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setLoading(true);
    setError(null);
  };

  const handleGoBack = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      router.push('/admin-panel?section=nequi');
    } else {
      router.push('/');
    }
  };

  const columns = useMemo<RetroTableColumn<UserMovement>[]>(
    () => [
      {
        key: 'tipo',
        header: 'Tipo',
        render: (movement) => (
          <span className={`retro-user-movements__type-badge ${getMovementTypeClass(movement)}`}>
            {getMovementTypeLabel(movement)}
          </span>
        ),
      },
      {
        key: 'fecha',
        header: 'Fecha',
        render: (movement) => formatDate(movement.date),
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        cellClassName: 'retro-tableview-cell--wrap',
        render: (movement) => movement.msj || '—',
      },
      {
        key: 'monto',
        header: 'Monto',
        render: (movement) => (
          <span className={getMovementAmountClass(movement)}>
            {movement.type === 'INCOMING' ? '+' : '−'}${formatCurrency(movement.amount)}
          </span>
        ),
      },
      {
        key: 'procesado',
        header: 'Procesado por',
        render: (movement) => movement.name || '—',
      },
    ],
    [],
  );

  if (loading) {
    return <RetroLoadingOverlay message="Cargando movimientos..." />;
  }

  return (
    <div className="retro-user-movements">
      <div className="retro-user-movements__shell retro-panel">
        <div className="retro-titlebar retro-user-movements__titlebar">
          <button
            type="button"
            className="retro-user-movements__back"
            onClick={handleGoBack}
            aria-label="Volver a Nequi"
            title="Volver"
          >
            ←
          </button>
          <RetroIcon name="files/document" size={14} className="retro-titlebar__icon-img" alt="" />
          <span className="retro-titlebar__text">Movimientos del usuario — {userPhone}</span>
        </div>

        <div className="retro-panel__body retro-user-movements__body">
          <p className="retro-user-movements__intro">
            {activeTab === 'normal'
              ? 'Transacciones y movimientos registrados del usuario.'
              : 'Movimientos eliminados del historial del usuario.'}
          </p>

          <fieldset className="retro-user-movements__tabs">
            <legend>Vista</legend>
            <div className="retro-user-movements__tab-row">
              <button
                type="button"
                className={`retro-user-movements__tab-btn${
                  activeTab === 'normal' ? ' retro-user-movements__tab-btn--active' : ''
                }`}
                onClick={() => handleTabChange('normal')}
              >
                Movimientos ({activeTab === 'normal' ? movements.length : '…'})
              </button>
              <button
                type="button"
                className={`retro-user-movements__tab-btn retro-user-movements__tab-btn--danger${
                  activeTab === 'deleted' ? ' retro-user-movements__tab-btn--active' : ''
                }`}
                onClick={() => handleTabChange('deleted')}
              >
                Eliminados ({activeTab === 'deleted' ? movements.length : '…'})
              </button>
            </div>
          </fieldset>

          {error && <p className="retro-user-movements__error">{error}</p>}

          <RetroInteractiveTable
            columns={columns}
            rows={movements}
            getRowKey={(movement) => movement.id}
            panelClassName="retro-user-movements__table"
            emptyMessage={
              activeTab === 'normal'
                ? 'No hay movimientos registrados para este usuario.'
                : 'No hay movimientos eliminados para este usuario.'
            }
          />
        </div>
      </div>
    </div>
  );
}
