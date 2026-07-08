'use client';

import { HUB_SECTION_META } from '../../../lib/adminHubSections';
import { PlantillasNotificacionesSectionContent } from '../plantillas-notificaciones/PlantillasNotificacionesSectionContent';
import { HubSectionPanel } from './HubSectionPanel';

export function PlantillasNotificacionesSectionView({ onClose }: { onClose?: () => void }) {
  const meta = HUB_SECTION_META['plantillas-notificaciones'];
  return (
    <HubSectionPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      <PlantillasNotificacionesSectionContent />
    </HubSectionPanel>
  );
}
