'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  GANANCIAS_TIME_RANGE_LABELS,
  type GananciasTimeRange,
  formatDateKeyEs,
  getRangeBounds,
  isTimestampInRange,
  todayColombiaDateKey,
} from '../../../lib/gananciasDateFilter';
import { RetroAlert, RetroIcon, RetroLoadingOverlay, RetroWindow } from '../../../components/retro';
import {
  type GananciaOperation,
  formatGananciaCurrency,
  formatGananciaDate,
  gananciaOperationKey,
  getOperationLabel,
} from './gananciasShared';

const TIME_RANGE_OPTIONS: GananciasTimeRange[] = [
  'all',
  'today',
  'yesterday',
  'week',
  'month',
  'custom',
];

export interface GananciasDashboardProps {
  operations: GananciaOperation[];
  totalHoy: number;
  totalHistorico: number;
  loading?: boolean;
  error?: string | null;
  infoAlert?: ReactNode;
  toolbar?: ReactNode;
  showAdminColumn?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  deletingOperationId?: string | null;
  onDeleteOperation?: (op: GananciaOperation) => void;
}

export function GananciasDashboard({
  operations,
  totalHoy,
  totalHistorico,
  loading = false,
  error = null,
  infoAlert,
  toolbar,
  showAdminColumn = false,
  emptyMessage,
  canDelete = false,
  deletingOperationId = null,
  onDeleteOperation,
}: GananciasDashboardProps) {
  const [timeRange, setTimeRange] = useState<GananciasTimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

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

  const columnTotals = useMemo(
    () =>
      filteredOperations.reduce(
        (acc, op) => ({
          valorCliente: acc.valorCliente + (op.valor_cliente || 0),
          costoAdmin: acc.costoAdmin + (op.costo_admin || 0),
          ganancia: acc.ganancia + (op.ganancia || 0),
        }),
        { valorCliente: 0, costoAdmin: 0, ganancia: 0 },
      ),
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

  const periodLabel =
    timeRange === 'all'
      ? 'Ganancia del día'
      : timeRange === 'today'
        ? 'Ganancia de hoy'
        : 'Ganancia del período';

  const periodValue = timeRange === 'all' ? totalHoy : totalPeriodo;
  const tableColSpan = (showAdminColumn ? 8 : 7) + (canDelete ? 1 : 0);

  if (loading) {
    return <RetroLoadingOverlay message="Cargando ganancias..." />;
  }

  return (
    <div className="retro-admin-container space-y-4">
      {error && <RetroAlert variant="error">{error}</RetroAlert>}
      {infoAlert}

      {toolbar}

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
            Mostrando <strong>{filteredOperations.length}</strong> operaciones del período{' '}
            <strong>{rangeSummary}</strong>
          </p>
        )}
      </RetroWindow>

      <div className="retro-stat-grid">
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">{periodLabel}</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatGananciaCurrency(periodValue)}</span>
              <RetroIcon name="office/calendar" size={16} alt="" />
            </span>
          </p>
        </div>
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Ganancia histórica</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatGananciaCurrency(totalHistorico)}</span>
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
                {showAdminColumn && <th>Administrador</th>}
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Valor cliente</th>
                <th>Costo admin</th>
                <th>Ganancia</th>
                <th>%</th>
                {canDelete && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="retro-table__empty">
                    {emptyMessage ||
                      (timeRange === 'all'
                        ? 'No hay ventas registradas con ganancia histórica.'
                        : 'No hay operaciones en el rango de fechas seleccionado.')}
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => (
                  <tr key={gananciaOperationKey(op)}>
                    <td>{formatGananciaDate(op.timestamp)}</td>
                    {showAdminColumn && (
                      <td>
                        <div>{op.admin_name || '—'}</div>
                        <div className="retro-ganancias-admin-email">{op.admin_email || '—'}</div>
                      </td>
                    )}
                    <td>{getOperationLabel(op.operation_type)}</td>
                    <td>{op.target_user || '—'}</td>
                    <td>${formatGananciaCurrency(op.valor_cliente || 0)}</td>
                    <td>${formatGananciaCurrency(op.costo_admin || 0)}</td>
                    <td className="retro-text-ok">${formatGananciaCurrency(op.ganancia || 0)}</td>
                    <td>{op.porcentaje}%</td>
                    {canDelete && (
                      <td className="retro-ganancias-delete-cell">
                        <button
                          type="button"
                          className="retro-ganancias-delete-btn"
                          disabled={deletingOperationId === gananciaOperationKey(op)}
                          onClick={() => onDeleteOperation?.(op)}
                        >
                          {deletingOperationId === gananciaOperationKey(op)
                            ? '...'
                            : 'Eliminar'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {filteredOperations.length > 0 && (
              <tfoot>
                <tr className="retro-table__totals-row">
                  <td colSpan={showAdminColumn ? 4 : 3}>
                    <strong>Total</strong>
                    <span className="retro-table__totals-count">
                      ({filteredOperations.length}{' '}
                      {filteredOperations.length === 1 ? 'operación' : 'operaciones'})
                    </span>
                  </td>
                  <td>
                    <strong>${formatGananciaCurrency(columnTotals.valorCliente)}</strong>
                  </td>
                  <td>
                    <strong>${formatGananciaCurrency(columnTotals.costoAdmin)}</strong>
                  </td>
                  <td className="retro-text-ok">
                    <strong>${formatGananciaCurrency(columnTotals.ganancia)}</strong>
                  </td>
                  <td>—</td>
                  {canDelete && <td>—</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </RetroWindow>
    </div>
  );
}
