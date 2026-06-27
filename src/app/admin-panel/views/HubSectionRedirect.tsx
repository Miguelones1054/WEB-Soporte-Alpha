'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminHubSection } from '../../../lib/adminHubSections';
import { adminHubHref } from '../../../lib/adminHubSections';
import { RetroLoadingOverlay } from '../../../components/retro';

export function HubSectionRedirect({
  section,
  message,
}: {
  section: AdminHubSection;
  message?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(adminHubHref(section));
  }, [router, section]);

  return <RetroLoadingOverlay message={message ?? 'Abriendo sección...'} />;
}
