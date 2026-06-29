'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { humanizeNotificationError } from '../../../lib/humanizeNotificationError';
import { playRetroSound } from '../../../lib/retroSounds';
import { RetroModal } from './RetroModal';
import { RetroManagerProgressModal } from './RetroManagerProgressModal';
import { RetroManagerConfirmModal } from './RetroManagerConfirmModal';
import {
  RetroModalBanner,
  RetroModalForm,
  RetroModalField,
  RetroModalInput,
  RetroModalTextarea,
  RetroModalActions,
  RetroModalBtn,
} from './RetroManagerModalUI';

export type AppGlobalNotificationApp = 'nequi' | 'bancolombia';

export interface AppGlobalNotificationControlProps {
  app: AppGlobalNotificationApp;
  embedded?: boolean;
}

const APP_LABELS: Record<AppGlobalNotificationApp, string> = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
};

export function AppGlobalNotificationControl({
  app,
  embedded = true,
}: AppGlobalNotificationControlProps) {
  const router = useRouter();
  const appLabel = APP_LABELS[app];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'success' | 'error'>('success');

  const closeModal = () => {
    if (sending) return;
    setOpen(false);
    setTitle('');
    setBody('');
  };

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setConfirmMessage('Título y descripción son obligatorios');
      setConfirmType('error');
      setConfirmOpen(true);
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/apps/${app}/broadcast-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: trimmedTitle, body: trimmedBody }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          humanizeNotificationError(
            typeof result.detail === 'string' ? result.detail : 'Error al enviar notificación global',
          ),
        );
      }

      playRetroSound('success');
      setOpen(false);
      setTitle('');
      setBody('');
      setConfirmMessage(
        result.message ||
          'Campaña iniciada. Los usuarios la recibirán en los próximos segundos vía topic FCM.',
      );
      setConfirmType('success');
      setConfirmOpen(true);
    } catch (err) {
      setConfirmMessage(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
      );
      setConfirmType('error');
      setConfirmOpen(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="retro-app-manager__global-notify">
        <button
          type="button"
          className={
            embedded
              ? 'retro-app-manager__global-notify-btn'
              : 'w-full max-w-md mx-auto border border-amber-500/80 bg-amber-500/10 text-amber-200 py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-amber-500/20 transition-colors'
          }
          onClick={() => setOpen(true)}
        >
          Enviar notificación global
        </button>
      </div>

      {open && (
        <RetroModal
          open
          title={`Notificación global — ${appLabel}`}
          onClose={closeModal}
          zIndex={120}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">
            Se enviará a todos los dispositivos con {appLabel} instalada, vía topic FCM.
          </RetroModalBanner>

          <RetroModalForm>
            <RetroModalField label="Título de la notificación" htmlFor={`globalNotifyTitle-${app}`}>
              <RetroModalInput
                id={`globalNotifyTitle-${app}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Mantenimiento programado"
                maxLength={120}
                autoFocus
              />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor={`globalNotifyBody-${app}`}>
              <RetroModalTextarea
                id={`globalNotifyBody-${app}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mensaje que verán todos los usuarios..."
                maxLength={500}
                rows={4}
              />
            </RetroModalField>
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" block onClick={closeModal} disabled={sending}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn
              block
              onClick={() => void handleSend()}
              disabled={sending || !title.trim() || !body.trim()}
            >
              {sending ? 'Iniciando envío...' : 'Enviar a todos'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal open={sending} message="Iniciando campaña global..." />

      <RetroManagerConfirmModal
        open={confirmOpen}
        type={confirmType}
        message={confirmMessage}
        onClose={() => setConfirmOpen(false)}
        zIndex={130}
        title={confirmType === 'success' ? 'Notificación enviada' : 'Error'}
      />
    </>
  );
}
