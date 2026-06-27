'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
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

export function GananciasSectionContent() {
  const router = useRouter();
  const [operations, setOperations] = useState<GananciaOperation[]>([]);
  const [porcentajeActual, setPorcentajeActual] = useState<number | null>(null);
  const [totalHoy, setTotalHoy] = useState(0);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const getOperationLabel = (type: string) => OPERATION_LABELS[type] || type;

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

      <div className="retro-stat-grid">
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Ganancia del día</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatCurrency(totalHoy)}</span>
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
              <span>{operations.length}</span>
              <RetroIcon name="office/document" size={16} alt="" />
            </span>
          </p>
        </div>
      </div>

      <RetroWindow title={`Ventas con ganancia (${operations.length})`} fullWidth bodyClassName="p-0">
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
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="retro-table__empty">
                    No hay ventas registradas con ganancia histórica. Las operaciones nuevas
                    guardan el porcentaje y la ganancia al momento de ejecutarse.
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
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
