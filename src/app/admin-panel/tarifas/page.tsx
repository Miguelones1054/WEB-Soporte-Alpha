'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

interface AdminInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

interface TarifaData {
  definicion: string;
  valor: string;
  valorClienteFinal?: string;
  ganancia?: string;
}

export default function TarifasPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [tarifas, setTarifas] = useState<TarifaData[]>([]);
  const [tarifasLoading, setTarifasLoading] = useState(true);
  const [simuladorValor, setSimuladorValor] = useState('');
  const [simulando, setSimulando] = useState(false);
  const [resultadoSimulacion, setResultadoSimulacion] = useState<{
    valorAdmin: string;
    valorCliente: string;
    ganancia: string;
    tipoRecarga: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Tarifas - Admin';

    const loadTarifas = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          setTarifasLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/admin/tarifas`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const tarifasFormateadas = data.tarifas.map((tarifa: any) => ({
            definicion: tarifa.definicion,
            valor: tarifa.valor,
            valorClienteFinal: tarifa.valorClienteFinal,
            ganancia: tarifa.ganancia
          }));
          setTarifas(tarifasFormateadas);
        } else {
          console.error('Error obteniendo tarifas del backend');
          // Fallback a datos hardcodeados en caso de error
          setTarifas([
            { definicion: 'Recarga / Usuario 1.2M', valor: '$15.250', valorClienteFinal: '$25.000', ganancia: '$9.750' },
            { definicion: 'Recarga / Usuario 2.6M', valor: '$21.350', valorClienteFinal: '$35.000', ganancia: '$13.650' },
            { definicion: 'Recarga / Usuario 5M', valor: '$27.450', valorClienteFinal: '$45.000', ganancia: '$17.550' },
            { definicion: 'Recarga / Usuario 10M', valor: '$36.600', valorClienteFinal: '$60.000', ganancia: '$23.400' },
            { definicion: 'Actualización VIP', valor: '$30.500', valorClienteFinal: '$50.000', ganancia: '$19.500' },
          ]);
        }
      } catch (error) {
        console.error('Error cargando tarifas:', error);
        // Fallback a datos hardcodeados en caso de error
        setTarifas([
          { definicion: 'Recarga / Usuario 1.2M', valor: '$15.250', valorClienteFinal: '$25.000', ganancia: '$9.750' },
          { definicion: 'Recarga / Usuario 2.6M', valor: '$21.350', valorClienteFinal: '$35.000', ganancia: '$13.650' },
          { definicion: 'Recarga / Usuario 5M', valor: '$27.450', valorClienteFinal: '$45.000', ganancia: '$17.550' },
          { definicion: 'Recarga / Usuario 10M', valor: '$36.600', valorClienteFinal: '$60.000', ganancia: '$23.400' },
          { definicion: 'Actualización VIP', valor: '$30.500', valorClienteFinal: '$50.000', ganancia: '$19.500' },
        ]);
      } finally {
        setTarifasLoading(false);
      }
    };

    const loadAdminData = async () => {
      // Verificar token en localStorage
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Hacer petición GET al backend para obtener datos frescos del admin
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const adminData = await response.json();
          setUser({
            email: adminData.email,
            displayName: adminData.name,
            role: adminData.role
          });
          setAdminInfo(adminData);
        } else {
          // Token inválido o expirado
          localStorage.removeItem('admin_token');
          router.push('/');
        }
      } catch (error) {
        console.error('Error obteniendo datos del admin:', error);
        localStorage.removeItem('admin_token');
        router.push('/');
      }

      setLoading(false);
    };

    loadAdminData();
    loadTarifas();

    // Cerrar popup cuando se hace click fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-popup') && !target.closest('.profile-button')) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('admin_password');
      localStorage.removeItem('admin_remember');
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleProfileClick = () => {
    setShowProfile(!showProfile);
  };

  const toggleDrawer = () => {
    const drawer = document.querySelector('[data-drawer]');
    if (drawer) {
      drawer.classList.toggle('open');
    }
  };

  const simularRecarga = async () => {
    const valor = parseFloat(simuladorValor.replace(/\./g, '').replace(/\$/g, ''));
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor ingrese un valor válido');
      return;
    }

    if (valor > 10000000) {
      alert('Límite máximo de recarga para simulación: $10.000.000');
      return;
    }

    setSimulando(true);
    setResultadoSimulacion(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        setSimulando(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/simular-recarga`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: valor
        }),
      });

      if (response.ok) {
        const resultado = await response.json();

        setResultadoSimulacion({
          valorAdmin: resultado.valor_admin_str,
          valorCliente: resultado.valor_cliente_str,
          ganancia: resultado.ganancia_str,
          tipoRecarga: resultado.descripcion
        });
      } else {
        const errorData = await response.json();
        alert(`Error en la simulación: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error en simulación:', error);
      alert('Error de conexión. No se pudo realizar la simulación.');
    } finally {
      setSimulando(false);
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
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Botón de Retroceso */}
            <button
              onClick={() => router.push('/admin-panel/nequi_manager')}
              className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-white rounded-lg"
              title="Volver al panel principal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Título */}
            <h1 className="text-2xl font-bold text-white">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <span>Hola,</span>
                  <div className="animate-pulse bg-gray-700 rounded h-6 w-24"></div>
                </div>
              ) : (
                `Hola, ${user?.displayName || 'Admin'}`
              )}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Ícono de Perfil */}
            <button
              onClick={handleProfileClick}
              className="profile-button text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700 relative"
              title="Perfil de Administrador"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {/* Ícono de Logout */}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              title="Cerrar Sesión"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Popup de Perfil */}
        {showProfile && adminInfo && (
          <div className="profile-popup absolute top-full right-6 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Perfil de Administrador</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">ID</label>
                  <div className="text-white font-medium">{adminInfo.id}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Nombre</label>
                  <div className="text-white font-medium">{adminInfo.name}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <div className="text-white font-medium">{adminInfo.email}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Rol</label>
                  <div className="text-white font-medium capitalize">{adminInfo.role}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Estado</label>
                  <div className="font-medium">
                    <span className={adminInfo.active ? 'text-green-400' : 'text-red-400'}>
                      {adminInfo.active ? 'Administrador Activo' : 'Administrador Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg shadow-xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Tarifas</h2>

              <p className="text-sm text-gray-400 mb-6 text-center">
                Pagos que no estén definidos en la tabla usarán el algoritmo de cálculo de saldo automático
              </p>

              <div className="overflow-x-auto">
                {tarifasLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-blue-500"></div>
                    <span className="ml-3 text-gray-400">Cargando tarifas...</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-gray-600 bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-600 text-left py-3 px-4 font-bold text-gray-800 bg-gray-200">Definición</th>
                        <th className="border border-gray-600 text-left py-3 px-4 font-bold text-gray-800 bg-gray-200">Valor</th>
                        <th className="border border-gray-600 text-left py-3 px-4 font-bold text-gray-800 bg-gray-200">Valor cliente final</th>
                        <th className="border border-gray-600 text-left py-3 px-4 font-bold text-gray-800 bg-gray-200">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tarifas.map((tarifa, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-600 py-3 px-4 text-gray-800 font-bold">{tarifa.definicion}</td>
                          <td className="border border-gray-600 py-3 px-4 text-gray-800 font-semibold">{tarifa.valor}</td>
                          <td className="border border-gray-600 py-3 px-4 text-gray-800 font-semibold">{tarifa.valorClienteFinal || tarifa.valor}</td>
                          <td className="border border-gray-600 py-3 px-4 text-gray-800 font-semibold">{tarifa.ganancia || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Simulador de Recarga */}
              <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Simulador de Recarga</h3>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label htmlFor="simuladorValor" className="block text-sm font-medium text-gray-300 mb-2">
                      Valor de recarga ($)
                    </label>
                    <input
                      type="text"
                      id="simuladorValor"
                      value={simuladorValor}
                      disabled={simulando}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value.length <= 12) {
                          setSimuladorValor(value ? `$${parseInt(value).toLocaleString('es-CO')}` : '');
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Ej: $5.000.000"
                    />
                  </div>

                  <button
                    onClick={simularRecarga}
                    disabled={simulando}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium flex items-center space-x-2"
                  >
                    {simulando ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Simulando...</span>
                      </>
                    ) : (
                      <span>Simular valor</span>
                    )}
                  </button>
                </div>

                {resultadoSimulacion && (
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
                    <h4 className="text-lg font-semibold text-white mb-3">Resultado de la Simulación</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400 text-sm">Tipo de recarga:</span>
                        <div className="text-white font-medium">{resultadoSimulacion.tipoRecarga}</div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Valor administrador:</span>
                        <div className="text-green-400 font-medium">{resultadoSimulacion.valorAdmin}</div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Valor cliente final:</span>
                        <div className="text-blue-400 font-medium">{resultadoSimulacion.valorCliente}</div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Ganancia:</span>
                        <div className="text-purple-400 font-medium">{resultadoSimulacion.ganancia}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
