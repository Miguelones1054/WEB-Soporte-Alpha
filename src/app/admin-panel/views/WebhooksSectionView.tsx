'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { WebhooksSectionContent } from '../webhooks/WebhooksSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function WebhooksSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.webhooks;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <WebhooksSectionContent />
    </HubSectionPanel>
  );
}
