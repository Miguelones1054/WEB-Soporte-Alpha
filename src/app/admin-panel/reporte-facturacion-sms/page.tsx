'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

export default function ReporteFacturacionSMS() {
  const router = useRouter();

  useEffect(() => {
    document.title = 'Nequi Admin - Facturación SMS';
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
          <h1 className="text-2xl font-bold text-white">Reporte de Facturación SMS</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-gray-300">
          <p className="text-white font-medium mb-2">Reporte desactivado</p>
          <p className="text-sm leading-relaxed">
            El endpoint que sumaba SMS recorriendo todos los usuarios fue eliminado para reducir costos de
            Firestore. Para un reporte similar sin barrer la colección, se puede mantener un total agregado en
            un documento de configuración o actualizarlo con Cloud Functions al cambiar el campo{' '}
            <code className="text-gray-400">sms</code>.
          </p>
          <p className="text-xs text-gray-500 mt-4">API: {API_BASE_URL}</p>
        </div>
      </main>
    </div>
  );
}
