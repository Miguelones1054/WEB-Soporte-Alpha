import type { OfferDiscountType, OfferScope } from './pricingShared';

export interface AdminOffer {
  id: string;
  name: string;
  description: string;
  scope: OfferScope;
  scope_label?: string;
  discount_type: OfferDiscountType;
  discount_value: number;
  active: boolean;
  ends_at?: string | null;
  expired?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDatetimeLocalValue(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function defaultOfferEndsAtLocal(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(23, 59, 0, 0);
  return toDatetimeLocalValue(date);
}

export function datetimeLocalToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function formatOfferEndsAt(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha de fin';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin fecha de fin';
  return date.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function isOfferExpired(offer: Pick<AdminOffer, 'ends_at' | 'expired' | 'active'>): boolean {
  if (offer.expired) return true;
  if (!offer.ends_at) return false;
  const date = new Date(offer.ends_at);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}
