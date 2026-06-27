export type AdminAppId = 'nequi' | 'bancolombia';

export const ADMIN_APP_IDS: AdminAppId[] = ['nequi', 'bancolombia'];

export {
  ADMIN_HUB_SECTIONS,
  adminHubHref,
  parseAdminHubSection,
  HUB_SECTION_META,
  hubSectionFromLegacyPath,
  type AdminHubSection,
} from './adminHubSections';

import { adminHubHref, parseAdminHubSection } from './adminHubSections';

export function parseAdminAppId(value: string | null | undefined): AdminAppId | null {
  const section = parseAdminHubSection(value, value);
  if (section === 'nequi' || section === 'bancolombia') return section;
  return null;
}

export function adminAppHref(app: AdminAppId): string {
  return adminHubHref(app);
}
