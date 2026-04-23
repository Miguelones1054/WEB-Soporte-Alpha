'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getTelegramRecargarPanelUrl } from '../../lib/constants';

interface AdminInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

/** Respuesta de GET /admin/operations */
interface AdminOperationRow {
  id?: string;
  operation_type: string;
  target_user: string;
  amount?: number;
  reason?: string;
  timestamp?: string;
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
  const [lastOperations, setLastOperations] = useState<AdminOperationRow[]>([]);
  const router = useRouter();

  const formatOpDate = (ts?: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    document.title = 'Admin Apps';

    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
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
          try {
            const opRes = await fetch(`${API_BASE_URL}/admin/operations?limit=5`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (opRes.ok) {
              const opJson = await opRes.json();
              const list = (opJson.operations as AdminOperationRow[] | undefined) || [];
              setLastOperations(list.slice(0, 5));
            }
          } catch (e) {
            console.error('Error cargando operaciones recientes:', e);
          }
        } else {
          localStorage.removeItem('admin_token');
          router.push('/');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-900">
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
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
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

      <main className="overflow-x-hidden p-3 sm:p-6">
        <div className="mx-auto w-full min-w-0 max-w-3xl px-2 py-6 text-center sm:px-6 sm:py-8">
          <div className="mb-6 flex w-full min-w-0 justify-center px-1 sm:mb-10 sm:px-0">
            <h1 className="title-app-select max-w-full px-1 text-2xl font-extrabold tracking-tight sm:text-4xl">
              Selecciona APP
            </h1>
          </div>

          {/* Dos columnas: sin scroll horizontal, tarjetas completas dentro del viewport */}
          <div className="mx-auto grid w-full min-w-0 max-w-2xl grid-cols-2 gap-2 sm:gap-6">
            <Link
              href="/admin-panel/nequi_manager"
              className="neon-border-nq group flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-1.5 py-2.5 min-[400px]:flex-row min-[400px]:gap-2 sm:gap-3 sm:px-4 sm:py-3"
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 min-[400px]:h-10 min-[400px]:w-10 sm:h-12 sm:w-12 md:h-14 md:w-14">
                <img
                  src="/nequi-logo.jpg"
                  alt="Nequi"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="max-w-full text-center text-[0.65rem] font-bold leading-tight text-white min-[400px]:whitespace-nowrap min-[400px]:text-left min-[400px]:text-sm sm:text-base md:text-lg">
                NQ ALPHA
              </span>
            </Link>

            <Link
              href="/admin-panel/bancolombia_manager"
              className="neon-border-bc group flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-1.5 py-2.5 min-[400px]:flex-row min-[400px]:gap-2 sm:gap-3 sm:px-4 sm:py-3"
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full p-0.5 ring-1 ring-white/15 min-[400px]:h-10 min-[400px]:w-10 sm:h-12 sm:w-12 md:h-14 md:w-14">
                <img
                  src="/bancolombia-logo.png"
                  alt="Bancolombia"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="max-w-full text-center text-[0.65rem] font-bold leading-tight text-white min-[400px]:whitespace-nowrap min-[400px]:text-left min-[400px]:text-sm sm:text-base md:text-lg">
                BC ALPHA
              </span>
            </Link>
          </div>

          <div className="mx-auto mt-24 w-full max-w-2xl space-y-4 px-1 sm:mt-32">
            <div className="mx-auto max-w-md">
              <div className="flex flex-col gap-1 rounded-lg border border-gray-700/60 bg-gray-800/30 px-4 py-3">
                <div className="flex min-h-[3.25rem] items-center justify-between gap-3">
                  <span className="shrink-0 text-sm leading-none text-gray-400">Fondos actuales</span>
                  <span className="min-w-0 break-words text-right text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
                    {adminInfo?.balance != null
                      ? `COP $${Number(adminInfo.balance).toLocaleString('es-CO')}`
                      : 'COP $0'}
                  </span>
                </div>
                <div className="flex justify-end">
                  <a
                    href={
                      adminInfo != null
                        ? getTelegramRecargarPanelUrl(adminInfo.id)
                        : '#'
                    }
                    onClick={adminInfo == null ? (e) => e.preventDefault() : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Recargar fondos
                  </a>
                </div>
              </div>
            </div>

            <div className="w-full">
              <h2 className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Últimas 5 operaciones
              </h2>
              <div className="overflow-x-auto rounded border border-gray-600/90 bg-gray-800/50 shadow-inner">
                <table className="w-full min-w-[32rem] border-collapse text-left font-mono text-[0.7rem] text-gray-200 sm:min-w-0 sm:text-xs">
                  <thead>
                    <tr className="border-b border-gray-600 bg-gray-800/80">
                      <th className="whitespace-nowrap border-r border-gray-600 px-2 py-1.5 font-semibold text-gray-300">
                        Fecha
                      </th>
                      <th className="whitespace-nowrap border-r border-gray-600 px-2 py-1.5 font-semibold text-gray-300">
                        Tipo
                      </th>
                      <th className="min-w-[5rem] border-r border-gray-600 px-2 py-1.5 font-semibold text-gray-300">
                        Usuario / destino
                      </th>
                      <th className="whitespace-nowrap border-r border-gray-600 px-2 py-1.5 text-right font-semibold text-gray-300">
                        Monto
                      </th>
                      <th className="px-2 py-1.5 font-semibold text-gray-300">Motivo / detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastOperations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border-t border-gray-600/60 px-2 py-3 text-center text-gray-500"
                        >
                          Aún no hay operaciones registradas
                        </td>
                      </tr>
                    ) : (
                      lastOperations.map((op, i) => (
                        <tr
                          key={op.id ?? `${op.timestamp ?? 'op'}-${i}`}
                          className={i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/30'}
                        >
                          <td className="whitespace-nowrap border-r border-t border-gray-600/60 px-2 py-1 text-gray-400">
                            {formatOpDate(op.timestamp)}
                          </td>
                          <td
                            className="max-w-[8rem] border-r border-t border-gray-600/60 px-2 py-1 align-top text-gray-200"
                            title={op.operation_type}
                          >
                            <span className="line-clamp-2 break-all">{op.operation_type || '—'}</span>
                          </td>
                          <td
                            className="max-w-[7rem] border-r border-t border-gray-600/60 px-2 py-1 align-top text-gray-300"
                            title={op.target_user}
                          >
                            <span className="line-clamp-2 break-all">{op.target_user || '—'}</span>
                          </td>
                          <td className="whitespace-nowrap border-r border-t border-gray-600/60 px-2 py-1 text-right tabular-nums text-gray-200">
                            {op.amount != null && op.amount !== 0
                              ? `COP $${Number(op.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
                              : '—'}
                          </td>
                          <td
                            className="max-w-[10rem] border-t border-gray-600/60 px-2 py-1 align-top text-gray-400"
                            title={op.reason}
                          >
                            <span className="line-clamp-2 break-words">
                              {op.reason?.trim() || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
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
                          `COP $${adminInfo.balance?.toLocaleString('es-CO') || '0'}`
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
                <Link
                  href="/admin-panel/admin-gestion"
                  onClick={toggleDrawer}
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
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
