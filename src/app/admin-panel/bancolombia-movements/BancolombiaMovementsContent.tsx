'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroInteractiveTable, RetroLoadingOverlay, RetroIcon, type RetroTableColumn } from '../../../components/retro';

type FirestoreDate = string | number | { seconds?: number; _seconds?: number } | null;

interface BancolombiaMovement {
  id: string;
  tipoPago?: string;
  estado?: string;
  valor?: number | string;
  numeroReferencia?: string;
  cuentaOrigen?: string;
  numeroNequi?: string;
  name?: string;
  timestamp?: FirestoreDate;
  /** Solo en movimientos eliminados (subcolección movements_deleted). */
  deleted_at?: FirestoreDate;
  deleted_by?: string;
  original_movement_id?: string;
}

type MovementTab = 'normal' | 'deleted';

function isEntrada(movement: BancolombiaMovement) {
  return (movement.tipoPago || '').toUpperCase() === 'ENTRADA';
}

function getMovementTypeLabel(movement: BancolombiaMovement) {
  const tipo = (movement.tipoPago || '').trim();
  if (!tipo) return '—';
  if (tipo.toUpperCase() === 'ENTRADA') return 'Entrada';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
}

function getMovementTypeClass(movement: BancolombiaMovement) {
  return isEntrada(movement)
    ? 'retro-user-movements__type-badge--incoming'
    : 'retro-user-movements__type-badge--outgoing';
}

function getMovementAmountClass(movement: BancolombiaMovement) {
  return isEntrada(movement)
    ? 'retro-user-movements__amount--incoming'
    : 'retro-user-movements__amount--outgoing';
}

export function BancolombiaMovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usuario = searchParams.get('usuario');

  const [movements, setMovements] = useState<BancolombiaMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MovementTab>('normal');

  useEffect(() => {
    document.title = 'Movimientos Bancolombia';

    if (!usuario) {
      router.push('/admin-panel?section=bancolombia');
      return;
    }

    void fetchMovements();
  }, [usuario, activeTab, router]);

  const fetchMovements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const endpoint =
        activeTab === 'deleted'
          ? `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuario!)}/movements-deleted`
          : `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuario!)}/movements`;

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
      console.error('Error fetching bancolombia movements:', err);
      setError('Error de conexión');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount == null || Number.isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (raw: FirestoreDate | undefined) => {
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
      router.push('/admin-panel?section=bancolombia');
    } else {
      router.push('/');
    }
  };

  const columns = useMemo<RetroTableColumn<BancolombiaMovement>[]>(() => {
    const base: RetroTableColumn<BancolombiaMovement>[] = [
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
        render: (movement) => formatDate(movement.timestamp),
      },
      {
        key: 'monto',
        header: 'Monto',
        render: (movement) => (
          <span className={getMovementAmountClass(movement)}>
            {isEntrada(movement) ? '+' : '−'}${formatCurrency(movement.valor)}
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (movement) => movement.estado || '—',
      },
      {
        key: 'referencia',
        header: 'Referencia',
        cellClassName: 'retro-tableview-cell--wrap',
        render: (movement) => movement.numeroReferencia || '—',
      },
      {
        key: 'destino',
        header: 'Destino / Origen',
        cellClassName: 'retro-tableview-cell--wrap',
        render: (movement) => movement.numeroNequi || movement.cuentaOrigen || '—',
      },
    ];

    if (activeTab === 'deleted') {
      base.push({
        key: 'eliminado',
        header: 'Eliminado el',
        render: (movement) => formatDate(movement.deleted_at),
      });
    }

    return base;
  }, [activeTab]);

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
            aria-label="Volver a Bancolombia"
            title="Volver"
          >
            ←
          </button>
          <RetroIcon name="files/document" size={14} className="retro-titlebar__icon-img" alt="" />
          <span className="retro-titlebar__text">Movimientos Bancolombia — {usuario}</span>
        </div>

        <div className="retro-panel__body retro-user-movements__body">
          <p className="retro-user-movements__intro">
            {activeTab === 'normal'
              ? 'Transacciones y movimientos registrados del usuario en Bancolombia.'
              : 'Movimientos eliminados del historial del usuario en Bancolombia.'}
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
