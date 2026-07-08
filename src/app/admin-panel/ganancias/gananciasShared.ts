export interface GananciaOperation {
  id: string;
  admin_email: string;
  admin_name: string;
  operation_type: string;
  target_user: string;
  amount: number;
  reason: string;
  timestamp: string;
  ganancia: number;
  valor_cliente: number;
  costo_admin: number;
  porcentaje: number;
}

export interface AdminGananciasSummary {
  email: string;
  name: string;
  role: string;
  porcentaje: number | null;
  total_historico: number;
  total_hoy: number;
  operaciones: number;
}

export const OPERATION_LABELS: Record<string, string> = {
  ADD_BALANCE: 'Recarga Nequi',
  ADD_BALANCE_BANCOLOMBIA: 'Recarga Bancolombia',
  ADD_BALANCE_BANCOLOMBIA_MANUAL: 'Recarga BC manual',
  CREATE_USER: 'Crear usuario Nequi',
  CREATE_USER_BANCOLOMBIA: 'Crear usuario BC',
  CREATE_TEST_USER: 'Usuario prueba Nequi',
  ADD_BALANCE_DAVIPLATA: 'Recarga Daviplata',
  ADD_BALANCE_DAVIPLATA_MANUAL: 'Recarga DV manual',
  CREATE_USER_DAVIPLATA: 'Crear usuario Daviplata',
  CREATE_TEST_USER_DAVIPLATA: 'Usuario prueba Daviplata',
  CREATE_TEST_USER_BANCOLOMBIA: 'Usuario prueba BC',
  ASSIGN_PROMO_NEQUI: 'Paquete Nequi',
  ASSIGN_PROMO_BANCOLOMBIA: 'Paquete Bancolombia',
  UPGRADE_VIP: 'Actualización VIP',
  ADD_SMS: 'Agregar SMS',
  ADD_SMS_BANCOLOMBIA: 'Agregar SMS BC',
};

export function getOperationLabel(type: string): string {
  return OPERATION_LABELS[type] || type;
}

export function formatGananciaCurrency(amount: number): string {
  return amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatGananciaDate(dateString: string): string {
  return new Date(dateString).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function gananciaOperationKey(op: GananciaOperation): string {
  return `${op.admin_email || 'unknown'}:${op.id}`;
}
