'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AdminInfo } from '../../hooks/useAdminSession';
import { parseAdminHubSection, HUB_SECTION_META } from '../../lib/adminHubSections';
import { RetroHubLayout, RetroLoadingOverlay } from '../../components/retro';
import { AppHubHome } from './views/AppHubHome';
import { NequiAppView } from './views/NequiAppView';
import { BancolombiaAppView } from './views/BancolombiaAppView';
import { DaviplataAppView } from './views/DaviplataAppView';
import { GananciasSectionView } from './views/GananciasSectionView';
import { OwnerGananciasSectionView } from './views/OwnerGananciasSectionView';
import { EstadisticasSectionView } from './views/EstadisticasSectionView';
import { FacturacionSmsSectionView } from './views/FacturacionSmsSectionView';
import { RegistrosSectionView } from './views/RegistrosSectionView';
import { PaquetesSectionView } from './views/PaquetesSectionView';
import { TarifasSectionView } from './views/TarifasSectionView';
import { AdminGestionSectionView } from './views/AdminGestionSectionView';
import { AjustesSectionView } from './views/AjustesSectionView';
import { PlantillasNotificacionesSectionView } from './views/PlantillasNotificacionesSectionView';
import { EventosSectionView } from './views/EventosSectionView';

function AdminPanelRouter({ adminInfo }: { adminInfo: AdminInfo | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = parseAdminHubSection(
    searchParams.get('section'),
    searchParams.get('app'),
  );

  const goHome = () => {
    router.push('/admin-panel');
  };

  if (activeSection) {
    const meta = HUB_SECTION_META[activeSection];
    if (meta.ownerOnly && adminInfo?.role !== 'owner') {
      return <AppHubHome adminInfo={adminInfo} />;
    }

    switch (activeSection) {
      case 'nequi':
        return <NequiAppView adminInfo={adminInfo} onBack={goHome} />;
      case 'bancolombia':
        return <BancolombiaAppView adminInfo={adminInfo} onBack={goHome} />;
      case 'daviplata':
        return <DaviplataAppView adminInfo={adminInfo} onBack={goHome} />;
      case 'ganancias':
        return <GananciasSectionView onClose={goHome} />;
      case 'ganancias-admins':
        return <OwnerGananciasSectionView onClose={goHome} />;
      case 'estadisticas':
        return <EstadisticasSectionView onClose={goHome} />;
      case 'facturacion-sms':
        return <FacturacionSmsSectionView onClose={goHome} />;
      case 'registros':
        return <RegistrosSectionView onClose={goHome} />;
      case 'paquetes':
        return <PaquetesSectionView onClose={goHome} />;
      case 'tarifas':
        return <TarifasSectionView onClose={goHome} />;
      case 'ajustes':
        return <AjustesSectionView onClose={goHome} />;
      case 'admin-gestion':
        return <AdminGestionSectionView onClose={goHome} />;
      case 'plantillas-notificaciones':
        return <PlantillasNotificacionesSectionView onClose={goHome} />;
      case 'eventos':
        return <EventosSectionView onClose={goHome} />;
      default:
        break;
    }
  }

  return <AppHubHome adminInfo={adminInfo} />;
}

export default function AdminPanelPage() {
  return (
    <Suspense fallback={<RetroLoadingOverlay message="Cargando panel..." />}>
      <RetroHubLayout documentTitle="Administración Alpha">
        {({ adminInfo }) => <AdminPanelRouter adminInfo={adminInfo} />}
      </RetroHubLayout>
    </Suspense>
  );
}
