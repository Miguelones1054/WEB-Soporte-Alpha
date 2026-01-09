'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

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

export default function GananciasPage() {
  const router = useRouter();
  const [operations, setOperations] = useState<AdminOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Ganancias - Admin';
    fetchOperations();
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar operaciones');
      }

      const data = await response.json();
      setOperations(data.operations || []);
    } catch (err: any) {
      console.error('Error fetching operations:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const adminOps = useMemo(
    () =>
      operations.filter((op) =>
        ['ADD_ADMIN_BALANCE', 'SUBTRACT_ADMIN_BALANCE'].includes(op.operation_type)
      ),
    [operations]
  );

  const GAIN_RATIO = 0.39 / 0.61; // ganancia = 39% cuando costo es 61%

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

      const opDate = new Date(op.timestamp);
      const opDay = new Date(opDate);
      opDay.setHours(0, 0, 0, 0);
      if (opDay.getTime() === hoy.getTime()) {
        totalDia += gain;
      }
    });

    return { totalHoy: totalDia, totalHistorico: total };
  }, [adminOps]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin-panel')}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
            title="Volver"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Ganancias del Administrador</h1>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Ganancia del día</p>
              <p className="text-2xl font-bold text-green-400">
                ${formatCurrency(Math.abs(totalHoy))} ↑
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Ganancia histórica</p>
              <p className="text-2xl font-bold text-green-300">
                ${formatCurrency(Math.abs(totalHistorico))} ↑
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Operaciones</p>
              <p className="text-2xl font-bold text-blue-300">{adminOps.length}</p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Registros de balance admin</h2>
              <span className="text-sm text-gray-400">Mostrando {adminOps.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ganancia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Razón
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {adminOps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        No hay registros de balance de admin.
                      </td>
                    </tr>
                  )}
                  {adminOps.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-700/40">
                      <td className="px-4 py-3 text-sm text-gray-200">{formatDate(op.timestamp)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                            op.operation_type === 'ADD_ADMIN_BALANCE'
                              ? 'text-emerald-300 bg-emerald-900/30 border-emerald-600/60'
                              : 'text-amber-300 bg-amber-900/30 border-amber-600/60'
                          }`}
                        >
                          {op.operation_type === 'ADD_ADMIN_BALANCE' ? 'Ingreso' : 'Descuento'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${
                          op.operation_type === 'ADD_ADMIN_BALANCE' ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        ${formatCurrency(op.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-300">
                        ${formatCurrency(Math.abs(calcOpGain(op)))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-200">{op.admin_email}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {op.reason || '(Sin razón)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

