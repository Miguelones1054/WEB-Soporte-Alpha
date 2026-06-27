'use client';

import type { AdminInfo } from '../../../hooks/useAdminSession';
import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { BancolombiaManagerContent } from '../bancolombia_manager/BancolombiaManagerContent';
import { HubSectionPanel } from './HubSectionPanel';

interface BancolombiaAppViewProps {
  adminInfo: AdminInfo | null;
  onBack: () => void;
}

export function BancolombiaAppView({ adminInfo, onBack }: BancolombiaAppViewProps) {
  const meta = HUB_SECTION_META.bancolombia;

  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onBack} bodyClassName="retro-app-manager">
      <BancolombiaManagerContent embedded adminInfo={adminInfo} onBackToHub={onBack} />
    </HubSectionPanel>
  );
}
