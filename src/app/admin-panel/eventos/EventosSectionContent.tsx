'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { humanizeNotificationError } from '../../../lib/humanizeNotificationError';
import type { InboxEvent } from '../../../lib/inboxEventsShared';
import { RetroLoadingOverlay } from '../../../components/retro';
import {
  RetroModal,
  RetroModalBanner,
  RetroModalForm,
  RetroModalField,
  RetroModalInput,
  RetroModalText,
  RetroModalTextarea,
  RetroModalActions,
  RetroModalBtn,
  RetroManagerConfirmModal,
  RetroManagerProgressModal,
} from '../../../components/retro/admin';

const Z_DETAIL = 120;
const Z_PROGRESS = 140;
const Z_RESULT = 150;

type FormMode = 'create' | 'edit';

export function EventosSectionContent() {
  const router = useRouter();
  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<InboxEvent | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'success' | 'error'>('success');

  const getToken = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
      return null;
    }
    return token;
  };

  const showResult = (message: string, type: 'success' | 'error') => {
    setConfirmMessage(message);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const fetchEvents = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/owner/inbox-events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al cargar eventos');
      }

      const data = await response.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const closeDetail = () => {
    setSelectedEvent(null);
    setShowDeleteModal(false);
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormTitle('');
    setFormDescription('');
    setFormUrl('');
    setFormImageUrl('');
    setShowFormModal(true);
  };

  const openEditModal = () => {
    if (!selectedEvent) return;
    setFormMode('edit');
    setFormTitle(selectedEvent.title);
    setFormDescription(selectedEvent.description);
    setFormUrl(selectedEvent.url || '');
    setFormImageUrl(selectedEvent.url_image || '');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setShowFormModal(false);
  };

  const saveEvent = async () => {
    const title = formTitle.trim();
    const description = formDescription.trim();
    if (!title || !description) {
      showResult('Título y descripción son obligatorios', 'error');
      return;
    }

    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const isEdit = formMode === 'edit' && selectedEvent;
      const url = isEdit
        ? `${API_BASE_URL}/admin/owner/inbox-events/${selectedEvent.id}`
        : `${API_BASE_URL}/admin/owner/inbox-events`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          url: formUrl.trim() || null,
          url_image: formImageUrl.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo guardar el evento');
      }

      setShowFormModal(false);
      if (isEdit && data.event) {
        setSelectedEvent(data.event);
      } else {
        closeDetail();
      }
      await fetchEvents();
      showResult(data.message || 'Evento guardado correctamente', 'success');
    } catch (err) {
      showResult(humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;
    const token = getToken();
    if (!token) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/owner/inbox-events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo eliminar el evento');
      }

      closeDetail();
      await fetchEvents();
      showResult(data.message || 'Evento eliminado correctamente', 'success');
    } catch (err) {
      showResult(humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const announceEvent = async () => {
    if (!selectedEvent) return;
    const token = getToken();
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/owner/inbox-events/${selectedEvent.id}/announce`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          humanizeNotificationError(
            typeof result.detail === 'string' ? result.detail : 'Error al anunciar evento',
          ),
        );
      }

      closeDetail();
      showResult(
        result.message ||
          'Campaña iniciada. Los usuarios la recibirán en los próximos segundos vía topic FCM.',
        'success',
      );
    } catch (err) {
      showResult(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
        'error',
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading && events.length === 0 && !error) {
    return <RetroLoadingOverlay message="Cargando eventos..." />;
  }

  return (
    <>
      <div className="retro-plantillas retro-eventos">
        <div className="retro-plantillas__header">
          <div>
            <h2 className="retro-plantillas__title">Eventos del inbox</h2>
            <p className="retro-plantillas__subtitle">
              Gestiona los mensajes que aparecen en el buzón de Nequi y anúncialos por FCM.
            </p>
          </div>
          <button
            type="button"
            className="retro-manager-btn retro-manager-btn--primary"
            onClick={openCreateModal}
          >
            Nuevo evento
          </button>
        </div>

        {error && <p className="retro-plantillas__error">{error}</p>}

        {loading ? (
          <RetroLoadingOverlay message="Cargando eventos..." />
        ) : events.length === 0 ? (
          <p className="retro-plantillas__empty">
            No hay eventos en el inbox. Crea el primero para que aparezca en el buzón.
          </p>
        ) : (
          <div className="retro-plantillas__grid">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                className="retro-plantillas__card retro-eventos__card"
                onClick={() => setSelectedEvent(event)}
              >
                {event.url_image ? (
                  <img
                    src={event.url_image}
                    alt={event.title}
                    className="retro-eventos__thumb"
                  />
                ) : (
                  <div className="retro-eventos__thumb retro-eventos__thumb--placeholder" />
                )}
                <div className="retro-eventos__content">
                  <strong className="retro-plantillas__card-title">{event.title}</strong>
                  <span className="retro-plantillas__card-desc">{event.description}</span>
                  <span className="retro-eventos__meta">
                    {event.url ? 'Con enlace de acción' : 'Sin enlace de acción'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <RetroModal
          open
          title={formMode === 'create' ? 'Nuevo evento' : 'Editar evento'}
          onClose={closeFormModal}
          zIndex={Z_DETAIL}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">
            Este evento aparecerá en el buzón de Nequi.
          </RetroModalBanner>

          <RetroModalForm>
            <RetroModalField label="Título" htmlFor="eventTitle">
              <RetroModalInput
                id="eventTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej: Nueva actualización disponible"
                maxLength={120}
                autoFocus
              />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor="eventDescription">
              <RetroModalTextarea
                id="eventDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mensaje que verán los usuarios..."
                maxLength={500}
                rows={4}
              />
            </RetroModalField>
            <RetroModalField label="URL de acción (opcional)" htmlFor="eventUrl">
              <RetroModalInput
                id="eventUrl"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://ejemplo.com o ejemplo.com"
                maxLength={2048}
              />
            </RetroModalField>
            <RetroModalField label="URL de imagen (opcional)" htmlFor="eventImageUrl">
              <RetroModalInput
                id="eventImageUrl"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
                maxLength={2048}
              />
            </RetroModalField>
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={closeFormModal} disabled={saving}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn
              onClick={() => void saveEvent()}
              disabled={saving || !formTitle.trim() || !formDescription.trim()}
            >
              {saving ? 'Guardando...' : formMode === 'create' ? 'Crear evento' : 'Guardar cambios'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedEvent && !showDeleteModal && (
        <RetroModal
          open
          title={selectedEvent.title}
          onClose={closeDetail}
          zIndex={Z_DETAIL}
          width="lg"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">Mensaje del inbox de Nequi</RetroModalBanner>

          {selectedEvent.url_image ? (
            <div className="retro-eventos__preview-wrap">
              <img src={selectedEvent.url_image} alt={selectedEvent.title} className="retro-eventos__preview" />
            </div>
          ) : null}

          <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
            <RetroModalText muted>{selectedEvent.description}</RetroModalText>
            <RetroModalText muted>
              URL de acción: {selectedEvent.url ? selectedEvent.url : 'No configurada'}
            </RetroModalText>
          </div>

          <RetroModalActions center>
            <RetroModalBtn onClick={() => void announceEvent()} disabled={processing}>
              Anunciar por FCM
            </RetroModalBtn>
            <RetroModalBtn variant="secondary" onClick={openEditModal} disabled={processing}>
              Editar
            </RetroModalBtn>
            <RetroModalBtn variant="danger" onClick={() => setShowDeleteModal(true)} disabled={processing}>
              Eliminar
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedEvent && showDeleteModal && (
        <RetroModal
          open
          title="Eliminar evento"
          onClose={() => {
            if (deleting) return;
            setShowDeleteModal(false);
          }}
          zIndex={Z_DETAIL + 10}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalText>
            ¿Seguro que quieres eliminar el evento «{selectedEvent.title}» del inbox?
          </RetroModalText>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn variant="danger" onClick={() => void deleteEvent()} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal
        open={processing || saving || deleting}
        message={
          deleting
            ? 'Eliminando evento...'
            : saving
              ? 'Guardando evento...'
              : 'Iniciando campaña FCM...'
        }
        zIndex={Z_PROGRESS}
      />

      <RetroManagerConfirmModal
        open={confirmOpen}
        type={confirmType}
        message={confirmMessage}
        onClose={() => setConfirmOpen(false)}
        zIndex={Z_RESULT}
        title={confirmType === 'success' ? 'Listo' : 'Error'}
      />
    </>
  );
}
