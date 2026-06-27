'use client';

import { API_BASE_URL } from '../../../lib/constants';
import { RetroWindow } from '../../../components/retro';

export function EstadisticasSectionContent() {
  return (
    <div className="retro-admin-container max-w-2xl">
      <RetroWindow title="Vista desactivada" fullWidth>
        <p className="m-0 mb-2 font-bold">
          El endpoint de estadísticas globales fue retirado del backend.
        </p>
        <p className="m-0 text-[12px] leading-relaxed">
          Se eliminó para evitar lecturas masivas en Firestore (costo). Si necesitas métricas,
          conviene usar un contador en un documento (por ejemplo <code>counters/users</code>)
          actualizado por triggers o tareas puntuales.
        </p>
        <p className="m-0 mt-3 text-[11px]" style={{ color: 'var(--retro-muted)' }}>
          API: {API_BASE_URL}
        </p>
      </RetroWindow>
    </div>
  );
}
