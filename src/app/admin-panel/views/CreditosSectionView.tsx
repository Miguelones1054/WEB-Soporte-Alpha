'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { CreditosSectionContent } from '../creditos/CreditosSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function CreditosSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.creditos;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <CreditosSectionContent />
    </HubSectionPanel>
  );
}
