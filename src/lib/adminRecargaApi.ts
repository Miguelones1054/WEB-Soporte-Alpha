import { DARKLIVERY_API_BASE, API_BASE_URL } from './constants';

export type AdminRecargaEstado =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'
  | string;

export type AdminRecargaMetodo = 'NEQUI' | 'DAVIPLATA';

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
  telefono_nequi_cobro?: string;
  documento_tipo?: string;
  documento_numero?: string;
  otp_url?: string | null;
  otp_listo?: boolean;
  estado: AdminRecargaEstado;
  admin_id?: number;
  admin_email?: string;
  tipo?: string;
  metodo_pago?: string;
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
  documento_tipo?: string;
  documento_numero?: string;
  otp_url?: string | null;
  otp_listo?: boolean;
  metodo_pago?: string;
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
  metodo: AdminRecargaMetodo = 'NEQUI',
): string {
  if (estado === 'ERROR' && esAdminNequiClienteNoExiste(statusMessage ?? detail)) {
    return ADMIN_NEQUI_CLIENTE_NO_EXISTE_MENSAJE;
  }
  if (estado === 'DECLINED') {
    return metodo === 'DAVIPLATA'
      ? 'El pago fue rechazado en Daviplata'
      : 'El pago fue rechazado en Nequi';
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

export function validarDocumentoDaviplata(numero: string): boolean {
  const n = numero.trim().replace(/\D/g, '');
  return n.length >= 5 && n.length <= 15;
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
  params:
    | { valor: number; metodo: 'NEQUI'; nequi: string }
    | {
        valor: number;
        metodo: 'DAVIPLATA';
        documento_tipo: string;
        documento_numero: string;
      },
): Promise<AdminRecargaResponse> {
  const qs = new URLSearchParams({
    valor: String(params.valor),
    metodo: params.metodo,
  });
  if (params.metodo === 'NEQUI') {
    qs.set('nequi', params.nequi);
  } else {
    qs.set('documento_tipo', params.documento_tipo);
    qs.set('documento_numero', params.documento_numero);
  }
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

  // Si no se encuentra (404), asumimos que todavía se está procesando en el servidor
  if (res.status === 404) {
    return { estado: 'PENDING' };
  }

  return parseJsonResponse<AdminRecargaTransaccionResponse>(res);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ADMIN_RECARGA_POLL_MS = 3000;
