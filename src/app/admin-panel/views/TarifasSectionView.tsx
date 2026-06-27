'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { TarifasSectionContent } from '../tarifas/TarifasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function TarifasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.tarifas;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose} bodyClassName="p-0">
      <TarifasSectionContent />
    </HubSectionPanel>
  );
}
