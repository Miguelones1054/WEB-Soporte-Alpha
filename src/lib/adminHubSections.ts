import type { RetroIconName } from '../assets/icons/win98/registry';

export const ADMIN_HUB_SECTIONS = [
  'nequi',
  'bancolombia',
  'tarifas',
  'estadisticas',
  'registros',
  'facturacion-sms',
  'ganancias',
  'ganancias-admins',
  'paquetes',
  'ajustes',
  'admin-gestion',
] as const;

export type AdminHubSection = (typeof ADMIN_HUB_SECTIONS)[number];

export const HUB_SECTION_META: Record<
  AdminHubSection,
  { title: string; icon: RetroIconName; ownerOnly?: boolean }
> = {
  nequi: { title: 'Nequi — Gestión de usuarios', icon: 'navigation/program_manager' },
  bancolombia: { title: 'Bancolombia — Gestión de usuarios', icon: 'navigation/computer_explorer' },
  tarifas: { title: 'Tarifas', icon: 'files/briefcase' },
  estadisticas: { title: 'Estadísticas', icon: 'office/chart1' },
  registros: { title: 'Registros de operaciones', icon: 'office/appwizard_list' },
  'facturacion-sms': { title: 'Facturación SMS', icon: 'office/document' },
  ganancias: { title: 'Ganancias del administrador', icon: 'office/bar_graph' },
  paquetes: { title: 'Paquetes', icon: 'misc/package' },
  'ganancias-admins': {
    title: 'Ganancias de administradores',
    icon: 'office/bar_graph',
    ownerOnly: true,
  },
  ajustes: { title: 'Ajustes del sistema', icon: 'system/settings_gear', ownerOnly: true },
  'admin-gestion': { title: 'Gestionar administradores', icon: 'users/address_book_users', ownerOnly: true },
};

/** Rutas legacy → sección del hub */
export const LEGACY_HUB_PATHS: Record<string, AdminHubSection> = {
  '/admin-panel/nequi_manager': 'nequi',
  '/admin-panel/bancolombia_manager': 'bancolombia',
  '/admin-panel/tarifas': 'tarifas',
  '/admin-panel/estadisticas': 'estadisticas',
  '/admin-panel/registros': 'registros',
  '/admin-panel/reporte-facturacion-sms': 'facturacion-sms',
  '/admin-panel/ganancias': 'ganancias',
  '/admin-panel/paquetes': 'paquetes',
  '/admin-panel/ganancias-admins': 'ganancias-admins',
  '/admin-panel/ajustes': 'ajustes',
  '/admin-panel/admin-gestion': 'admin-gestion',
};

export function isAdminHubSection(value: string | null | undefined): value is AdminHubSection {
  return ADMIN_HUB_SECTIONS.includes(value as AdminHubSection);
}

export function parseAdminHubSection(
  section: string | null | undefined,
  legacyApp?: string | null | undefined,
): AdminHubSection | null {
  const raw = section ?? legacyApp;
  if (!raw) return null;
  return isAdminHubSection(raw) ? raw : null;
}

export function adminHubHref(section: AdminHubSection): string {
  return `/admin-panel?section=${section}`;
}

export function hubSectionFromLegacyPath(pathname: string): AdminHubSection | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return LEGACY_HUB_PATHS[normalized] ?? null;
}
