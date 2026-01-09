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

interface SMSTotal {
  total_sms: number;
  users_counted: number;
  users_with_sms: number;
  users_without_sms: number;
  sms_cost_usd: number;
  sms_cost_cop: number;
  dollar_rate: number;
  timestamp: string;
  top_users: Array<{
    username: string;
    numero_cel: string;
    sms: number;
  }>;
}

export default function ReporteFacturacionSMS() {
  const [smsTotal, setSmsTotal] = useState<SMSTotal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin - Facturación SMS';

    const loadSMSStats = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Llamada al API para obtener el total de SMS
        const response = await fetch(`${API_BASE_URL}/admin/sms/total`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data: SMSTotal = await response.json();
          setSmsTotal(data);
          setError(null);
        } else if (response.status === 404) {
          // Si el endpoint no existe, mostrar mensaje de que no hay datos
          setError('Endpoint de total SMS no disponible aún');
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Error al cargar total de SMS');
        }
      } catch (error) {
        console.error('Error al cargar estadísticas de SMS:', error);
        setError('Error de conexión. No se pudieron cargar las estadísticas.');
      } finally {
        setLoading(false);
      }
    };

    loadSMSStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  if (error) {
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

            <h1 className="text-2xl font-bold text-white">Reporte de Facturación SMS</h1>
          </div>
        </header>

        {/* Error Message */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 text-center">
              <div className="text-red-400 text-lg mb-2">⚠️</div>
              <h3 className="text-xl font-medium text-white mb-2">Error al cargar datos</h3>
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!smsTotal) {
    return null;
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

          <h1 className="text-2xl font-bold text-white">Reporte de Facturación SMS</h1>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Contenedor único con total y top 100 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header con total de SMS y gráfica */}
            <div className="p-8 border-b border-gray-700">
              <div className="flex items-center justify-between">
                {/* Información del total a la izquierda */}
                <div className="flex-1">
                  <div className="text-5xl font-bold text-white mb-2">
                    {smsTotal.total_sms.toLocaleString()}
                  </div>
                  <div className="text-xl text-white mb-2">SMS Totales</div>
                  <div className="text-sm text-gray-400 mb-2">
                    Calculado de {smsTotal.users_counted.toLocaleString()} usuarios
                  </div>

                  {/* Costo total de SMS */}
                  <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-300 mb-1">Costo Total de SMS</div>
                    <div className="text-lg font-bold text-green-400">
                      ${smsTotal.sms_cost_usd.toLocaleString()} USD
                    </div>
                    <div className="text-sm text-gray-400">
                      ≈ ${smsTotal.sms_cost_cop.toLocaleString()} COP
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      TRM: ${smsTotal.dollar_rate.toLocaleString()} COP/USD
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Última actualización: {new Date(smsTotal.timestamp).toLocaleString('es-ES')}
                  </div>
                </div>

                {/* Gráfica circular más pequeña a la derecha */}
                <div className="ml-8">
                  <div className="w-48 h-48">
                    <Pie
                      data={{
                        labels: [
                          `Con SMS (${smsTotal.users_with_sms})`,
                          `Sin SMS (${smsTotal.users_without_sms})`
                        ],
                        datasets: [{
                          data: [smsTotal.users_with_sms, smsTotal.users_without_sms],
                          backgroundColor: [
                            '#10B981', // Verde para usuarios con SMS
                            '#EF4444'  // Rojo para usuarios sin SMS
                          ],
                          borderColor: '#374151',
                          borderWidth: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false, // Ocultar leyenda para ahorrar espacio
                          },
                          tooltip: {
                            backgroundColor: '#1F2937',
                            titleColor: '#E5E7EB',
                            bodyColor: '#E5E7EB',
                            borderColor: '#374151',
                            borderWidth: 1,
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        },
                      }}
                    />
                  </div>

                  {/* Mini estadísticas debajo de la gráfica */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-green-400">{smsTotal.users_with_sms}</div>
                      <div className="text-xs text-gray-400">Con SMS</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-400">{smsTotal.users_without_sms}</div>
                      <div className="text-xs text-gray-400">Sin SMS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Sección del Top 100 */}
            <div>
              <div className="px-6 py-4 border-b border-gray-700 bg-gray-700/30">
                <h3 className="text-lg font-medium text-white">Top 100 Usuarios con más SMS</h3>
                <p className="text-gray-400 text-sm">Usuarios ordenados por cantidad de SMS (descendente)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        SMS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {smsTotal.top_users && smsTotal.top_users.length > 0 ? (
                      smsTotal.top_users.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-sm text-gray-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-white font-medium">
                            {user.username}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {user.numero_cel}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-400 font-semibold text-right">
                            {user.sms.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          Cargando datos...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(!smsTotal.top_users || smsTotal.top_users.length === 0) && (
                <div className="p-8 text-center">
                  <div className="text-gray-400 text-sm">
                    {!smsTotal.top_users ? 'Cargando top usuarios...' : 'No hay usuarios con SMS registrados'}
                  </div>
                </div>
              )}

              {smsTotal.top_users && smsTotal.top_users.length > 0 && (
                <div className="px-6 py-4 bg-gray-700/30 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Mostrando {smsTotal.top_users.length} de {smsTotal.users_counted} usuarios
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      * Datos en tiempo real desde la base de datos
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
