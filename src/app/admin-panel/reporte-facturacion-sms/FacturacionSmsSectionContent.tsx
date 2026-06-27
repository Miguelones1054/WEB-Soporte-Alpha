'use client';

import { API_BASE_URL } from '../../../lib/constants';
import { RetroWindow } from '../../../components/retro';

export function FacturacionSmsSectionContent() {
  return (
    <div className="retro-admin-container max-w-2xl">
      <RetroWindow title="Reporte desactivado" fullWidth>
        <p className="m-0 mb-2 font-bold">
          El endpoint que sumaba SMS recorriendo todos los usuarios fue eliminado.
        </p>
        <p className="m-0 text-[12px] leading-relaxed">
          Para un reporte similar sin barrer la colección, se puede mantener un total agregado en
          un documento de configuración o actualizarlo con Cloud Functions al cambiar el campo{' '}
          <code>sms</code>.
        </p>
        <p className="m-0 mt-3 text-[11px]" style={{ color: 'var(--retro-muted)' }}>
          API: {API_BASE_URL}
        </p>
      </RetroWindow>
    </div>
  );
}
