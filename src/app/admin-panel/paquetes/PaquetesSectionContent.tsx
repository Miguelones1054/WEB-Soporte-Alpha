'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import {
  applyAdminBalanceDeduction,
  extractAdminBalanceDeduction,
  type AdminBalanceDeduction,
} from '../../../lib/adminBalanceDeduction';
import {
  buildPromoIncludesSummary,
  formatPromoCurrency,
  promoAppLabel,
  type PromoPackage,
} from '../../../lib/promosShared';
import {
  generateRandomBancolombiaCredentials,
  generateRandomDaviplataCredentials,
  generateRandomNequiCredentials,
} from '../../../lib/randomUserFields';
import { RetroLoadingOverlay, RetroCheckbox, RetroIcon } from '../../../components/retro';
import {
  RetroModal,
  RetroModalBanner,
  RetroModalForm,
  RetroModalField,
  RetroModalInput,
  RetroModalText,
  RetroModalTextarea,
  RetroModalHighlight,
  RetroModalActions,
  RetroModalBtn,
  RetroModalMessagePanel,
  RetroManagerProgressModal,
  RetroManagerConfirmModal,
  RetroAdminBalanceModal,
  CreatePaqueteModal,
} from '../../../components/retro/admin';
import { useOptionalAdminSessionContext } from '../../../contexts/AdminSessionContext';
import type { PromoApp } from '../../../lib/promosShared';
import { humanizeNotificationError } from '../../../lib/humanizeNotificationError';

const Z_PROMO_DETAIL = 120;
const Z_PROMO_PROGRESS = 140;
const Z_PROMO_RESULT = 150;
const Z_PROMO_BALANCE = 160;

