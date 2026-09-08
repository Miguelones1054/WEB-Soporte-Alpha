export type PromoApp = 'nequi' | 'bancolombia' | 'daviplata';

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
  if (app === 'nequi') return 'Nequi';
  if (app === 'bancolombia') return 'Bancolombia';
  return 'Daviplata';
}

export function buildPromoIncludesSummary(promo: Pick<
  PromoPackage,
  'app' | 'saldo' | 'sms' | 'includes_vip' | 'vip_duration_days'
>): string {
  const parts: string[] = [];
  if (promo.saldo > 0) parts.push(`${formatPromoCurrency(promo.saldo)} en saldo`);
  if (promo.sms > 0) parts.push(`${promo.sms} mensajes`);
  if (promo.includes_vip) {
    parts.push(
      promo.app === 'bancolombia' || promo.app === 'daviplata'
        ? 'VIP 1 mes'
        : promo.vip_duration_days
        ? `VIP ${promo.vip_duration_days} días`
        : 'VIP indefinido',
    );
  }
  return parts.length > 0 ? parts.join(' + ') : 'Sin beneficios configurados';
}
