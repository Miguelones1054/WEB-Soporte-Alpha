'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { ApiSectionContent } from '../api/ApiSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function ApiSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.api;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <ApiSectionContent />
    </HubSectionPanel>
  );
}
