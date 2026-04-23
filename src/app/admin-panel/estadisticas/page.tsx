'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

export default function StatisticsPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = 'Nequi Admin - Estadísticas';
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
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

      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-gray-300">
          <p className="text-white font-medium mb-2">Vista desactivada</p>
          <p className="text-sm leading-relaxed">
            El endpoint de estadísticas globales fue retirado del backend para evitar lecturas masivas en
            Firestore (costo). Si necesitas métricas, conviene usar un contador en un documento (por ejemplo{' '}
            <code className="text-gray-400">counters/users</code>) actualizado por triggers o tareas puntuales.
          </p>
          <p className="text-xs text-gray-500 mt-4">API: {API_BASE_URL}</p>
        </div>
      </main>
    </div>
  );
}
