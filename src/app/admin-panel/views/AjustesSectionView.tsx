'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { AjustesSectionContent } from '../ajustes/AjustesSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function AjustesSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.ajustes;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <AjustesSectionContent />
    </HubSectionPanel>
  );
}
