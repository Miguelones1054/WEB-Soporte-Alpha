'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroLoadingOverlay, RetroWindow } from '../../../components/retro';

type StatsApp = 'nequi' | 'bancolombia' | 'daviplata';

interface PlatformStats {
  ios: number;
  android: number;
  web: number;
  unknown: number;
}

interface AppStats {
  app: StatsApp;
  label: string;
  total: number;
  banned: number;
  active: number;
  premium: number;
  platform: PlatformStats | null;
  generated_at?: string;
  error?: string;
}

const APP_TABS: { id: StatsApp; label: string }[] = [
  { id: 'nequi', label: 'Nequi' },
  { id: 'bancolombia', label: 'Bancolombia' },
  { id: 'daviplata', label: 'Daviplata' },
];

function formatNum(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-CO');
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="retro-stat-card">
      <p className="retro-stat-card__label">{label}</p>
      <p className="retro-stat-card__value">{value}</p>
    </div>
  );
}

export function EstadisticasSectionContent() {
  const router = useRouter();
  const [activeApp, setActiveApp] = useState<StatsApp>('nequi');
  const [statsByApp, setStatsByApp] = useState<Partial<Record<StatsApp, AppStats>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<Partial<Record<StatsApp, boolean>>>({});

  const fetchApp = useCallback(
    async (app: StatsApp, force = false) => {
      if (!force && loadedRef.current[app]) return;

      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/admin/stats/${app}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          router.push('/');
          return;
        }
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(
            typeof detail?.detail === 'string'
              ? detail.detail
              : `Error ${response.status}`,
          );
        }
        const data = (await response.json()) as AppStats;
        loadedRef.current[app] = true;
        setStatsByApp((prev) => ({ ...prev, [app]: data }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error cargando estadísticas';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void fetchApp(activeApp);
  }, [activeApp, fetchApp]);

  const stats = statsByApp[activeApp];

  return (
    <div className="retro-admin-container max-w-3xl">
      {loading && <RetroLoadingOverlay message="Cargando estadísticas…" />}

      <div className="retro-api__tabs mb-3" role="tablist" aria-label="Apps">
        {APP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeApp}
            className={`retro-api__tab${tab.id === activeApp ? ' retro-api__tab--active' : ''}`}
            onClick={() => setActiveApp(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <RetroWindow title="Error" fullWidth>
          <p className="m-0 text-[12px]">{error}</p>
          <button
            type="button"
            className="retro-btn mt-2"
            onClick={() => {
              loadedRef.current[activeApp] = false;
              void fetchApp(activeApp, true);
            }}
          >
            Reintentar
          </button>
        </RetroWindow>
      )}

      {!error && stats && (
        <RetroWindow title={stats.label || activeApp} fullWidth>
          <div className="retro-stat-grid">
            <StatCard label="Total usuarios" value={formatNum(stats.total)} />
            <StatCard label="Activos (no baneados)" value={formatNum(stats.active)} />
            <StatCard label="Baneados" value={formatNum(stats.banned)} />
            <StatCard label="Premium / VIP" value={formatNum(stats.premium)} />
          </div>

          {stats.platform && (
            <>
              <p className="m-0 mb-2 text-[12px] font-bold">Plataforma (Nequi)</p>
              <div className="retro-stat-grid">
                <StatCard label="iOS" value={formatNum(stats.platform.ios)} />
                <StatCard label="Android" value={formatNum(stats.platform.android)} />
                <StatCard label="Web" value={formatNum(stats.platform.web)} />
                <StatCard
                  label="Sin platform"
                  value={formatNum(stats.platform.unknown)}
                />
              </div>
            </>
          )}

          {!stats.platform && (
            <p className="m-0 text-[11px]" style={{ color: 'var(--retro-muted)' }}>
              Esta app no guarda el campo <code>platform</code> (iOS / Android).
            </p>
          )}

          {stats.generated_at && (
            <p className="m-0 mt-3 text-[11px]" style={{ color: 'var(--retro-muted)' }}>
              Actualizado: {new Date(stats.generated_at).toLocaleString('es-CO')}
              {' · '}
              <button
                type="button"
                className="retro-btn"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => {
                  loadedRef.current[activeApp] = false;
                  void fetchApp(activeApp, true);
                }}
              >
                Refrescar
              </button>
            </p>
          )}
        </RetroWindow>
      )}
    </div>
  );
}