export function PaquetesSectionContent() {
  const router = useRouter();
  const hubSession = useOptionalAdminSessionContext();
  const [promos, setPromos] = useState<PromoPackage[]>([]);
  const [porcentaje, setPorcentaje] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<PromoPackage | null>(null);
  const [assignUser, setAssignUser] = useState('');
  const [assignPin, setAssignPin] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'success' | 'error'>('success');
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientShareMessage, setClientShareMessage] = useState('');
  const [clientShareIsNewUser, setClientShareIsNewUser] = useState(false);
  const [clientShareNotificationSent, setClientShareNotificationSent] = useState<boolean | null>(null);
  const [showClientShareModal, setShowClientShareModal] = useState(false);
  const [adminBalanceModalData, setAdminBalanceModalData] = useState<AdminBalanceDeduction | null>(null);
  const [showAppPickerModal, setShowAppPickerModal] = useState(false);
  const [createPromoApp, setCreatePromoApp] = useState<PromoApp | null>(null);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announcing, setAnnouncing] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoPackage | null>(null);
  const [showDeletePromoModal, setShowDeletePromoModal] = useState(false);
  const [deletingPromo, setDeletingPromo] = useState(false);

  const isOwner = hubSession?.adminInfo?.role === 'owner';

  const fetchPromos = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/promos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al cargar paquetes');
      }

      const data = await response.json();
      setPromos(data.promos || []);
      setPorcentaje(data.porcentaje ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchPromos();
  }, [fetchPromos]);

  const openPromo = (promo: PromoPackage) => {
    setSelectedPromo(promo);
    setShowAssignForm(false);
    setAssignUser('');
    setAssignPin('');
    setIsNewUser(false);
  };

  const closeDetail = () => {
    setSelectedPromo(null);
    setShowAssignForm(false);
    setAssignUser('');
    setAssignPin('');
    setIsNewUser(false);
    setShowAnnounceModal(false);
    setAnnounceTitle('');
    setAnnounceBody('');
  };

  const openAnnounceModal = () => {
    if (!selectedPromo) return;
    setAnnounceTitle(selectedPromo.name);
    setAnnounceBody(selectedPromo.description);
    setShowAnnounceModal(true);
  };

  const handleAnnounce = async () => {
    if (!selectedPromo) return;

    const title = announceTitle.trim();
    const body = announceBody.trim();
    if (!title || !body) {
      setConfirmMessage('Título y descripción son obligatorios para anunciar');
      setConfirmType('error');
      setShowConfirm(true);
      return;
    }

    setAnnouncing(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/promos/${selectedPromo.id}/announce`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body }),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          humanizeNotificationError(
            typeof result.detail === 'string' ? result.detail : 'Error al enviar campaña',
          ),
        );
      }

      setShowAnnounceModal(false);
      setConfirmMessage(
        result.message ||
          'Campaña iniciada. Los usuarios la recibirán en los próximos segundos vía topic FCM.',
      );
      setConfirmType('success');
      setShowConfirm(true);
    } catch (err) {
      setConfirmMessage(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
      );
      setConfirmType('error');
      setShowConfirm(true);
    } finally {
      setAnnouncing(false);
    }
  };

  const closeResultAndDetail = () => {
    setShowConfirm(false);
    setShowClientShareModal(false);
    setClientShareMessage('');
    setClientShareIsNewUser(false);
    setClientShareNotificationSent(null);
    closeDetail();
  };

  const openEditPromo = (promo: PromoPackage) => {
    setEditingPromo(promo);
  };

  const handleDeletePromo = async () => {
    if (!selectedPromo) return;

    setDeletingPromo(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/promos/${selectedPromo.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || 'Error al eliminar paquete');
      }

      setShowDeletePromoModal(false);
      closeDetail();
      await fetchPromos();
      setConfirmMessage(result.message || 'Paquete eliminado correctamente');
      setConfirmType('success');
      setShowConfirm(true);
    } catch (err) {
      setConfirmMessage(err instanceof Error ? err.message : 'Error de conexión');
      setConfirmType('error');
      setShowConfirm(true);
    } finally {
      setDeletingPromo(false);
    }
  };

  const fillRandomAssignFields = () => {
    if (!selectedPromo) return;
    if (selectedPromo.app === 'nequi') {
      const { phone, pin } = generateRandomNequiCredentials();
      setAssignUser(phone);
      setAssignPin(pin);
    } else if (selectedPromo.app === 'daviplata') {
      const { phone, pin } = generateRandomDaviplataCredentials();
      setAssignUser(phone);
      setAssignPin(pin);
    } else {
      const { usuario, pin } = generateRandomBancolombiaCredentials();
      setAssignUser(usuario);
      setAssignPin(pin);
    }
  };

  const isPhonePromoApp =
    selectedPromo?.app === 'nequi' || selectedPromo?.app === 'daviplata';

  const handleAssign = async () => {
    if (!selectedPromo || !assignUser.trim()) {
      setConfirmMessage('Ingrese el usuario destino');
      setConfirmType('error');
      setShowConfirm(true);
      return;
    }

    if (isNewUser) {
      if (assignPin.length !== 4) {
        setConfirmMessage('El PIN debe tener 4 dígitos');
        setConfirmType('error');
        setShowConfirm(true);
        return;
      }
      if (isPhonePromoApp && assignUser.length !== 10) {
        setConfirmMessage('El número debe tener 10 dígitos');
        setConfirmType('error');
        setShowConfirm(true);
        return;
      }
      if (selectedPromo.app === 'daviplata' && !assignUser.startsWith('3')) {
        setConfirmMessage('El número Daviplata debe empezar por 3');
        setConfirmType('error');
        setShowConfirm(true);
        return;
      }
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/promos/${selectedPromo.id}/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user: assignUser.trim(),
          is_new_user: isNewUser,
          pin: isNewUser ? assignPin : undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || 'Error al asignar paquete');
      }

      const deduction = extractAdminBalanceDeduction(result);
      applyAdminBalanceDeduction(deduction, {
        syncGlobalBalance: hubSession?.syncBalanceFromDeduction,
      });
      if (deduction) setAdminBalanceModalData(deduction);


      if (typeof result.client_message === 'string' && result.client_message.trim()) {
        setClientShareMessage(result.client_message);
        setClientShareIsNewUser(Boolean(result.is_new_user));
        setClientShareNotificationSent(
          typeof result.notification_sent === 'boolean' ? result.notification_sent : null,
        );
        setShowClientShareModal(true);
      } else {
        const notifNote =
          result.notification_sent === true
            ? ' Notificación push enviada al usuario.'
            : result.notification_sent === false
              ? ' Sin notificación push (usuario sin token FCM).'
              : '';
        setConfirmMessage(
          `${result.message || 'Paquete asignado correctamente'}${notifNote}`,
        );
        setConfirmType('success');
        setShowConfirm(true);
      }
    } catch (err) {
      setConfirmMessage(err instanceof Error ? err.message : 'Error de conexión');
      setConfirmType('error');
      setShowConfirm(true);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <RetroLoadingOverlay message="Cargando paquetes..." />;
  }

  return (
    <div className="retro-paquetes">
      <div className="retro-paquetes__header">
        <div className="retro-paquetes__header-main">
          <h2 className="retro-paquetes__title">Paquetes disponibles</h2>
          <p className="retro-paquetes__subtitle">
            Promos creadas por el propietario. Tu porcentaje actual: {porcentaje ?? '—'}%
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            className="retro-manager-btn retro-manager-btn--primary retro-paquetes__create-btn"
            onClick={() => setShowAppPickerModal(true)}
          >
            Crear paquete
          </button>
        )}
      </div>

      {error && <p className="retro-paquetes__error">{error}</p>}

      {promos.length === 0 ? (
        <p className="retro-paquetes__empty">No hay paquetes disponibles</p>
      ) : (
        <div className="retro-paquetes__grid">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className={`retro-paquetes__card-wrap retro-paquetes__card-wrap--${promo.app}`}
            >
              <button
                type="button"
                className="retro-paquetes__card"
                onClick={() => openPromo(promo)}
              >
                <span className="retro-paquetes__card-app">{promoAppLabel(promo.app)}</span>
                <strong className="retro-paquetes__card-name">{promo.name}</strong>
                <span className="retro-paquetes__card-includes">{buildPromoIncludesSummary(promo)}</span>
                <div className="retro-paquetes__card-prices">
                  <span className="retro-paquetes__card-price">
                    <small>Valor cliente</small>
                    {formatPromoCurrency(promo.client_value)}
                  </span>
                  <span className="retro-paquetes__card-price retro-paquetes__card-price--admin">
                    <small>Tu costo</small>
                    {formatPromoCurrency(promo.admin_cost ?? 0)}
                  </span>
                </div>
                <span className="retro-paquetes__card-cta">Pulsar para ver y asignar</span>
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="retro-paquetes__card-edit"
                  aria-label={`Editar ${promo.name}`}
                  title="Editar paquete"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditPromo(promo);
                  }}
                >
                  <RetroIcon name="office/write_yellow" size={14} alt="" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAppPickerModal && (
        <RetroModal
          open
          title="Crear paquete"
          onClose={() => setShowAppPickerModal(false)}
          zIndex={Z_PROMO_DETAIL}
          bodyClassName="retro-manager-modal__body"
        >
          <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
            <RetroModalText muted>Selecciona la app para la que es este paquete:</RetroModalText>
          </div>
          <RetroModalActions center>
            <RetroModalBtn
              onClick={() => {
                setShowAppPickerModal(false);
                setCreatePromoApp('nequi');
              }}
            >
              Nequi
            </RetroModalBtn>
            <RetroModalBtn
              variant="secondary"
              onClick={() => {
                setShowAppPickerModal(false);
                setCreatePromoApp('bancolombia');
              }}
            >
              Bancolombia
            </RetroModalBtn>
            <RetroModalBtn
              variant="secondary"
              onClick={() => {
                setShowAppPickerModal(false);
                setCreatePromoApp('daviplata');
              }}
            >
              Daviplata
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {createPromoApp && (
        <CreatePaqueteModal
          open
          app={createPromoApp}
          onClose={() => setCreatePromoApp(null)}
          onCreated={() => void fetchPromos()}
        />
      )}

      {editingPromo && (
        <CreatePaqueteModal
          open
          app={editingPromo.app}
          promo={editingPromo}
          onClose={() => setEditingPromo(null)}
          onCreated={() => {
            setEditingPromo(null);
            void fetchPromos();
          }}
        />
      )}

      {selectedPromo && (
        <RetroModal
          open
          title={selectedPromo.name}
          onClose={closeDetail}
          zIndex={Z_PROMO_DETAIL}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
          <RetroModalBanner variant="info">
            {promoAppLabel(selectedPromo.app)} · {formatPromoCurrency(selectedPromo.client_value)} al cliente
          </RetroModalBanner>

          <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
            <RetroModalText muted>{selectedPromo.description}</RetroModalText>
            <RetroModalHighlight>{buildPromoIncludesSummary(selectedPromo)}</RetroModalHighlight>
            <RetroModalText>
              Tu costo admin: <strong>{formatPromoCurrency(selectedPromo.admin_cost ?? 0)}</strong>
              {selectedPromo.sms_cost_base != null && selectedPromo.sms_cost_base > 0 && (
                <>
                  {' '}
                  (incluye costo base SMS: {formatPromoCurrency(selectedPromo.sms_cost_base)})
                </>
              )}
            </RetroModalText>
          </div>

          {!showAssignForm ? (
            <RetroModalActions center>
              <RetroModalBtn onClick={() => setShowAssignForm(true)}>Asignar promo a un usuario</RetroModalBtn>
              {isOwner && (
                <>
                  <RetroModalBtn variant="secondary" onClick={openAnnounceModal}>
                    Anunciar
                  </RetroModalBtn>
                  <RetroModalBtn variant="danger" onClick={() => setShowDeletePromoModal(true)}>
                    Eliminar
                  </RetroModalBtn>
                </>
              )}
            </RetroModalActions>
          ) : (
            <>
              <RetroModalForm>
                <RetroCheckbox
                  label="Usuario nuevo (crear cuenta con este paquete)"
                  checked={isNewUser}
                  onChange={(e) => {
                    setIsNewUser(e.target.checked);
                    if (!e.target.checked) setAssignPin('');
                  }}
                />

                <RetroModalField
                  label={
                    isPhonePromoApp
                      ? isNewUser
                        ? 'Número del nuevo usuario (10 dígitos)'
                        : 'Número de usuario (10 dígitos)'
                      : isNewUser
                        ? 'Login del nuevo usuario'
                        : 'Usuario login'
                  }
                  htmlFor="assignPromoUser"
                >
                  <RetroModalInput
                    id="assignPromoUser"
                    value={assignUser}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isPhonePromoApp) {
                        setAssignUser(value.replace(/\D/g, '').slice(0, 10));
                      } else {
                        setAssignUser(value);
                      }
                    }}
                    placeholder={isPhonePromoApp ? '3000000000' : 'usuario123'}
                    autoFocus
                  />
                </RetroModalField>

                {isNewUser && (
                  <RetroModalField label="PIN de acceso (4 dígitos)" htmlFor="assignPromoPin">
                    <RetroModalInput
                      id="assignPromoPin"
                      value={assignPin}
                      onChange={(e) => setAssignPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="1234"
                      inputMode="numeric"
                      maxLength={4}
                    />
                  </RetroModalField>
                )}

                {isNewUser && (
                  <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
                    <RetroModalBtn type="button" variant="secondary" onClick={fillRandomAssignFields}>
                      Generar aleatorio
                    </RetroModalBtn>
                  </div>
                )}
              </RetroModalForm>
              <RetroModalActions>
                <RetroModalBtn
                  variant="secondary"
                  block
                  onClick={() => {
                    setShowAssignForm(false);
                    setIsNewUser(false);
                    setAssignPin('');
                  }}
                >
                  Volver
                </RetroModalBtn>
                <RetroModalBtn
                  block
                  onClick={handleAssign}
                  disabled={
                    processing ||
                    !assignUser.trim() ||
                    (isNewUser && assignPin.length !== 4)
                  }
                >
                  {processing
                    ? isNewUser
                      ? 'Creando usuario...'
                      : 'Asignando...'
                    : isNewUser
                      ? 'Crear usuario con paquete'
                      : 'Confirmar asignación'}
                </RetroModalBtn>
              </RetroModalActions>
            </>
          )}
        </RetroModal>
      )}

      {showAnnounceModal && selectedPromo && (
        <RetroModal
          open
          title="Anunciar paquete"
          onClose={() => !announcing && setShowAnnounceModal(false)}
          zIndex={Z_PROMO_DETAIL + 10}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_information"
        >
          <RetroModalBanner variant="info">
            Campaña masiva por topic FCM: 1 petición para todos los usuarios (escala a 100k+).
            La sincronización corre en segundo plano; el panel responde al instante.
          </RetroModalBanner>

          <RetroModalForm>
            <RetroModalField label="Título de la notificación" htmlFor="announcePromoTitle">
              <RetroModalInput
                id="announcePromoTitle"
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
                maxLength={120}
                autoFocus
              />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor="announcePromoBody">
              <RetroModalTextarea
                id="announcePromoBody"
                value={announceBody}
                onChange={(e) => setAnnounceBody(e.target.value)}
                rows={4}
                maxLength={500}
              />
            </RetroModalField>
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn
              variant="secondary"
              block
              onClick={() => setShowAnnounceModal(false)}
              disabled={announcing}
            >
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn block onClick={() => void handleAnnounce()} disabled={announcing}>
              {announcing ? 'Iniciando campaña...' : 'Enviar a todos'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {showDeletePromoModal && selectedPromo && (
        <RetroModal
          open
          title="Eliminar paquete"
          onClose={() => !deletingPromo && setShowDeletePromoModal(false)}
          zIndex={Z_PROMO_DETAIL + 10}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_warning"
        >
          <RetroModalText>
            ¿Eliminar el paquete <strong>{selectedPromo.name}</strong>?
          </RetroModalText>
          <RetroModalText muted>
            Dejará de aparecer para todos los administradores. Las asignaciones ya realizadas no se revierten.
          </RetroModalText>
          <RetroModalActions>
            <RetroModalBtn
              variant="secondary"
              block
              onClick={() => setShowDeletePromoModal(false)}
              disabled={deletingPromo}
            >
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn
              variant="danger"
              block
              onClick={() => void handleDeletePromo()}
              disabled={deletingPromo}
            >
              {deletingPromo ? 'Eliminando...' : 'Eliminar paquete'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal
        open={processing || announcing || deletingPromo}
        message={
          deletingPromo
            ? 'Eliminando paquete...'
            : announcing
              ? 'Iniciando campaña...'
              : isNewUser
                ? 'Creando usuario con paquete...'
                : 'Asignando paquete...'
        }
        zIndex={Z_PROMO_PROGRESS}
      />

      {showClientShareModal && (
        <RetroModal
          open
          title="Comparte este mensaje con el cliente"
          onClose={closeResultAndDetail}
          zIndex={Z_PROMO_RESULT}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
          <RetroModalBanner variant="success">
            {clientShareIsNewUser
              ? 'Usuario creado con paquete correctamente'
              : 'Paquete asignado correctamente'}
            {clientShareNotificationSent === true
              ? ' · Notificación push enviada'
              : clientShareNotificationSent === false
                ? ' · Sin push (sin token FCM)'
                : ''}
          </RetroModalBanner>
          <RetroModalMessagePanel copyText={clientShareMessage}>
            <pre>{clientShareMessage}</pre>
          </RetroModalMessagePanel>
          <RetroModalActions center>
            <RetroModalBtn onClick={closeResultAndDetail}>Cerrar</RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerConfirmModal
        open={showConfirm}
        type={confirmType}
        message={confirmMessage}
        onClose={() => {
          if (confirmType === 'success') {
            closeResultAndDetail();
          } else {
            setShowConfirm(false);
          }
        }}
        zIndex={Z_PROMO_RESULT}
      />

      <RetroAdminBalanceModal
        open={!!adminBalanceModalData}
        deduction={adminBalanceModalData}
        onClose={() => setAdminBalanceModalData(null)}
        zIndex={Z_PROMO_BALANCE}
      />
    </div>
  );
}
