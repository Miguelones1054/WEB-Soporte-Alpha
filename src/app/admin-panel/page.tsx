'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../lib/constants';

interface AdminInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

const Shimmer = ({ className = 'h-4 w-20' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
);

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isNavigatingNequi, setIsNavigatingNequi] = useState(false);
  const [isNavigatingBancolombia, setIsNavigatingBancolombia] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.title = 'Admin Apps';

    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    const fetchAdmin = async () => {
      try {
        console.log('Verificando token en:', `${API_BASE_URL}/admin/me`);
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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
          localStorage.removeItem('admin_token');
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error de conexión con el servidor:', error);
        console.error('Asegúrate de que el servidor backend esté corriendo en:', API_BASE_URL);
        // Mostrar alerta en lugar de redirigir automáticamente
        alert(`Error de conexión con el servidor. Asegúrate de que el backend esté corriendo en ${API_BASE_URL}`);
        setLoading(false);
        // No redirigir automáticamente, dar oportunidad de arreglar el problema
        return;
      }

      setLoading(false);
    };

    fetchAdmin();

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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/');
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      // Cerrando drawer
      setIsAnimating(false);
      setTimeout(() => setIsDrawerOpen(false), 300); // Esperar a que termine la animación
    } else {
      // Abriendo drawer
      setIsDrawerOpen(true);
      // Pequeño delay para que el componente se monte antes de animar
      requestAnimationFrame(() => {
        setTimeout(() => setIsAnimating(true), 50);
      });
    }
  };

  const handleOpenNequi = async () => {
    setIsNavigatingNequi(true);
    try {
      await router.push('/admin-panel/nequi_manager');
    } catch (error) {
      console.error('Error al navegar a Nequi Manager:', error);
      setIsNavigatingNequi(false);
    }
  };

  const handleOpenBancolombia = () => {
    setIsNavigatingBancolombia(true);
    // Placeholder hasta que exista la vista de Bancolombia
    setTimeout(() => {
      alert('La vista de Bancolombia estará disponible próximamente.');
      setIsNavigatingBancolombia(false);
    }, 100);
  };

  const handleOpenAdminGestion = () => {
    router.push('/admin-panel/admin-gestion');
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
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Botón de Menú Desplegable */}
            <button
              onClick={toggleDrawer}
              className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-white rounded-lg"
              title="Abrir menú lateral"
            >
              <div className="flex flex-col space-y-1">
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
              </div>
            </button>

            {/* Título */}
            <h1 className="text-2xl font-bold text-white">
              {`Hola, ${user?.displayName || 'Admin'}`}
            </h1>
          </div>

          <div className="flex items-center space-x-4">

            <button
              onClick={() => setShowProfile(!showProfile)}
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10v1m0 8a2 2 0 11-4 0m4-8a2 2 0 10-4 0"
                />
              </svg>
            </button>
          </div>
        </div>

        {showProfile && (
          <div className="profile-popup absolute right-6 top-16 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-72 p-4 z-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {(user?.displayName || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{user?.displayName || 'Administrador'}</h3>
                <p className="text-gray-400 text-sm">{user?.email || 'admin@admin.com'}</p>
                <p className="text-gray-500 text-xs capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-300 space-y-1">
              <p>ID: {adminInfo?.id || 'N/A'}</p>
              <p>Estado: {adminInfo?.active ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        )}
      </header>

      <main className="p-6">
        <div className="max-w-3xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Selecciona app para continuar</h2>
          <p className="text-gray-400 text-center mb-8">Elige la aplicación que deseas gestionar.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={handleOpenNequi}
              disabled={isNavigatingNequi}
              className={`group relative bg-slate-800 hover:bg-slate-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center space-y-4 transition-all duration-200 ${
                isNavigatingNequi ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-16 h-16 flex items-center justify-center bg-slate-700 group-hover:bg-slate-600 rounded-full relative">
                {isNavigatingNequi ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                ) : (
                  <img
                    src="/nequi-logo.jpg"
                    alt="Nequi Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>
              <div className="text-center">
                <h3 className={`text-lg font-bold text-white transition-colors ${
                  isNavigatingNequi ? 'text-gray-400' : 'group-hover:text-gray-100'
                }`}>
                  {isNavigatingNequi ? 'Cargando...' : 'Nequi Alpha'}
                </h3>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl transition-opacity ${
                isNavigatingNequi ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}></div>
            </button>

            <button
              onClick={handleOpenBancolombia}
              disabled={isNavigatingBancolombia}
              className={`group relative bg-slate-800 hover:bg-slate-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center space-y-4 transition-all duration-200 ${
                isNavigatingBancolombia ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-16 h-16 flex items-center justify-center bg-slate-700 group-hover:bg-slate-600 rounded-full relative">
                {isNavigatingBancolombia ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                ) : (
                  <img
                    src="/bancolombia-logo.png"
                    alt="Bancolombia Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>
              <div className="text-center">
                <h3 className={`text-lg font-bold text-white transition-colors ${
                  isNavigatingBancolombia ? 'text-gray-400' : 'group-hover:text-gray-100'
                }`}>
                  {isNavigatingBancolombia ? 'Cargando...' : 'Bancolombia Alpha'}
                </h3>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl transition-opacity ${
                isNavigatingBancolombia ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}></div>
            </button>
          </div>
        </div>
      </main>

      {/* Drawer de Información del Admin */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay con efecto blur */}
          <div
            className={`fixed inset-0 backdrop-blur-xl backdrop-brightness-75 transition-opacity duration-200 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={toggleDrawer}
          />

          {/* Drawer */}
          <div className={`relative w-full max-w-md bg-gray-800/95 backdrop-blur-xl border-r border-gray-700/50 shadow-2xl transform transition-transform duration-200 ${
            isAnimating ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Header del Drawer */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{adminInfo?.name || 'Administrador'}</h2>
                  <p className="text-gray-400 text-sm">ID: {adminInfo?.id || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">{adminInfo?.email || 'admin@admin.com'}</p>
                  <p className="text-gray-500 text-xs capitalize">{adminInfo?.role || 'admin'}</p>
                  <p className={`text-xs font-medium ${adminInfo?.active ? 'text-green-400' : 'text-red-400'}`}>
                    {adminInfo?.active ? 'Administrador Activo' : 'Administrador Inactivo'}
                  </p>
                  {/* Información de Fondos */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-400 text-xs">Fondos actuales</div>
                      <div className="text-white font-semibold text-sm">
                        {loading || !adminInfo ? (
                          <Shimmer className="h-4 w-20" />
                        ) : (
                          `COP ${adminInfo.balance?.toLocaleString('es-CO') || '0'}`
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleDrawer}
                className="w-10 h-10 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Contenido del Drawer */}
            <div className="flex-1 overflow-y-auto">
              {adminInfo?.role === 'owner' && (
                <button
                  onClick={() => {
                    toggleDrawer();
                    handleOpenAdminGestion();
                  }}
                  className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <span>Gestionar administradores</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
