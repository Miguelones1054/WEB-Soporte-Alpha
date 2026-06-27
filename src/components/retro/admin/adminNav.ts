import type { RetroIconName } from '../../../assets/icons/win98/registry';
import { adminHubHref } from '../../../lib/adminHubSections';
import type { AdminHubSection } from '../../../lib/adminHubSections';

export interface RetroNavItem {
  href: string;
  label: string;
  icon?: RetroIconName;
  ownerOnly?: boolean;
  external?: boolean;
  section?: AdminHubSection;
}

export const MANAGER_NAV_ITEMS: RetroNavItem[] = [
  { href: adminHubHref('tarifas'), label: 'Tarifas', icon: 'files/briefcase', section: 'tarifas' },
  { href: adminHubHref('registros'), label: 'Registros', icon: 'office/appwizard_list', section: 'registros' },
  { href: adminHubHref('ganancias'), label: 'Ganancias', icon: 'office/bar_graph', section: 'ganancias' },
];

export const HUB_SIDEBAR_NAV: RetroNavItem[] = [
  { href: '/admin-panel', label: 'Panel principal', icon: 'navigation/homepage' },
  { href: adminHubHref('nequi'), label: 'Nequi', icon: 'navigation/program_manager', section: 'nequi' },
  {
    href: adminHubHref('bancolombia'),
    label: 'Bancolombia',
    icon: 'navigation/computer_explorer',
    section: 'bancolombia',
  },
  ...MANAGER_NAV_ITEMS,
  {
    href: adminHubHref('admin-gestion'),
    label: 'Gestionar administradores',
    icon: 'users/address_book_users',
    ownerOnly: true,
    section: 'admin-gestion',
  },
];

/** @deprecated Usar HUB_SIDEBAR_NAV */
export const HUB_OWNER_NAV_ITEMS: RetroNavItem[] = [
  { href: adminHubHref('admin-gestion'), label: 'Gestionar administradores', ownerOnly: true },
];
