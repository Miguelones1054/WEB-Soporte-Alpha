'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { PaquetesSectionContent } from '../paquetes/PaquetesSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function PaquetesSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.paquetes;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose} bodyClassName="p-0">
      <PaquetesSectionContent />
    </HubSectionPanel>
  );
}
