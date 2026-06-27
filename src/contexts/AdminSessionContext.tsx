'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAdminSession, type AdminInfo, type AdminUser } from '../hooks/useAdminSession';
import type { AdminBalanceDeduction } from '../lib/adminBalanceDeduction';

export interface AdminSessionContextValue {
  loading: boolean;
  adminInfo: AdminInfo | null;
  user: AdminUser | null;
  error: string | null;
  logout: () => void;
  refetch: () => Promise<AdminInfo | null>;
  syncBalanceFromDeduction: (deduction: AdminBalanceDeduction | null | undefined) => void;
  updateBalance: (newBalance: number) => void;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  children,
  documentTitle,
}: {
  children: ReactNode;
  documentTitle?: string;
}) {
  const session = useAdminSession({ documentTitle, redirectOnFail: true });

  return (
    <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>
  );
}

export function useAdminSessionContext(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSessionContext debe usarse dentro de AdminSessionProvider');
  }
  return ctx;
}

export function useOptionalAdminSessionContext(): AdminSessionContextValue | null {
  return useContext(AdminSessionContext);
}
