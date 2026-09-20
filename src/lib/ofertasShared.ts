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
  created_at?: string | null;
  updated_at?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
}
