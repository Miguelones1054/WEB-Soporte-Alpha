'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

interface AppConfig {
  Name_nequi?: string;
  Nequi?: string;
  cap?: boolean;
  dev?: boolean;
  extract_name_active?: boolean;
  llave?: string;
  logs_transacciones?: boolean;
  onproblemclicklink?: string;
  qr_pay?: string;
  recharges?: boolean;
  red_vip?: string;
  red_vip_active?: boolean;
  suggested_container_enabled?: boolean;
  support_link?: string;
  vip_functions_link?: string;
  withdrawurl?: string;
}

export default function OperationsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin - Operaciones Técnicas';

    loadAppConfig();
  }, []);

  const loadAppConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/app-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `Error: ${response.status}`;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // Si no se puede parsear como JSON, mantener el mensaje por defecto
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
      } else {
        setError(data.message || 'Error al cargar la configuración');
      }
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
      const errorMsg = err.message || '';

      if (errorMsg.includes('403') || errorMsg.includes('propietario') || errorMsg.includes('owner') || errorMsg.includes('Owner')) {
        setError('Acceso restringido: Solo administradores con rol Owner pueden acceder a esta seccion. Contacta al administrador del sistema para solicitar permisos.');
      } else if (errorMsg.includes('401') || errorMsg.includes('Token') || errorMsg.includes('expirado')) {
        setError('Sesion expirada. Por favor, inicia sesion nuevamente.');
      } else {
        setError('Error al cargar la configuracion. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateConfigValue = async (key: string, value: any) => {
    setUpdatingField(key);
    try {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/app-config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: value
        }),
      });

      if (!response.ok) {
        let errorMessage = `Error: ${response.status}`;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // Si no se puede parsear como JSON, mantener el mensaje por defecto
        }

        if (response.status === 403 || errorMessage.includes('403') || errorMessage.includes('propietario') || errorMessage.includes('owner') || errorMessage.includes('Owner')) {
          throw new Error('Acceso restringido: Solo administradores con rol Owner pueden modificar la configuracion.');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setConfig(prev => prev ? { ...prev, [key]: value } : { [key]: value });
      } else {
        throw new Error(data.message || 'Error al actualizar la configuración');
      }
    } catch (err: any) {
      console.error('Error actualizando configuración:', err);
      setError(err.message || 'Error al actualizar la configuración');
    } finally {
      setUpdatingField(null);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'No definido';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'string' && value.length > 50) {
      return `${value.substring(0, 50)}...`;
    }
    return String(value);
  };

  const getFieldDescription = (field: string): string => {
    const descriptions: Record<string, string> = {
      cap: 'Configuración de capturas de pantalla',
      logs_transacciones: 'Configuración de logs de transacciones',
      extract_name_active: 'Configuración de API extract name nequi',
      suggested_container_enabled: 'Configuración de sugeridos publicidad',
      red_vip_active: 'Configuración de contenedor para redimir VIP'
    };
    return descriptions[field] || 'Actualizando configuración';
  };

  const getValueColor = (value: any): string => {
    if (value === null || value === undefined) return 'text-gray-500';
    if (typeof value === 'boolean') {
      return value ? 'text-green-400' : 'text-red-400';
    }
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Operaciones Tecnicas</h1>
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-3">Error de Acceso</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin-panel')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Volver al Panel
              </button>
              <button
                onClick={loadAppConfig}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ajustes del Bot de Recargas */}
          <div className="bg-gray-800 rounded-lg p-6 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Ajustes del Bot de Recargas
            </h2>

            {/* Información de Nequi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-300 mb-3">Información de Nequi</h3>
                <div>
                  <span className="text-gray-400 text-sm">Nombre:</span>
                  <p className={`font-medium ${getValueColor(config?.Name_nequi)}`}>
                    {formatValue(config?.Name_nequi)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Número:</span>
                  <p className={`font-medium ${getValueColor(config?.Nequi)}`}>
                    {formatValue(config?.Nequi)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Llave:</span>
                  <p className={`font-medium ${getValueColor(config?.llave)}`}>
                    {formatValue(config?.llave)}
                  </p>
                </div>
              </div>

              {/* Código QR de Pago */}
              <div className="md:col-span-2 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M12 18h4.01M12 9h4.01M12 6h4.01M6 3v18m0 0l3-3m-3 3l-3-3" />
                  </svg>
                  Código QR de Pago
                </h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-xs text-green-400 break-all font-mono leading-relaxed">
                    {config?.qr_pay || 'No definido'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración General */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración General
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Permitir capturas en la app</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config?.cap || false}
                    disabled={updatingField !== null}
                    onChange={(e) => updateConfigValue('cap', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Logs de transacciones</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config?.logs_transacciones || false}
                    disabled={updatingField !== null}
                    onChange={(e) => updateConfigValue('logs_transacciones', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Funciones Especiales */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Funciones Especiales
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Habilitar API extract name nequi</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config?.extract_name_active || false}
                    disabled={updatingField !== null}
                    onChange={(e) => updateConfigValue('extract_name_active', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Mostrar sugeridos publicidad</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config?.suggested_container_enabled || false}
                    disabled={updatingField !== null}
                    onChange={(e) => updateConfigValue('suggested_container_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Mostrar contenedor para redimir VIP</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config?.red_vip_active || false}
                    disabled={updatingField !== null}
                    onChange={(e) => updateConfigValue('red_vip_active', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Enlaces */}
          <div className="bg-gray-800 rounded-lg p-6 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Enlaces y URLs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Support Link:</span>
                <p className="text-xs text-red-400 break-all font-mono bg-gray-700 p-2 rounded mt-1">
                  {config?.support_link || 'No definido'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">VIP Functions Link:</span>
                <p className="text-xs text-red-400 break-all font-mono bg-gray-700 p-2 rounded mt-1">
                  {config?.vip_functions_link || 'No definido'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Red VIP:</span>
                <p className="text-xs text-red-400 break-all font-mono bg-gray-700 p-2 rounded mt-1">
                  {config?.red_vip || 'No definido'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">On Problem Click:</span>
                <p className="text-xs text-red-400 break-all font-mono bg-gray-700 p-2 rounded mt-1">
                  {config?.onproblemclicklink || 'No definido'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Withdraw URL:</span>
                <p className="text-xs text-red-400 break-all font-mono bg-gray-700 p-2 rounded mt-1">
                  {config?.withdrawurl || 'No definido'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Overlay de carga durante actualización */}
      {updatingField && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-gray-800/95 rounded-xl p-8 shadow-2xl border border-gray-700/50 max-w-sm mx-4 backdrop-blur-xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-red-500"></div>
              <div>
                <h3 className="text-xl font-semibold text-white">Actualizando configuración</h3>
                <p className="text-gray-300 text-sm mt-1">
                  {updatingField && getFieldDescription(updatingField)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
