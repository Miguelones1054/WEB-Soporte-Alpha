'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { FacturacionSmsSectionContent } from '../reporte-facturacion-sms/FacturacionSmsSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function FacturacionSmsSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META['facturacion-sms'];
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <FacturacionSmsSectionContent />
    </HubSectionPanel>
  );
}
