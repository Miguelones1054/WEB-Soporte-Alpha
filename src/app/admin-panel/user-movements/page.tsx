'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

interface UserMovement {
  id: string;
  mvalue: string;
  date: string;
  name: string;
  msj: string;
  type: 'INCOMING' | 'OUTGOING';
  amount: string;
  isQrPayment: boolean;
}

function UserMovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const userPhone = searchParams.get('phone');

  const [movements, setMovements] = useState<UserMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'normal' | 'deleted'>('normal');

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin - Movimientos';

    if (!userId || !userPhone) {
      router.push('/admin-panel');
      return;
    }
    fetchUserMovements();
  }, [userId, userPhone, activeTab]);

  const fetchUserMovements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const endpoint = activeTab === 'deleted'
        ? `${API_BASE_URL}/admin/user/${userPhone}/movements-deleted`
        : `${API_BASE_URL}/admin/user/${userPhone}/movements`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al cargar movimientos');
      }
    } catch (err) {
      console.error('Error fetching user movements:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getMovementIcon = (type: string, isQrPayment: boolean) => {
    if (isQrPayment) {
      return (
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }

    if (type === 'INCOMING') {
      return (
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </div>
      );
    }
  };

  const getMovementColor = (type: string, isQrPayment: boolean) => {
    if (isQrPayment) {
      return 'text-purple-400 bg-purple-900/20 border-purple-700/50';
    }
    return type === 'INCOMING'
      ? 'text-green-400 bg-green-900/20 border-green-700/50'
      : 'text-red-400 bg-red-900/20 border-red-700/50';
  };

  const handleTabChange = (tab: 'normal' | 'deleted') => {
    setActiveTab(tab);
    setLoading(true);
    setError(null);
  };

  const handleGoBack = () => {
    // Verificar si tenemos token válido antes de navegar
    const token = localStorage.getItem('admin_token');
    if (token) {
      router.push(`/admin-panel?user=${userPhone}&keepQuery=true`);
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleGoBack}
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

          <div>
            <h1 className="text-2xl font-bold text-white">Movimientos del Usuario</h1>
            <p className="text-gray-400 text-sm">Número: {userPhone}</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Historial de Movimientos</h2>
                  <p className="text-gray-400 text-sm">
                    {activeTab === 'normal' ? 'Transacciones y movimientos del usuario' : 'Movimientos eliminados del usuario'}
                  </p>
                </div>
              </div>

              {/* Pestañas */}
              <div className="flex space-x-1">
                <button
                  onClick={() => handleTabChange('normal')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    activeTab === 'normal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Movimientos ({movements.length})</span>
                </button>
                <button
                  onClick={() => handleTabChange('deleted')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    activeTab === 'deleted'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Eliminados ({movements.length})</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg m-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {movements.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  {activeTab === 'normal' ? 'No hay movimientos registrados' : 'No hay movimientos eliminados'}
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'normal'
                    ? 'Este usuario aún no ha realizado transacciones'
                    : 'Este usuario no tiene movimientos eliminados'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {movements.map((movement) => (
                  <div key={movement.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start space-x-4">
                      {getMovementIcon(movement.type, movement.isQrPayment)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMovementColor(movement.type, movement.isQrPayment)}`}>
                              {movement.isQrPayment ? 'Pago QR' :
                               movement.type === 'INCOMING' ? 'Ingreso' : 'Egreso'}
                            </span>
                            <span className="text-gray-400 text-sm">
                              {formatDate(movement.date)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-white font-medium">
                            {movement.msj}
                          </p>

                          <p className={`text-lg font-bold ${
                            movement.type === 'INCOMING' ? 'text-green-400' :
                            movement.isQrPayment ? 'text-purple-400' : 'text-red-400'
                          }`}>
                            {movement.type === 'INCOMING' ? '+' : '-'}${formatCurrency(movement.amount)}
                          </p>

                          {movement.name && (
                            <p className="text-gray-400 text-sm">
                              Procesado por: {movement.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UserMovementsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    }>
      <UserMovementsContent />
    </Suspense>
  );
}
