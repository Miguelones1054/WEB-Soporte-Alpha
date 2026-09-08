'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { useOptionalAdminSessionContext } from '../../../contexts/AdminSessionContext';
import { GananciasSectionContent } from '../ganancias/GananciasSectionContent';
import { OwnerGananciasSectionContent } from '../ganancias/OwnerGananciasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

/**
 * Sección unificada de Ganancias.
 * - Owner: vista completa de todos los administradores (resumen por admin,
 *   filtro y borrado de movimientos) — antes estaba en "Ganancias admins".
 * - Admin normal: sus propias ganancias.
 */
export function GananciasSectionView({ onClose }: { onClose?: () => void }) {
  const session = useOptionalAdminSessionContext();
  const isOwner = session?.adminInfo?.role === 'owner';
  const meta = HUB_SECTION_META.ganancias;
  const title = isOwner ? 'Ganancias — todos los administradores' : meta.title;

  return (
    <HubSectionPanel title={title} icon={meta.icon} onClose={onClose}>
      {isOwner ? <OwnerGananciasSectionContent /> : <GananciasSectionContent />}
    </HubSectionPanel>
  );
}
