import { DARKLIVERY_API_BASE } from './constants';

export type AdminRecargaEstado =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'
  | string;

export const ADMIN_RECARGA_ESTADOS_FINALES: AdminRecargaEstado[] = [
  'APPROVED',
  'DECLINED',
  'VOIDED',
  'ERROR',
];

export interface AdminRecargaResponse {
  referencia: string;
  transaccion_id: string;
  monto_pesos: number;
  saldo_acreditar: number;
  telefono_nequi_cobro: string;
  estado: AdminRecargaEstado;
  admin_id?: number;
  admin_email?: string;
  tipo?: string;
  status_message?: string;
  detail?: string;
}

export interface AdminRecargaTransaccionResponse {
  transaccion_id?: string;
  referencia?: string;
  estado: AdminRecargaEstado;
  status_message?: string;
  detail?: string;
  monto_pesos?: number;
  telefono_nequi?: string;
  new_balance?: number;
  previous_balance?: number;
  saldo_acreditar?: number;
}

export const ADMIN_NEQUI_CLIENTE_NO_EXISTE_MENSAJE =
  'El número de Nequi que ingresaste no existe. Usa tu Nequi real (10 dígitos, empieza por 3), no un número de Nequi Alpha.';

export function esAdminNequiClienteNoExiste(mensaje?: string): boolean {
  if (!mensaje?.trim()) return false;
  const norm = mensaje
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return norm.includes('cliente no existe');
}

export function mensajeErrorRecargaAdmin(
  estado: string,
  statusMessage?: string,
  detail?: string,
): string {
  if (estado === 'ERROR' && esAdminNequiClienteNoExiste(statusMessage ?? detail)) {
    return ADMIN_NEQUI_CLIENTE_NO_EXISTE_MENSAJE;
  }
  if (estado === 'DECLINED') {
    return 'El pago fue rechazado en Nequi';
  }
  if (statusMessage?.trim()) {
    return statusMessage.trim();
  }
  if (detail?.trim()) {
    return detail.trim();
  }
  return 'El cobro no se completó. Intenta de nuevo.';
}

export function validarNequiReal(numero: string): boolean {
  const n = numero.trim().replace(/\s/g, '');
  return /^3\d{9}$/.test(n);
}

export function formatCop(amount: number): string {
  return amount.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof (data as { detail?: unknown }).detail === 'string'
        ? (data as { detail: string }).detail
        : 'Error en la solicitud';
    if (res.status === 429) {
      const seg = res.headers.get('Retry-After');
      throw new Error(
        seg ? `Espera ${seg} segundos e intenta de nuevo` : 'Demasiadas solicitudes. Intenta en unos segundos',
      );
    }
    throw new Error(detail);
  }
  return data as T;
}

export async function ejecutarRecargaAdmin(
  adminToken: string,
  params: { valor: number; nequi: string },
): Promise<AdminRecargaResponse> {
  const qs = new URLSearchParams({
    valor: String(params.valor),
    nequi: params.nequi,
  });
  const res = await fetch(`${DARKLIVERY_API_BASE}/admin-alpha/recargar?${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return parseJsonResponse<AdminRecargaResponse>(res);
}

export async function fetchAdminRecargaTransaccion(
  adminToken: string,
  transaccionId: string,
): Promise<AdminRecargaTransaccionResponse> {
  const res = await fetch(`${DARKLIVERY_API_BASE}/admin-alpha/transaccion/${encodeURIComponent(transaccionId)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return parseJsonResponse<AdminRecargaTransaccionResponse>(res);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ADMIN_RECARGA_POLL_MS = 3000;
