'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { EventosSectionContent } from '../eventos/EventosSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function EventosSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.eventos;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <EventosSectionContent />
    </HubSectionPanel>
  );
}
