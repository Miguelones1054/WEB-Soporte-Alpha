'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { humanizeNotificationError } from '../../../lib/humanizeNotificationError';
import {
  NOTIFICATION_TEMPLATE_APP_LABELS,
  type NotificationTemplate,
  type NotificationTemplateApp,
} from '../../../lib/notificationTemplatesShared';
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

export function PlantillasNotificacionesSectionContent() {
  const router = useRouter();
  const [activeApp, setActiveApp] = useState<NotificationTemplateApp>('nequi');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [showSendUserModal, setShowSendUserModal] = useState(false);
  const [sendUserTarget, setSendUserTarget] = useState('');

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

  const fetchTemplates = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/owner/notification-templates?app=${activeApp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al cargar plantillas');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [activeApp, router]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const closeDetail = () => {
    setSelectedTemplate(null);
    setShowSendUserModal(false);
    setSendUserTarget('');
    setShowDeleteModal(false);
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormTitle('');
    setFormDescription('');
    setShowFormModal(true);
  };

  const openEditModal = () => {
    if (!selectedTemplate) return;
    setFormMode('edit');
    setFormTitle(selectedTemplate.title);
    setFormDescription(selectedTemplate.description);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setShowFormModal(false);
  };

  const showResult = (message: string, type: 'success' | 'error') => {
    setConfirmMessage(message);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const saveTemplate = async () => {
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
      const isEdit = formMode === 'edit' && selectedTemplate;
      const url = isEdit
        ? `${API_BASE_URL}/admin/owner/notification-templates/${selectedTemplate.id}?app=${activeApp}`
        : `${API_BASE_URL}/admin/owner/notification-templates`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isEdit
            ? { title, description }
            : { app: activeApp, title, description },
        ),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo guardar la plantilla');
      }

      setShowFormModal(false);
      if (isEdit && data.template) {
        setSelectedTemplate(data.template);
      } else {
        closeDetail();
      }
      await fetchTemplates();
      showResult(data.message || 'Plantilla guardada correctamente', 'success');
    } catch (err) {
      showResult(err instanceof Error ? err.message : 'Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate) return;

    const token = getToken();
    if (!token) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/owner/notification-templates/${selectedTemplate.id}?app=${activeApp}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo eliminar la plantilla');
      }

      closeDetail();
      setShowDeleteModal(false);
      await fetchTemplates();
      showResult(data.message || 'Plantilla eliminada', 'success');
    } catch (err) {
      showResult(err instanceof Error ? err.message : 'Error de conexión', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const sendBroadcast = async () => {
    if (!selectedTemplate) return;

    const token = getToken();
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/apps/${activeApp}/broadcast-notification`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: selectedTemplate.title,
            body: selectedTemplate.description,
            action_url: null,
          }),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          humanizeNotificationError(
            typeof result.detail === 'string' ? result.detail : 'Error al enviar notificación global',
          ),
        );
      }

      closeDetail();
      showResult(
        result.message ||
          'Campaña iniciada. Los usuarios la recibirán en los próximos segundos.',
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

  const sendToUser = async () => {
    if (!selectedTemplate) return;

    const target = sendUserTarget.trim();
    if (!target) {
      showResult(
        activeApp === 'nequi'
          ? 'Ingresa el número de celular del usuario (10 dígitos)'
          : activeApp === 'daviplata'
            ? 'Ingresa el número de celular del usuario (10 dígitos)'
            : 'Ingresa el login del usuario',
        'error',
      );
      return;
    }

    if ((activeApp === 'nequi' || activeApp === 'daviplata') && !/^3\d{9}$/.test(target.replace(/\s/g, ''))) {
      showResult(
        activeApp === 'daviplata'
          ? 'Ingresa un número Daviplata válido de 10 dígitos'
          : `Ingresa un número ${NOTIFICATION_TEMPLATE_APP_LABELS[activeApp]} válido de 10 dígitos`,
        'error',
      );
      return;
    }

    const token = getToken();
    if (!token) return;

    setProcessing(true);
    try {
      let response: Response;

      if (activeApp === 'nequi') {
        response = await fetch(`${API_BASE_URL}/admin/send-user-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_phone: target.replace(/\s/g, ''),
            title: selectedTemplate.title,
            body: selectedTemplate.description,
          }),
        });
      } else if (activeApp === 'bancolombia') {
        response = await fetch(
          `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(target)}/notify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: selectedTemplate.title,
              body: selectedTemplate.description,
            }),
          },
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/daviplata/user/${encodeURIComponent(target.replace(/\s/g, ''))}/notify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: selectedTemplate.title,
              body: selectedTemplate.description,
            }),
          },
        );
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          humanizeNotificationError(
            typeof result.detail === 'string' ? result.detail : 'Error al enviar notificación',
          ),
        );
      }

      setShowSendUserModal(false);
      setSendUserTarget('');
      showResult(result.message || 'Notificación enviada correctamente', 'success');
    } catch (err) {
      showResult(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
        'error',
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading && templates.length === 0 && !error) {
    return <RetroLoadingOverlay message="Cargando plantillas..." />;
  }

  return (
    <>
      <div className="retro-plantillas">
        <div className="retro-plantillas__header">
          <div>
            <h2 className="retro-plantillas__title">Plantillas de notificaciones</h2>
            <p className="retro-plantillas__subtitle">
              Guarda títulos y descripciones reutilizables para enviar notificaciones a usuarios de{' '}
              {NOTIFICATION_TEMPLATE_APP_LABELS[activeApp]}.
            </p>
          </div>
          <button
            type="button"
            className="retro-manager-btn retro-manager-btn--primary"
            onClick={openCreateModal}
          >
            Nueva plantilla
          </button>
        </div>

        <div className="retro-plantillas__tabs">
          {(['nequi', 'bancolombia', 'daviplata'] as NotificationTemplateApp[]).map((app) => (
            <button
              key={app}
              type="button"
              className={`retro-plantillas__tab retro-plantillas__tab--${app}${
                activeApp === app ? ' retro-plantillas__tab--active' : ''
              }`}
              onClick={() => {
                setActiveApp(app);
                closeDetail();
              }}
            >
              {NOTIFICATION_TEMPLATE_APP_LABELS[app]}
            </button>
          ))}
        </div>

        {error && <p className="retro-plantillas__error">{error}</p>}

        {loading ? (
          <RetroLoadingOverlay message="Cargando plantillas..." />
        ) : templates.length === 0 ? (
          <p className="retro-plantillas__empty">
            No hay plantillas para {NOTIFICATION_TEMPLATE_APP_LABELS[activeApp]}. Crea la primera.
          </p>
        ) : (
          <div className="retro-plantillas__grid">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`retro-plantillas__card retro-plantillas__card--${activeApp}`}
                onClick={() => setSelectedTemplate(template)}
              >
                <strong className="retro-plantillas__card-title">{template.title}</strong>
                <span className="retro-plantillas__card-desc">{template.description}</span>
                <span className="retro-plantillas__card-cta">Pulsar para enviar o gestionar</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <RetroModal
          open
          title={formMode === 'create' ? 'Nueva plantilla' : 'Editar plantilla'}
          onClose={closeFormModal}
          zIndex={Z_DETAIL}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">
            Plantilla para {NOTIFICATION_TEMPLATE_APP_LABELS[activeApp]}
          </RetroModalBanner>

          <RetroModalForm>
            <RetroModalField label="Título" htmlFor="templateTitle">
              <RetroModalInput
                id="templateTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej: Mantenimiento programado"
                maxLength={120}
                autoFocus
              />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor="templateDescription">
              <RetroModalTextarea
                id="templateDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mensaje que verán los usuarios..."
                maxLength={500}
                rows={4}
              />
            </RetroModalField>
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={closeFormModal} disabled={saving}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn
              onClick={() => void saveTemplate()}
              disabled={saving || !formTitle.trim() || !formDescription.trim()}
            >
              {saving ? 'Guardando...' : formMode === 'create' ? 'Crear plantilla' : 'Guardar cambios'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedTemplate && !showSendUserModal && !showDeleteModal && (
        <RetroModal
          open
          title={selectedTemplate.title}
          onClose={closeDetail}
          zIndex={Z_DETAIL}
          width="lg"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">
            {NOTIFICATION_TEMPLATE_APP_LABELS[activeApp]}
          </RetroModalBanner>

          <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
            <RetroModalText muted>{selectedTemplate.description}</RetroModalText>
          </div>

          <RetroModalActions center>
            <RetroModalBtn onClick={() => void sendBroadcast()} disabled={processing}>
              Enviar a todos
            </RetroModalBtn>
            <RetroModalBtn variant="secondary" onClick={() => setShowSendUserModal(true)} disabled={processing}>
              Enviar a un usuario
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

      {selectedTemplate && showSendUserModal && (
        <RetroModal
          open
          title="Enviar a un usuario"
          onClose={() => {
            if (processing) return;
            setShowSendUserModal(false);
            setSendUserTarget('');
          }}
          zIndex={Z_DETAIL + 10}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalForm>
            <RetroModalField
              label={
                activeApp === 'nequi'
                  ? 'Número de celular (10 dígitos)'
                  : activeApp === 'daviplata'
                    ? 'Número de celular (10 dígitos)'
                    : 'Usuario login'
              }
              htmlFor="sendUserTarget"
            >
              <RetroModalInput
                id="sendUserTarget"
                value={sendUserTarget}
                onChange={(e) => {
                  const value = e.target.value;
                  if (activeApp === 'nequi' || activeApp === 'daviplata') {
                    setSendUserTarget(value.replace(/\D/g, '').slice(0, 10));
                  } else {
                    setSendUserTarget(value);
                  }
                }}
                placeholder={activeApp === 'nequi' || activeApp === 'daviplata' ? '3001234567' : 'usuario123'}
                autoFocus
              />
            </RetroModalField>
            <RetroModalText muted>
              Se enviará «{selectedTemplate.title}» a ese usuario.
            </RetroModalText>
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn
              variant="secondary"
              onClick={() => {
                setShowSendUserModal(false);
                setSendUserTarget('');
              }}
              disabled={processing}
            >
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn onClick={() => void sendToUser()} disabled={processing || !sendUserTarget.trim()}>
              Enviar
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedTemplate && showDeleteModal && (
        <RetroModal
          open
          title="Eliminar plantilla"
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
            ¿Seguro que quieres eliminar la plantilla «{selectedTemplate.title}»?
          </RetroModalText>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn variant="danger" onClick={() => void deleteTemplate()} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal
        open={processing || saving || deleting}
        message={
          deleting
            ? 'Eliminando plantilla...'
            : saving
              ? 'Guardando plantilla...'
              : 'Enviando notificación...'
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
