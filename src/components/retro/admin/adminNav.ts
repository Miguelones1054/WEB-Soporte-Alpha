import type { RetroIconName } from '../../../assets/icons/win98/registry';
import { adminHubHref } from '../../../lib/adminHubSections';
import type { AdminHubSection } from '../../../lib/adminHubSections';

export interface RetroNavItem {
  href: string;
  label: string;
  icon?: RetroIconName;
  ownerOnly?: boolean;
  notForPartner?: boolean;
  external?: boolean;
  section?: AdminHubSection;
}

export const MANAGER_NAV_ITEMS: RetroNavItem[] = [
  { href: adminHubHref('tarifas'), label: 'Tarifas', icon: 'files/briefcase', section: 'tarifas' },
  { href: adminHubHref('paquetes'), label: 'Paquetes', icon: 'misc/package', section: 'paquetes' },
  { href: adminHubHref('registros'), label: 'Registros', icon: 'office/appwizard_list', section: 'registros' },
  { href: adminHubHref('ganancias'), label: 'Ganancias', icon: 'office/bar_graph', section: 'ganancias' },
];

export const HUB_SIDEBAR_NAV: RetroNavItem[] = [
  { href: '/admin-panel', label: 'Panel principal', icon: 'navigation/homepage' },
  ...MANAGER_NAV_ITEMS,
  {
    href: adminHubHref('estadisticas'),
    label: 'Estadísticas',
    icon: 'office/chart1',
    section: 'estadisticas',
    notForPartner: true,
  },
  {
    href: adminHubHref('ajustes'),
    label: 'Ajustes',
    icon: 'system/settings_gear',
    ownerOnly: true,
    section: 'ajustes',
  },
  {
    href: adminHubHref('admin-gestion'),
    label: 'Gestionar administradores',
    icon: 'users/address_book_users',
    ownerOnly: true,
    section: 'admin-gestion',
  },
  {
    href: adminHubHref('plantillas-notificaciones'),
    label: 'Plantillas notificaciones',
    icon: 'communication/msg_information',
    ownerOnly: true,
    section: 'plantillas-notificaciones',
  },
  {
    href: adminHubHref('eventos'),
    label: 'Eventos',
    icon: 'communication/envelope_closed',
    ownerOnly: true,
    section: 'eventos',
  },
  {
    href: adminHubHref('alertas'),
    label: 'Alertas',
    icon: 'communication/msg_warning',
    section: 'alertas',
    notForPartner: true,
  },
  {
    href: adminHubHref('api'),
    label: 'API',
    icon: 'security/key_world',
    section: 'api',
    notForPartner: true,
  },
];

/** @deprecated Usar HUB_SIDEBAR_NAV */
export const HUB_OWNER_NAV_ITEMS: RetroNavItem[] = [
  { href: adminHubHref('admin-gestion'), label: 'Gestionar administradores', ownerOnly: true },
];
