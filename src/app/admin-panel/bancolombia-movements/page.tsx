'use client';

import { Suspense } from 'react';
import { RetroLoadingOverlay } from '../../../components/retro';
import { BancolombiaMovementsContent } from './BancolombiaMovementsContent';

export default function BancolombiaMovementsPage() {
  return (
    <Suspense fallback={<RetroLoadingOverlay message="Cargando movimientos..." />}>
      <BancolombiaMovementsContent />
    </Suspense>
  );
}
