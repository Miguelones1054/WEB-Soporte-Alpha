'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import {
  GANANCIAS_TIME_RANGE_LABELS,
  type GananciasTimeRange,
  formatDateKeyEs,
  getRangeBounds,
  isTimestampInRange,
  todayColombiaDateKey,
} from '../../../lib/gananciasDateFilter';
import { RetroAlert, RetroIcon, RetroLoadingOverlay, RetroWindow } from '../../../components/retro';

interface GananciaOperation {
  id: string;
  admin_email: string;
  admin_name: string;
  operation_type: string;
  target_user: string;
  amount: number;
  reason: string;
  timestamp: string;
  ganancia: number;
  valor_cliente: number;
  costo_admin: number;
  porcentaje: number;
}

const OPERATION_LABELS: Record<string, string> = {
  ADD_BALANCE: 'Recarga Nequi',
  ADD_BALANCE_BANCOLOMBIA: 'Recarga Bancolombia',
  ADD_BALANCE_BANCOLOMBIA_MANUAL: 'Recarga BC manual',
  CREATE_USER: 'Crear usuario Nequi',
  CREATE_USER_BANCOLOMBIA: 'Crear usuario BC',
  UPGRADE_VIP: 'Actualización VIP',
  ADD_SMS: 'Agregar SMS',
  ADD_SMS_BANCOLOMBIA: 'Agregar SMS BC',
};

const TIME_RANGE_OPTIONS: GananciasTimeRange[] = [
  'all',
  'today',
  'yesterday',
  'week',
  'month',
  'custom',
];

export function GananciasSectionContent() {
  const router = useRouter();
  const [operations, setOperations] = useState<GananciaOperation[]>([]);
  const [porcentajeActual, setPorcentajeActual] = useState<number | null>(null);
  const [totalHoy, setTotalHoy] = useState(0);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<GananciasTimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    void fetchGanancias();
  }, []);

  const fetchGanancias = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/ganancias?limit=500`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar ganancias');
      }

      const data = await response.json();
      setOperations(data.operations || []);
      setPorcentajeActual(data.porcentaje_actual ?? null);
      setTotalHoy(data.total_hoy ?? 0);
      setTotalHistorico(data.total_historico ?? 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOperations = useMemo(
    () =>
      operations.filter((op) =>
        isTimestampInRange(op.timestamp, timeRange, customFrom, customTo),
      ),
    [operations, timeRange, customFrom, customTo],
  );

  const totalPeriodo = useMemo(
    () => filteredOperations.reduce((sum, op) => sum + (op.ganancia || 0), 0),
    [filteredOperations],
  );

  const rangeBounds = useMemo(
    () => getRangeBounds(timeRange, customFrom, customTo),
    [timeRange, customFrom, customTo],
  );

  const rangeSummary = useMemo(() => {
    if (!rangeBounds) return null;
    if (rangeBounds.from === rangeBounds.to) {
      return formatDateKeyEs(rangeBounds.from);
    }
    return `${formatDateKeyEs(rangeBounds.from)} — ${formatDateKeyEs(rangeBounds.to)}`;
  }, [rangeBounds]);

  const handleSelectRange = (range: GananciasTimeRange) => {
    setTimeRange(range);
    if (range === 'custom' && !customFrom && !customTo) {
      const today = todayColombiaDateKey();
      setCustomFrom(today);
      setCustomTo(today);
    }
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const getOperationLabel = (type: string) => OPERATION_LABELS[type] || type;

  const periodLabel =
    timeRange === 'all'
      ? 'Ganancia del día'
      : timeRange === 'today'
        ? 'Ganancia de hoy'
        : 'Ganancia del período';

  const periodValue = timeRange === 'all' ? totalHoy : totalPeriodo;

  if (loading) {
    return <RetroLoadingOverlay message="Cargando ganancias..." />;
  }

  return (
    <div className="retro-admin-container space-y-4">
      {error && <RetroAlert variant="error">{error}</RetroAlert>}

      {porcentajeActual != null && (
        <RetroAlert variant="info">
          Tu porcentaje actual es <strong>{porcentajeActual}%</strong>. En la tabla, cada fila
          muestra el porcentaje y la ganancia registrados al momento de la operación.
        </RetroAlert>
      )}

      <RetroWindow title="Filtrar por fecha" fullWidth bodyClassName="p-3">
        <div className="retro-filter-bar">
          {TIME_RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              className={`retro-filter-btn${timeRange === range ? ' retro-filter-btn--active' : ''}`}
              onClick={() => handleSelectRange(range)}
            >
              {GANANCIAS_TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="retro-ganancias-custom-range">
            <label className="retro-ganancias-custom-range__field">
              <span>Desde</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="retro-ganancias-custom-range__input"
              />
            </label>
            <label className="retro-ganancias-custom-range__field">
              <span>Hasta</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="retro-ganancias-custom-range__input"
              />
            </label>
          </div>
        )}

        {timeRange !== 'all' && rangeSummary && (
          <p className="retro-ganancias-filter-summary">
            Mostrando <strong>{filteredOperations.length}</strong> operaciones
            {rangeSummary ? (
              <>
                {' '}
                del período <strong>{rangeSummary}</strong>
              </>
            ) : null}
          </p>
        )}
      </RetroWindow>

      <div className="retro-stat-grid">
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">{periodLabel}</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatCurrency(periodValue)}</span>
              <RetroIcon name="office/calendar" size={16} alt="" />
            </span>
          </p>
        </div>
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Ganancia histórica</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatCurrency(totalHistorico)}</span>
              <RetroIcon name="office/bar_graph" size={16} alt="" />
            </span>
          </p>
        </div>
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Operaciones</p>
          <p className="retro-stat-card__value">
            <span className="retro-stat-card__value-row">
              <span>{filteredOperations.length}</span>
              <RetroIcon name="office/document" size={16} alt="" />
            </span>
          </p>
        </div>
      </div>

      <RetroWindow
        title={`Ventas con ganancia (${filteredOperations.length})`}
        fullWidth
        bodyClassName="p-0"
      >
        <div className="retro-table-wrap">
          <table className="retro-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Valor cliente</th>
                <th>Costo admin</th>
                <th>Ganancia</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="retro-table__empty">
                    {timeRange === 'all'
                      ? 'No hay ventas registradas con ganancia histórica. Las operaciones nuevas guardan el porcentaje y la ganancia al momento de ejecutarse.'
                      : 'No hay operaciones en el rango de fechas seleccionado.'}
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => (
                  <tr key={op.id}>
                    <td>{formatDate(op.timestamp)}</td>
                    <td>{getOperationLabel(op.operation_type)}</td>
                    <td>{op.target_user || '—'}</td>
                    <td>${formatCurrency(op.valor_cliente || 0)}</td>
                    <td>${formatCurrency(op.costo_admin || 0)}</td>
                    <td className="retro-text-ok">${formatCurrency(op.ganancia || 0)}</td>
                    <td>{op.porcentaje}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </RetroWindow>
    </div>
  );
}
