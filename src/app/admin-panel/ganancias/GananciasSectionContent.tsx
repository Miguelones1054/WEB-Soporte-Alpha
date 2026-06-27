'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroAlert, RetroIcon, RetroLoadingOverlay, RetroWindow } from '../../../components/retro';

interface AdminOperation {
  id: string;
  admin_email: string;
  admin_name: string;
  operation_type: string;
  target_user: string;
  amount: number;
  reason: string;
  previous_balance: number;
  new_balance: number;
  timestamp: string;
}

export function GananciasSectionContent() {
  const router = useRouter();
  const [operations, setOperations] = useState<AdminOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/operations?limit=500`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar operaciones');
      }

      const data = await response.json();
      setOperations(data.operations || []);
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

  const adminOps = useMemo(
    () =>
      operations.filter((op) =>
        ['ADD_ADMIN_BALANCE', 'SUBTRACT_ADMIN_BALANCE'].includes(op.operation_type)
      ),
    [operations]
  );

  const GAIN_RATIO = 0.39 / 0.61;

  const calcOpGain = (op: AdminOperation) => {
    const base = op.amount || 0;
    const gain = base * GAIN_RATIO;
    return op.operation_type === 'ADD_ADMIN_BALANCE' ? -gain : gain;
  };

  const { totalHoy, totalHistorico } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let totalDia = 0;
    let total = 0;

    adminOps.forEach((op) => {
      const gain = calcOpGain(op);
      total += gain;
      const opDay = new Date(op.timestamp);
      opDay.setHours(0, 0, 0, 0);
      if (opDay.getTime() === hoy.getTime()) totalDia += gain;
    });

    return { totalHoy: totalDia, totalHistorico: total };
  }, [adminOps]);

  if (loading) {
    return <RetroLoadingOverlay message="Cargando ganancias..." />;
  }

  return (
    <div className="retro-admin-container space-y-4">
      {error && <RetroAlert variant="error">{error}</RetroAlert>}

      <div className="retro-stat-grid">
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Ganancia del día</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatCurrency(Math.abs(totalHoy))}</span>
              <RetroIcon name="office/calendar" size={16} alt="" />
            </span>
          </p>
        </div>
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Ganancia histórica</p>
          <p className="retro-stat-card__value retro-text-ok">
            <span className="retro-stat-card__value-row">
              <span>${formatCurrency(Math.abs(totalHistorico))}</span>
              <RetroIcon name="office/bar_graph" size={16} alt="" />
            </span>
          </p>
        </div>
        <div className="retro-stat-card">
          <p className="retro-stat-card__label">Operaciones</p>
          <p className="retro-stat-card__value">
            <span className="retro-stat-card__value-row">
              <span>{adminOps.length}</span>
              <RetroIcon name="office/document" size={16} alt="" />
            </span>
          </p>
        </div>
      </div>

      <RetroWindow title={`Registros de balance admin (${adminOps.length})`} fullWidth bodyClassName="p-0">
        <div className="retro-table-wrap">
          <table className="retro-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Ganancia</th>
                <th>Admin</th>
                <th>Razón</th>
              </tr>
            </thead>
            <tbody>
              {adminOps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="retro-table__empty">
                    No hay registros de balance de admin.
                  </td>
                </tr>
              ) : (
                adminOps.map((op) => (
                  <tr key={op.id}>
                    <td>{formatDate(op.timestamp)}</td>
                    <td>{op.operation_type === 'ADD_ADMIN_BALANCE' ? 'Ingreso' : 'Descuento'}</td>
                    <td>${formatCurrency(op.amount || 0)}</td>
                    <td className="retro-text-ok">${formatCurrency(Math.abs(calcOpGain(op)))}</td>
                    <td>{op.admin_email}</td>
                    <td>{op.reason || '(Sin razón)'}</td>
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
