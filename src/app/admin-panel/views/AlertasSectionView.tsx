'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { AlertasSectionContent } from '../alertas/AlertasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function AlertasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.alertas;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <AlertasSectionContent />
    </HubSectionPanel>
  );
}
