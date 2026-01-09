'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pie } from 'react-chartjs-2';
import { API_BASE_URL } from '../../../lib/constants';

// Importar y registrar Chart.js componentes
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes de Chart.js inmediatamente
ChartJS.register(ArcElement, Tooltip, Legend);

interface TopUser {
  numeroCel: string;
  username: string;
  saldo_visible: number;
  ok: number;
  total_balance: number;
  enabled: boolean;
}

interface UserStats {
  total_users: number;
  user_types: { [key: string]: number };
  top_users: TopUser[];
  last_updated: string;
  cached: boolean;
  speed: string;
  source: string;
}

// Función para formatear números grandes
const formatLargeNumber = (num: number): string => {
  const INFINITY_THRESHOLD = 9999999999; // 10 mil millones

  if (num >= INFINITY_THRESHOLD) {
    return '∞';
  }

  return Number(num).toLocaleString();
};

export default function StatisticsPage() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin - Estadísticas';

    const loadStats = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data: UserStats = await response.json();
          setUserStats(data);
        } else {
          console.error('Error obteniendo estadísticas');
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Error al cargar estadísticas</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin-panel')}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
            title="Volver al panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>

          <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Total de Usuarios */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-white mb-2">Total de Usuarios</h2>
            <div className="text-4xl font-bold text-blue-400">{userStats.total_users.toLocaleString()}</div>
          </div>

          {/* Gráfica Circular */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-6">Distribución de Usuarios</h3>

            <div className="flex justify-center">
              <div className="w-96 h-96">
                <Pie
                  data={{
                    labels: Object.keys(userStats.user_types).map(type => {
                      if (type === 'baneados') return `Baneados (${userStats.user_types[type]})`;
                      if (type === 'regular') return `Usuarios Activos (${userStats.user_types[type]})`;
                      if (type === 'sin_saldo') return `Sin Saldo (${userStats.user_types[type]})`;
                      return `${type.charAt(0).toUpperCase() + type.slice(1)} (${userStats.user_types[type]})`;
                    }),
                    datasets: [{
                      data: Object.values(userStats.user_types),
                      backgroundColor: Object.keys(userStats.user_types).map(type => {
                        if (type === 'baneados') return '#EF4444'; // 🔴 Rojo para baneados
                        if (type === 'sin_saldo') return '#F59E0B'; // 🟡 Amarillo para sin saldo
                        // Colores para otros tipos
                        const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316'];
                        const index = Object.keys(userStats.user_types).indexOf(type);
                        return colors[index % colors.length];
                      }),
                      borderColor: '#374151',
                      borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom' as const,
                        labels: {
                          color: '#D1D5DB',
                          font: {
                            size: 12,
                          },
                          padding: 20,
                        },
                      },
                      tooltip: {
                        backgroundColor: '#1F2937',
                        titleColor: '#F9FAFB',
                        bodyColor: '#F9FAFB',
                        callbacks: {
                          label: (context) => {
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.parsed} usuarios (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top 100 Usuarios con Más Saldo */}
          <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-6">Top 100 Usuarios con Más Saldo</h3>

            {userStats.top_users && userStats.top_users.length > 0 ? (
              <div className="w-full">
                {/* Tabla para desktop */}
                <div className="hidden lg:block overflow-x-auto table-container">
                  <table className="w-full text-sm text-gray-300 min-w-[1000px] table-responsive top-users-table">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-20">Posición</th>
                        <th className="px-4 py-3 text-left font-semibold min-w-[140px]">Usuario</th>
                        <th className="px-4 py-3 text-center font-semibold w-24">Estado</th>
                        <th className="px-4 py-3 text-left font-semibold min-w-[120px]">Número</th>
                        <th className="px-4 py-3 text-right font-semibold min-w-[140px]">Saldo Visible</th>
                        <th className="px-4 py-3 text-right font-semibold min-w-[140px]">Saldo OK</th>
                        <th className="px-4 py-3 text-right font-semibold min-w-[160px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userStats.top_users.map((user, index) => (
                        <tr key={user.numeroCel} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 font-medium text-white text-center">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            {user.username}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.enabled
                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                : 'bg-red-900/50 text-red-300 border border-red-700'
                            }`}>
                              {user.enabled ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                            {user.numeroCel}
                          </td>
                        <td className="px-4 py-3 text-right text-green-400 font-mono text-sm whitespace-nowrap">
                          ${formatLargeNumber(user.saldo_visible)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-400 font-mono text-sm whitespace-nowrap">
                          ${formatLargeNumber(user.ok)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-400 font-mono text-sm whitespace-nowrap">
                          ${formatLargeNumber(user.total_balance)}
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista móvil - Cards */}
                <div className="lg:hidden space-y-3">
                  {userStats.top_users.map((user, index) => (
                    <div key={user.numeroCel} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-white">#{index + 1}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.enabled
                              ? 'bg-green-900/50 text-green-300 border border-green-700'
                              : 'bg-red-900/50 text-red-300 border border-red-700'
                          }`}>
                            {user.enabled ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <span className="font-bold text-yellow-400 text-lg">
                          ${formatLargeNumber(user.total_balance)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Usuario:</span>
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Número:</span>
                          <span className="text-gray-300 font-mono">{user.numeroCel}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Saldo Visible:</span>
                          <span className="text-green-400 font-mono text-sm break-all">${formatLargeNumber(user.saldo_visible)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Saldo OK:</span>
                          <span className="text-blue-400 font-mono text-sm break-all">${formatLargeNumber(user.ok)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                No hay datos de usuarios disponibles
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
