'use client';

import { Suspense } from 'react';
import { RetroLoadingOverlay } from '../../../components/retro';
import { UserMovementsContent } from './UserMovementsContent';

export default function UserMovementsPage() {
  return (
    <Suspense fallback={<RetroLoadingOverlay message="Cargando movimientos..." />}>
      <UserMovementsContent />
    </Suspense>
  );
}
