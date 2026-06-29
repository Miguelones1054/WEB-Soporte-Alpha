export type PromoApp = 'nequi' | 'bancolombia';

export interface PromoPackage {
  id: string;
  app: PromoApp;
  name: string;
  description: string;
  client_value: number;
  saldo: number;
  sms: number;
  includes_vip: boolean;
  vip_duration_days: number | null;
  active: boolean;
  created_at?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
  admin_cost?: number;
  sms_cost_base?: number;
}

export function formatPromoCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

export function promoAppLabel(app: PromoApp): string {
  return app === 'nequi' ? 'Nequi' : 'Bancolombia';
}

export function buildPromoIncludesSummary(promo: Pick<
  PromoPackage,
  'saldo' | 'sms' | 'includes_vip' | 'vip_duration_days'
>): string {
  const parts: string[] = [];
  if (promo.saldo > 0) parts.push(`${formatPromoCurrency(promo.saldo)} en saldo`);
  if (promo.sms > 0) parts.push(`${promo.sms} mensajes`);
  if (promo.includes_vip) {
    parts.push(
      promo.vip_duration_days
        ? `VIP ${promo.vip_duration_days} días`
        : 'VIP indefinido',
    );
  }
  return parts.length > 0 ? parts.join(' + ') : 'Sin beneficios configurados';
}
