'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { AdminGestionSectionContent } from '../admin-gestion/AdminGestionSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function AdminGestionSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META['admin-gestion'];
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose} bodyClassName="p-0">
      <AdminGestionSectionContent />
    </HubSectionPanel>
  );
}
