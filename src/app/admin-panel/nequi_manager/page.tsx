'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAppHref } from '../../../lib/adminApps';
import { RetroLoadingOverlay } from '../../../components/retro';

export default function NequiManagerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(adminAppHref('nequi'));
  }, [router]);

  return <RetroLoadingOverlay message="Abriendo Nequi..." />;
}
