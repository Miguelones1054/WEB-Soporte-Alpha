'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { OfertasSectionContent } from '../ofertas/OfertasSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function OfertasSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META.ofertas;
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <OfertasSectionContent />
    </HubSectionPanel>
  );
}
