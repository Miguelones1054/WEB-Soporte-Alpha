'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/constants';
import {
  FALLBACK_PRICING_PACKAGES,
  FALLBACK_VIP_PRICE,
  type AdminPricingSnapshot,
  type AllAppsPricingSnapshot,
  type PricingApp,
  type PricingOffer,
  type PricingPackage,
} from '../lib/pricingShared';

function pickSnapshot(
  data: AllAppsPricingSnapshot,
  app: PricingApp,
): AdminPricingSnapshot | null {
  const nested = data.apps?.[app];
  if (nested && Array.isArray(nested.packages) && nested.packages.length === 4) {
    return nested;
  }
  if (data.app === app && Array.isArray(data.packages) && data.packages.length === 4) {
    return {
      app,
      packages: data.packages,
      vip: data.vip ?? FALLBACK_VIP_PRICE,
      offer: data.offer ?? null,
    };
  }
  if (!data.apps && Array.isArray(data.packages) && data.packages.length === 4) {
    return {
      app,
      packages: data.packages,
      vip: data.vip ?? FALLBACK_VIP_PRICE,
      offer: data.offer ?? null,
    };
  }
  return null;
}

export function useAdminPricing(app: PricingApp = 'nequi') {
  const [packages, setPackages] = useState<PricingPackage[]>(FALLBACK_PRICING_PACKAGES);
  const [vip, setVip] = useState(FALLBACK_VIP_PRICE);
  const [offer, setOffer] = useState<PricingOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/pricing?app=${encodeURIComponent(app)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return;
      const data = (await response.json()) as AllAppsPricingSnapshot;
      const snapshot = pickSnapshot(data, app);
      if (!snapshot) return;
      setPackages(snapshot.packages);
      if (snapshot.vip && typeof snapshot.vip.price_base === 'number') {
        setVip(snapshot.vip);
      }
      setOffer(snapshot.offer ?? null);
    } catch {
      // Fallback a los paquetes por defecto.
    } finally {
      setLoading(false);
    }
  }, [app]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { packages, vip, offer, loading, reload };
}
