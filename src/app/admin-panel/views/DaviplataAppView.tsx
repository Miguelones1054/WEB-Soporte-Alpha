'use client';

import type { AdminInfo } from '../../../hooks/useAdminSession';
import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { DaviplataManagerContent } from '../daviplata_manager/DaviplataManagerContent';
import { HubSectionPanel } from './HubSectionPanel';

interface DaviplataAppViewProps {
  adminInfo: AdminInfo | null;
  onBack: () => void;
}

export function DaviplataAppView({ adminInfo, onBack }: DaviplataAppViewProps) {
  const meta = HUB_SECTION_META.daviplata;

  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onBack} bodyClassName="retro-app-manager">
      <DaviplataManagerContent embedded adminInfo={adminInfo} onBackToHub={onBack} />
    </HubSectionPanel>
  );
}
