'use client';

import { useState, useEffect } from 'react';
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

type FilterType = 'ALL' | 'BALANCE' | 'ADMIN_BALANCE' | 'SMS' | 'USER_ACTIONS' | 'USER_CREATIONS';

export default function RegistrosPage() {
  const router = useRouter();
  const [operations, setOperations] = useState<AdminOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin - Registros';

    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/operations?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al cargar operaciones');
      }
    } catch (err) {
      console.error('Error fetching operations:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  const formatDayHeader = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    // Capitalizar primera letra del día
    const formatted = date.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getFilteredOperations = () => {
    if (activeFilter === 'ALL') return operations;

    const balanceTypes = ['ADD_BALANCE', 'SUBTRACT_BALANCE'];
    const adminBalanceTypes = ['ADD_ADMIN_BALANCE', 'SUBTRACT_ADMIN_BALANCE'];
    const smsTypes = ['ADD_SMS', 'SUBTRACT_SMS'];
    const userActionTypes = ['UPDATE_USER', 'BAN_USER', 'UNBAN_USER', 'UNLINK_DEVICE', 'UPGRADE_VIP', 'CANCEL_VIP'];
    const userCreationTypes = ['CREATE_USER'];

    switch (activeFilter) {
      case 'BALANCE':
        return operations.filter(op => balanceTypes.includes(op.operation_type));
      case 'ADMIN_BALANCE':
        return operations.filter(op => adminBalanceTypes.includes(op.operation_type));
      case 'SMS':
        return operations.filter(op => smsTypes.includes(op.operation_type));
      case 'USER_ACTIONS':
        return operations.filter(op => userActionTypes.includes(op.operation_type));
      case 'USER_CREATIONS':
        return operations.filter(op => userCreationTypes.includes(op.operation_type));
      default:
        return operations;
    }
  };

  const groupOperationsByDate = (operations: AdminOperation[]) => {
    const grouped: { [key: string]: AdminOperation[] } = {};

    operations.forEach(operation => {
      const date = new Date(operation.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(operation);
    });

    return grouped;
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'ADD_BALANCE':
        return (
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'SUBTRACT_BALANCE':
        return (
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'ADD_ADMIN_BALANCE':
        return (
          <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m0 0l-3-3m3 3l3-3M6 9h12" />
            </svg>
          </div>
        );
      case 'SUBTRACT_ADMIN_BALANCE':
        return (
          <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18V6m0 0l3 3m-3-3L9 9M6 15h12" />
            </svg>
          </div>
        );
      case 'UPDATE_USER':
        return (
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'BAN_USER':
        return (
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
            </svg>
          </div>
        );
      case 'UNBAN_USER':
        return (
          <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'UNLINK_DEVICE':
        return (
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM6.75 12a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" />
            </svg>
          </div>
        );
      case 'UPGRADE_VIP':
        return (
          <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case 'CANCEL_VIP':
        return (
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674zM9 12l2 2 4-4" />
            </svg>
          </div>
        );
      case 'ADD_SMS':
        return (
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'SUBTRACT_SMS':
        return (
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'CREATE_USER':
        return (
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getOperationColor = (operationType: string) => {
    switch (operationType) {
      case 'ADD_BALANCE':
        return 'text-green-400 bg-green-900/20 border-green-700/50';
      case 'SUBTRACT_BALANCE':
        return 'text-red-400 bg-red-900/20 border-red-700/50';
      case 'ADD_ADMIN_BALANCE':
        return 'text-emerald-300 bg-emerald-900/20 border-emerald-700/60';
      case 'SUBTRACT_ADMIN_BALANCE':
        return 'text-amber-300 bg-amber-900/20 border-amber-700/60';
      case 'UPDATE_USER':
        return 'text-red-400 bg-red-900/20 border-red-700/50';
      case 'BAN_USER':
        return 'text-red-500 bg-red-900/30 border-red-700/60';
      case 'UNBAN_USER':
        return 'text-green-500 bg-green-900/30 border-green-700/60';
      case 'UNLINK_DEVICE':
        return 'text-orange-400 bg-orange-900/20 border-orange-700/50';
      case 'UPGRADE_VIP':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      case 'CANCEL_VIP':
        return 'text-gray-400 bg-gray-900/30 border-gray-700/60';
      case 'ADD_SMS':
        return 'text-red-300 bg-red-950/40 border-red-800/50';
      case 'SUBTRACT_SMS':
        return 'text-orange-400 bg-orange-900/20 border-orange-700/50';
      case 'CREATE_USER':
        return 'text-green-500 bg-green-900/30 border-green-700/60';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-red-500"></div>
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

          <h1 className="text-2xl font-bold text-white">Registros de Operaciones</h1>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Filtros */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Filtrar Operaciones</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === 'ALL'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Todas ({operations.length})
              </button>
              <button
                onClick={() => setActiveFilter('BALANCE')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeFilter === 'BALANCE'
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/currency-dollar.svg"
                  alt="Dinero"
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span>Recargas/Retiros ({operations.filter(op => ['ADD_BALANCE', 'SUBTRACT_BALANCE'].includes(op.operation_type)).length})</span>
              </button>
              <button
                onClick={() => setActiveFilter('ADMIN_BALANCE')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeFilter === 'ADMIN_BALANCE'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/shield-check.svg"
                  alt="Admin balance"
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span>Balance Admin ({operations.filter(op => ['ADD_ADMIN_BALANCE', 'SUBTRACT_ADMIN_BALANCE'].includes(op.operation_type)).length})</span>
              </button>
              <button
                onClick={() => setActiveFilter('SMS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeFilter === 'SMS'
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/chat-bubble-left-right.svg"
                  alt="SMS"
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span>SMS ({operations.filter(op => ['ADD_SMS', 'SUBTRACT_SMS'].includes(op.operation_type)).length})</span>
              </button>
              <button
                onClick={() => setActiveFilter('USER_ACTIONS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeFilter === 'USER_ACTIONS'
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/users.svg"
                  alt="Usuarios"
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span>Gestión Usuarios ({operations.filter(op => ['UPDATE_USER', 'BAN_USER', 'UNBAN_USER', 'UNLINK_DEVICE', 'UPGRADE_VIP', 'CANCEL_VIP'].includes(op.operation_type)).length})</span>
              </button>
              <button
                onClick={() => setActiveFilter('USER_CREATIONS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeFilter === 'USER_CREATIONS'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/user-plus.svg"
                  alt="Crear Usuario"
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span>Usuarios Creados ({operations.filter(op => ['CREATE_USER'].includes(op.operation_type)).length})</span>
              </button>
            </div>
          </div>

          {/* Lista de operaciones */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                Historial de Operaciones
                {activeFilter !== 'ALL' && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({activeFilter === 'BALANCE' ? 'Recargas/Retiros' :
                      activeFilter === 'ADMIN_BALANCE' ? 'Balance Admin' :
                      activeFilter === 'SMS' ? 'SMS' :
                      activeFilter === 'USER_ACTIONS' ? 'Gestión de Usuarios' :
                      activeFilter === 'USER_CREATIONS' ? 'Usuarios Creados' : 'Todas'})
                  </span>
                )}
              </h2>
              <p className="text-gray-400 text-sm">
                {activeFilter === 'ALL'
                  ? 'Registro detallado de todas tus acciones administrativas'
                  : `Mostrando ${getFilteredOperations().length} operaciones filtradas`
                }
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg m-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {getFilteredOperations().length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  {activeFilter === 'ALL'
                    ? 'No hay operaciones registradas'
                    : `No hay operaciones de ${activeFilter === 'BALANCE' ? 'recargas/retiros' :
                                              activeFilter === 'ADMIN_BALANCE' ? 'balance de admin' :
                                              activeFilter === 'SMS' ? 'SMS' :
                                              activeFilter === 'USER_ACTIONS' ? 'gestión de usuarios' :
                                              activeFilter === 'USER_CREATIONS' ? 'creación de usuarios' : 'este tipo'}`}
                </h3>
                <p className="text-gray-500">
                  {activeFilter === 'ALL'
                    ? 'Las operaciones que realices aparecerán aquí automáticamente'
                    : 'Cambia el filtro para ver otros tipos de operaciones'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {Object.entries(groupOperationsByDate(getFilteredOperations()))
                  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                  .map(([dateKey, dayOperations]) => (
                    <div key={dateKey}>
                      {/* Encabezado del día */}
                      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-600/50 sticky top-0 z-10">
                        <h3 className="text-lg font-semibold text-white">
                          {formatDayHeader(dayOperations[0].timestamp)}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {dayOperations.length} operación{dayOperations.length !== 1 ? 'es' : ''} en este día
                        </p>
                      </div>

                      {/* Operaciones del día */}
                      {dayOperations.map((operation) => (
                        <div key={operation.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-start space-x-4">
                            {getOperationIcon(operation.operation_type)}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getOperationColor(operation.operation_type)}`}>
                                    {operation.operation_type === 'ADD_BALANCE' ? 'Recarga' :
                                     operation.operation_type === 'SUBTRACT_BALANCE' ? 'Retiro' :
                                     operation.operation_type === 'UPDATE_USER' ? 'Actualización' :
                                     operation.operation_type === 'BAN_USER' ? 'Inhabilitar' :
                                     operation.operation_type === 'UNBAN_USER' ? 'Habilitar' :
                                     operation.operation_type === 'UNLINK_DEVICE' ? 'Desvincular' :
                                     operation.operation_type === 'UPGRADE_VIP' ? 'Activar VIP' :
                                     operation.operation_type === 'CANCEL_VIP' ? 'Cancelar VIP' :
                                     operation.operation_type === 'ADD_SMS' ? 'Agregar SMS' :
                                     operation.operation_type === 'SUBTRACT_SMS' ? 'Restar SMS' :
                                     operation.operation_type === 'CREATE_USER' ? 'Crear Usuario' :
                                     operation.operation_type}
                                  </span>
                                  <span className="text-gray-400 text-sm">
                                    {new Date(operation.timestamp).toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-white font-medium">
                                  {['ADD_ADMIN_BALANCE', 'SUBTRACT_ADMIN_BALANCE'].includes(operation.operation_type)
                                    ? (
                                      <>
                                        Administrador: <span className="text-emerald-300">{operation.target_user}</span>
                                      </>
                                    ) : (
                                      <>
                                        Usuario: <span className="text-red-400">{operation.target_user}</span>
                                      </>
                                    )}
                                </p>

                                {operation.amount !== undefined && (
                                  <p className="text-gray-300">
                                    Monto: <span className={`font-semibold ${
                                      operation.operation_type === 'ADD_BALANCE' ? 'text-green-400' :
                                      operation.operation_type === 'SUBTRACT_BALANCE' ? 'text-red-400' :
                                      operation.operation_type === 'ADD_ADMIN_BALANCE' ? 'text-emerald-300' :
                                      operation.operation_type === 'SUBTRACT_ADMIN_BALANCE' ? 'text-amber-300' :
                                      'text-red-400'
                                    }`}>
                                      ${formatCurrency(operation.amount)}
                                    </span>
                                  </p>
                                )}

                                {(operation.previous_balance !== undefined && operation.new_balance !== undefined) && (
                                  <p className="text-gray-300 text-sm">
                                    Saldo anterior: ${formatCurrency(operation.previous_balance)} →
                                    Nuevo saldo: ${formatCurrency(operation.new_balance)}
                                  </p>
                                )}

                                {operation.reason && (
                                  <div className="text-gray-400 text-sm">
                                    {operation.operation_type === 'UPDATE_USER' && operation.reason.includes('→') ? (
                                      <div className="space-y-1">
                                        <p className="font-medium text-gray-300">Cambios realizados:</p>
                                        {operation.reason.split(', ').map((change, index) => (
                                          <p key={index} className="italic ml-2">• {change}</p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="italic">"{operation.reason}"</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
