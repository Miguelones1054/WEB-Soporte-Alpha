'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroAlert } from '../../../components/retro';
import { GananciasDashboard } from './GananciasDashboard';
import type { GananciaOperation } from './gananciasShared';

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

  return (
    <GananciasDashboard
      operations={operations}
      totalHoy={totalHoy}
      totalHistorico={totalHistorico}
      loading={loading}
      error={error}
      infoAlert={
        porcentajeActual != null ? (
          <RetroAlert variant="info">
            Tu porcentaje actual es <strong>{porcentajeActual}%</strong>. En la tabla, cada fila
            muestra el porcentaje y la ganancia registrados al momento de la operación.
          </RetroAlert>
        ) : null
      }
      emptyMessage="No hay ventas registradas con ganancia histórica. Las operaciones nuevas guardan el porcentaje y la ganancia al momento de ejecutarse."
    />
  );
}
