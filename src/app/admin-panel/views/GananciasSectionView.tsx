'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { GananciasSectionContent } from '../ganancias/GananciasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function GananciasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.ganancias;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <GananciasSectionContent />
    </HubSectionPanel>
  );
}
