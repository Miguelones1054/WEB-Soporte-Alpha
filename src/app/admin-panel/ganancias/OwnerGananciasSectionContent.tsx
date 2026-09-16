'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import {
  shiftDateKey,
  toColombiaDateKey,
  todayColombiaDateKey,
} from '../../../lib/gananciasDateFilter';
import { RetroAlert, RetroModal, RetroSelect, RetroWindow } from '../../../components/retro';
import { GananciasDashboard } from './GananciasDashboard';
import type {
  AdminGananciasSummary,
  GananciaOperation,
  GananciasDiaMap,
  GananciasPeriodos,
} from './gananciasShared';
import {
  formatGananciaCurrency,
  gananciaOperationKey,
  getOperationLabel,
  isOwnerIngresoOperation,
} from './gananciasShared';

const ALL_ADMINS = 'all';

export function OwnerGananciasSectionContent() {
  const router = useRouter();
  const [operations, setOperations] = useState<GananciaOperation[]>([]);
  const [adminsSummary, setAdminsSummary] = useState<AdminGananciasSummary[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState(ALL_ADMINS);
  const [totalHoy, setTotalHoy] = useState(0);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [periodos, setPeriodos] = useState<GananciasPeriodos | null>(null);
  const [dias, setDias] = useState<GananciasDiaMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationToDelete, setOperationToDelete] = useState<GananciaOperation | null>(null);
  const [deletingOperationId, setDeletingOperationId] = useState<string | null>(null);

  const fetchOwnerGanancias = useCallback(async (adminEmail: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const params = new URLSearchParams({ limit: '500' });
      if (adminEmail !== ALL_ADMINS) {
        params.set('admin_email', adminEmail);
      }

      const response = await fetch(`${API_BASE_URL}/admin/owner/ganancias?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar ganancias de administradores');
      }

      const data = await response.json();
      setOperations(data.operations || []);
      setAdminsSummary(data.admins_summary || []);
      setTotalHoy(data.total_hoy ?? 0);
      setTotalHistorico(data.total_historico ?? 0);
      setPeriodos(data.periodos ?? null);
      setDias(data.dias ?? {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setError(message);
      setOperations([]);
      setAdminsSummary([]);
      setTotalHoy(0);
      setTotalHistorico(0);
      setPeriodos(null);
      setDias({});
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchOwnerGanancias(selectedAdmin);
  }, [fetchOwnerGanancias, selectedAdmin]);

  const adminOptions = useMemo(
    () => [
      { value: ALL_ADMINS, label: 'Todos los administradores' },
      ...adminsSummary.map((admin) => ({
        value: admin.email,
        label: `${admin.name} (${admin.email})`,
      })),
    ],
    [adminsSummary],
  );

  const selectedSummary = useMemo(
    () => adminsSummary.find((admin) => admin.email === selectedAdmin),
    [adminsSummary, selectedAdmin],
  );

  const dailyFromOperations = useMemo(() => {
    const today = todayColombiaDateKey();
    const yesterday = shiftDateKey(today, -1);
    const from3 = shiftDateKey(today, -2);
    const byAdmin: Record<string, { hoy: number; ayer: number; d3: number }> = {};
    const wompi = { hoy: 0, ayer: 0, d3: 0 };
    const loaded = { hoy: 0, ayer: 0, d3: 0 };

    const bump = (dest: { hoy: number; ayer: number; d3: number }, day: string, gain: number) => {
      if (day === today) dest.hoy += gain;
      if (day === yesterday) dest.ayer += gain;
      if (day >= from3 && day <= today) dest.d3 += gain;
    };

    for (const op of operations) {
      const day = toColombiaDateKey(op.timestamp);
      const gain = op.ganancia || 0;
      bump(loaded, day, gain);
      if (isOwnerIngresoOperation(op.operation_type)) {
        bump(wompi, day, gain);
        continue;
      }
      const email = (op.admin_email || '').trim().toLowerCase();
      if (!byAdmin[email]) byAdmin[email] = { hoy: 0, ayer: 0, d3: 0 };
      bump(byAdmin[email], day, gain);
    }

    return { byAdmin, wompi, loaded };
  }, [operations]);

  const dailyForAdmin = (admin: AdminGananciasSummary) => {
    const daily = dailyFromOperations.byAdmin[(admin.email || '').trim().toLowerCase()] || {
      hoy: 0,
      ayer: 0,
      d3: 0,
    };
    const isOwnerRow = (admin.role || '').toLowerCase() === 'owner';
    return {
      hoy: daily.hoy + (isOwnerRow ? dailyFromOperations.wompi.hoy : 0),
      ayer: daily.ayer + (isOwnerRow ? dailyFromOperations.wompi.ayer : 0),
      d3: daily.d3 + (isOwnerRow ? dailyFromOperations.wompi.d3 : 0),
    };
  };

  const handleDeleteRequest = (op: GananciaOperation) => {
    setOperationToDelete(op);
  };

  const handleCloseDeleteModal = () => {
    if (deletingOperationId) return;
    setOperationToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!operationToDelete) return;

    const opKey = gananciaOperationKey(operationToDelete);
    setDeletingOperationId(opKey);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const params = new URLSearchParams({
        admin_email: operationToDelete.admin_email,
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/owner/ganancias/operations/${encodeURIComponent(operationToDelete.id)}?${params}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo eliminar el movimiento');
      }

      setOperationToDelete(null);
      await fetchOwnerGanancias(selectedAdmin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el movimiento';
      setError(message);
    } finally {
      setDeletingOperationId(null);
    }
  };

  return (
    <>
      <GananciasDashboard
        operations={operations}
        totalHoy={totalHoy}
        totalHistorico={totalHistorico}
        periodos={periodos}
        dias={dias}
        loading={loading}
        error={error}
        showAdminColumn={selectedAdmin === ALL_ADMINS}
        canDelete
        deletingOperationId={deletingOperationId}
        onDeleteOperation={handleDeleteRequest}
        infoAlert={
          <RetroAlert variant="info">
            Vista del propietario. Las recargas Wompi del panel cuentan como ingreso tuyo: las
            ves en <strong>Todos</strong> y al filtrar tu usuario owner. No se suman a la
            ganancia de los demás admins.
          </RetroAlert>
        }
        toolbar={
        <RetroWindow title="Administrador" fullWidth bodyClassName="p-3">
          <label className="retro-ganancias-owner-filter">
            <span>Ver ganancias de</span>
            <RetroSelect
              id="ownerGananciasAdmin"
              value={selectedAdmin}
              onChange={setSelectedAdmin}
              options={adminOptions}
            />
          </label>

          {selectedAdmin !== ALL_ADMINS && selectedSummary && (
            <p className="retro-ganancias-filter-summary">
              <strong>{selectedSummary.name}</strong> · {selectedSummary.porcentaje ?? '—'}% · Hoy:{' '}
              <strong>${formatGananciaCurrency(dailyFromOperations.loaded.hoy)}</strong> · Ayer:{' '}
              <strong>${formatGananciaCurrency(dailyFromOperations.loaded.ayer)}</strong> · 3 días:{' '}
              <strong>${formatGananciaCurrency(dailyFromOperations.loaded.d3)}</strong> · Histórico:{' '}
              <strong>${formatGananciaCurrency(selectedSummary.total_historico)}</strong>
            </p>
          )}

          {selectedAdmin === ALL_ADMINS && adminsSummary.length > 0 && (
            <div className="retro-table-wrap retro-ganancias-owner-summary-table">
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Administrador</th>
                    <th>%</th>
                    <th>Hoy</th>
                    <th>Ayer</th>
                    <th>3 días</th>
                    <th>Histórico</th>
                    <th>Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {adminsSummary.map((admin) => {
                    const daily = dailyForAdmin(admin);
                    return (
                    <tr key={admin.email}>
                      <td>
                        <button
                          type="button"
                          className="retro-ganancias-owner-link"
                          onClick={() => setSelectedAdmin(admin.email)}
                        >
                          {admin.name}
                        </button>
                        <div className="retro-ganancias-admin-email">{admin.email}</div>
                      </td>
                      <td>{admin.porcentaje ?? '—'}%</td>
                      <td className="retro-text-ok">${formatGananciaCurrency(daily.hoy)}</td>
                      <td className="retro-text-ok">${formatGananciaCurrency(daily.ayer)}</td>
                      <td className="retro-text-ok">${formatGananciaCurrency(daily.d3)}</td>
                      <td className="retro-text-ok">
                        ${formatGananciaCurrency(admin.total_historico)}
                      </td>
                      <td>{admin.operaciones}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </RetroWindow>
        }
        emptyMessage="No hay operaciones con ganancia para el administrador o rango seleccionado."
      />

      {operationToDelete && (
        <RetroModal
          open
          title="Eliminar movimiento de ganancia"
          onClose={handleCloseDeleteModal}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_warning"
        >
          <p className="retro-manager-modal__text">
            ¿Eliminar el movimiento de <strong>{getOperationLabel(operationToDelete.operation_type)}</strong>{' '}
            de <strong>{operationToDelete.admin_name || operationToDelete.admin_email}</strong>?
          </p>
          <p className="retro-manager-modal__text retro-manager-modal__text--muted">
            Usuario: {operationToDelete.target_user || '—'} · Ganancia:{' '}
            <strong>${formatGananciaCurrency(operationToDelete.ganancia || 0)}</strong>
          </p>
          <p className="retro-manager-modal__text retro-manager-modal__text--muted">
            Esta acción no se puede deshacer.
          </p>

          <hr className="retro-manager-modal__divider" />
          <div className="retro-manager-modal__actions">
            <button
              type="button"
              onClick={handleCloseDeleteModal}
              className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
              disabled={Boolean(deletingOperationId)}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={Boolean(deletingOperationId)}
              className="retro-manager-btn retro-manager-btn--danger retro-manager-btn--block"
            >
              {deletingOperationId ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </RetroModal>
      )}
    </>
  );
}
