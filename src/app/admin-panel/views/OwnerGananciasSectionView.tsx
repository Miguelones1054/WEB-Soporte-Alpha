'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { OwnerGananciasSectionContent } from '../ganancias/OwnerGananciasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function OwnerGananciasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META['ganancias-admins'];
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <OwnerGananciasSectionContent />
    </HubSectionPanel>
  );
}
