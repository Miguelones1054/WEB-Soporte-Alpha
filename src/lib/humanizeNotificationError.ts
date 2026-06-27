export function parseApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(' ');
  }
  return fallback;
}

/** Mensaje legible para errores FCM / notify del backend. */
export function humanizeNotificationError(raw: string): string {
  const msg = raw.trim();

  if (
    msg.includes('Requested entity was not found') ||
    msg.includes('registration-token-not-registered') ||
    msg.includes('not a valid FCM registration token')
  ) {
    return 'No se pudo enviar la notificación: el token FCM del usuario es inválido o expiró. El usuario debe abrir la app en su dispositivo para registrar uno nuevo.';
  }

  if (msg.toLowerCase().includes('no tiene token fcm')) {
    return 'El usuario no tiene token FCM registrado. Debe iniciar sesión en la app al menos una vez.';
  }

  return msg.replace(/^Error enviando notificación:\s*/i, '') || msg;
}
