'use client';

import { Suspense } from 'react';
import type { AdminInfo } from '../../../hooks/useAdminSession';
import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { RetroLoadingOverlay } from '../../../components/retro';
import { NequiManagerContent } from '../nequi_manager/NequiManagerContent';
import { HubSectionPanel } from './HubSectionPanel';

interface NequiAppViewProps {
  adminInfo: AdminInfo | null;
  onBack: () => void;
}

export function NequiAppView({ adminInfo, onBack }: NequiAppViewProps) {
  const meta = HUB_SECTION_META.nequi;

  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onBack} bodyClassName="retro-app-manager">
      <Suspense fallback={<RetroLoadingOverlay message="Cargando Nequi..." />}>
        <NequiManagerContent embedded adminInfo={adminInfo} onBackToHub={onBack} />
      </Suspense>
    </HubSectionPanel>
  );
}
