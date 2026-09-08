'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../lib/constants';
import type { AdminBalanceDeduction } from '../lib/adminBalanceDeduction';
import { clearAllSessionData, getAdminToken } from '../lib/sessionStorage';

export interface AdminInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
  porcentaje?: number | null;
  tope_deuda?: number | null;
}

export interface AdminUser {
  email: string;
  displayName: string;
  role: string;
}

interface UseAdminSessionOptions {
  documentTitle?: string;
  redirectOnFail?: boolean;
}

export function useAdminSession(options: UseAdminSessionOptions = {}) {
  const { documentTitle, redirectOnFail = true } = options;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAllSessionData();
    router.push('/');
  }, [router]);

  const refetch = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      if (redirectOnFail) router.push('/');
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        clearAllSessionData();
        if (redirectOnFail) router.push('/');
        setLoading(false);
        return null;
      }

      const adminData: AdminInfo = await response.json();
      setAdminInfo(adminData);
      setUser({
        email: adminData.email,
        displayName: adminData.name,
        role: adminData.role,
      });
      setError(null);
      return adminData;
    } catch (err) {
      console.error('Error de conexión con el servidor:', err);
      setError(`Error de conexión. Verifica el backend en ${API_BASE_URL}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [redirectOnFail, router]);

  const syncBalanceFromDeduction = useCallback((deduction: AdminBalanceDeduction | null | undefined) => {
    if (!deduction) return;
    setAdminInfo((prev) =>
      prev ? { ...prev, balance: deduction.new_balance } : prev,
    );
  }, []);

  const updateBalance = useCallback((newBalance: number) => {
    setAdminInfo((prev) => (prev ? { ...prev, balance: newBalance } : prev));
  }, []);

  useEffect(() => {
    if (documentTitle) document.title = documentTitle;
    void refetch();
  }, [documentTitle, refetch]);

  return {
    loading,
    adminInfo,
    user,
    error,
    logout,
    refetch,
    syncBalanceFromDeduction,
    updateBalance,
  };
}
