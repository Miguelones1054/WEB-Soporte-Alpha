export type OfferScope = 'recarga' | 'sms' | 'vip' | 'all';
export type OfferDiscountType = 'percent' | 'fixed';
export type PricingApp = 'nequi' | 'bancolombia' | 'daviplata';

export const PRICING_APPS: PricingApp[] = ['nequi', 'bancolombia', 'daviplata'];

export const PRICING_APP_LABELS: Record<PricingApp, string> = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  daviplata: 'Daviplata',
};

export interface PricingPackage {
  credits: number;
  price_base: number;
  price_final: number;
  tag: string;
  tag_base: string;
}

export interface PricingOffer {
  id: string;
  name: string;
  description: string;
  scope: OfferScope;
  discount_type: OfferDiscountType;
  discount_value: number;
  ends_at?: string | null;
}

export interface AdminPricingSnapshot {
  app?: PricingApp;
  packages: PricingPackage[];
  vip: {
    price_base: number;
    price_final: number;
    description?: string;
    duration_days?: number;
  };
  offer: PricingOffer | null;
}

export interface AllAppsPricingSnapshot {
  apps?: Partial<Record<PricingApp, AdminPricingSnapshot>>;
  packages?: PricingPackage[];
  vip?: AdminPricingSnapshot['vip'];
  offer?: PricingOffer | null;
  app?: PricingApp;
}

export const FALLBACK_PRICING_PACKAGES: PricingPackage[] = [
  { credits: 1_200_000, price_base: 28_000, price_final: 28_000, tag: '28k', tag_base: '28k' },
  { credits: 2_600_000, price_base: 38_000, price_final: 38_000, tag: '38k', tag_base: '38k' },
  { credits: 5_000_000, price_base: 48_000, price_final: 48_000, tag: '48k', tag_base: '48k' },
  { credits: 10_000_000, price_base: 63_000, price_final: 63_000, tag: '63k', tag_base: '63k' },
];

export const FALLBACK_VIP_PRICE = { price_base: 50_000, price_final: 50_000 };

export function formatCop(amount: number): string {
  return `$${Number(amount || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCreditsLabel(credits: number): string {
  return Number(credits || 0).toLocaleString('es-CO');
}

export function formatOfferDiscount(offer: PricingOffer): string {
  if (offer.discount_type === 'percent') {
    return `${offer.discount_value}%`;
  }
  return formatCop(offer.discount_value);
}

export const OFFER_SCOPE_LABELS: Record<OfferScope, string> = {
  recarga: 'Recargas',
  sms: 'Mensajes',
  vip: 'VIP',
  all: 'Todas',
};
