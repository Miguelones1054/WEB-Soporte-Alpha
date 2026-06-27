'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { RegistrosSectionContent } from '../registros/RegistrosSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function RegistrosSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.registros;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose} bodyClassName="p-0">
      <RegistrosSectionContent />
    </HubSectionPanel>
  );
}
