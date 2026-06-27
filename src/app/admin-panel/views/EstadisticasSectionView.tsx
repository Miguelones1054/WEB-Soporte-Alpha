'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { EstadisticasSectionContent } from '../estadisticas/EstadisticasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function EstadisticasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.estadisticas;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <EstadisticasSectionContent />
    </HubSectionPanel>
  );
}
