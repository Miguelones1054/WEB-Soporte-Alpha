'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { humanizeNotificationError } from '../../../lib/humanizeNotificationError';
import {
  defaultOfferEndsAtLocal,
  datetimeLocalToIso,
  formatOfferEndsAt,
  isOfferExpired,
  toDatetimeLocalValue,
  type AdminOffer,
} from '../../../lib/ofertasShared';
import {
  OFFER_SCOPE_LABELS,
  formatOfferDiscount,
  type OfferDiscountType,
  type OfferScope,
} from '../../../lib/pricingShared';
import { RetroCheckbox, RetroLoadingOverlay } from '../../../components/retro';
import {
  RetroModal,
  RetroModalBanner,
  RetroModalForm,
  RetroModalField,
  RetroModalInput,
  RetroModalSelect,
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

const SCOPE_OPTIONS = (Object.entries(OFFER_SCOPE_LABELS) as [OfferScope, string][]).map(
  ([value, label]) => ({ value, label }),
);

const TYPE_OPTIONS: { value: OfferDiscountType; label: string }[] = [
  { value: 'percent', label: 'Porcentaje' },
  { value: 'fixed', label: 'Monto fijo (COP)' },
];

export function OfertasSectionContent() {
  const router = useRouter();
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<AdminOffer | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScope, setFormScope] = useState<OfferScope>('recarga');
  const [formType, setFormType] = useState<OfferDiscountType>('percent');
  const [formValue, setFormValue] = useState('20');
  const [formEndsAt, setFormEndsAt] = useState(defaultOfferEndsAtLocal);
  const [formActive, setFormActive] = useState(true);
  const [formAnnounce, setFormAnnounce] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
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

  const fetchOffers = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/owner/offers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al cargar ofertas');
      }
      const data = await response.json();
      setOffers(data.offers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchOffers();
  }, [fetchOffers]);

  const closeDetail = () => {
    setSelectedOffer(null);
    setShowDeleteModal(false);
    setShowActivateModal(false);
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormName('');
    setFormDescription('');
    setFormScope('recarga');
    setFormType('percent');
    setFormValue('20');
    setFormEndsAt(defaultOfferEndsAtLocal());
    setFormActive(true);
    setFormAnnounce(true);
    setShowFormModal(true);
  };

  const openEditModal = () => {
    if (!selectedOffer) return;
    setFormMode('edit');
    setFormName(selectedOffer.name);
    setFormDescription(selectedOffer.description);
    setFormScope(selectedOffer.scope);
    setFormType(selectedOffer.discount_type);
    setFormValue(String(selectedOffer.discount_value));
    setFormEndsAt(
      selectedOffer.ends_at
        ? toDatetimeLocalValue(selectedOffer.ends_at)
        : defaultOfferEndsAtLocal(),
    );
    setFormActive(selectedOffer.active);
    setFormAnnounce(false);
    setShowFormModal(true);
  };

  const parsedValue = parseInt(formValue.replace(/\D/g, ''), 10);

  const saveOffer = async (forceActive = false) => {
    const name = formName.trim();
    const description = formDescription.trim();
    const endsAtIso = datetimeLocalToIso(formEndsAt);
    if (!name || !description || Number.isNaN(parsedValue) || parsedValue <= 0 || !endsAtIso) {
      showResult('Completa nombre, descripción, descuento y fecha de fin', 'error');
      return;
    }
    if ((forceActive || formActive) && new Date(endsAtIso).getTime() <= Date.now()) {
      showResult('La fecha de fin de vigencia debe ser posterior a ahora', 'error');
      return;
    }

    const token = getToken();
    if (!token) return;

    const willActivate = forceActive || formActive;
    if (willActivate && !forceActive && offers.some((item) => item.active && item.id !== selectedOffer?.id)) {
      setShowActivateModal(true);
      return;
    }

    setSaving(true);
    try {
      const isEdit = formMode === 'edit' && selectedOffer;
      const url = isEdit
        ? `${API_BASE_URL}/admin/owner/offers/${selectedOffer.id}`
        : `${API_BASE_URL}/admin/owner/offers`;
      const payload: Record<string, unknown> = {
        name,
        description,
        scope: formScope,
        discount_type: formType,
        discount_value: parsedValue,
        ends_at: endsAtIso,
        active: willActivate,
      };
      if (!isEdit) payload.announce = formAnnounce;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo guardar la oferta');
      }

      setShowFormModal(false);
      setShowActivateModal(false);
      if (isEdit && data.offer) {
        setSelectedOffer(data.offer);
      } else {
        closeDetail();
      }
      await fetchOffers();
      const announced = data.announced ? ' Se inició el anuncio por FCM.' : '';
      showResult((data.message || 'Oferta guardada') + announced, 'success');
    } catch (err) {
      showResult(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async () => {
    if (!selectedOffer) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/owner/offers/${selectedOffer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo eliminar la oferta');
      }
      closeDetail();
      await fetchOffers();
      showResult(data.message || 'Oferta eliminada', 'success');
    } catch (err) {
      showResult(
        humanizeNotificationError(err instanceof Error ? err.message : 'Error de conexión'),
        'error',
      );
    } finally {
      setDeleting(false);
    }
  };

  const announceOffer = async () => {
    if (!selectedOffer) return;
    const token = getToken();
    if (!token) return;
    setProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/owner/offers/${selectedOffer.id}/announce`,
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
            typeof result.detail === 'string' ? result.detail : 'Error al anunciar oferta',
          ),
        );
      }
      showResult(
        result.message || 'Campaña FCM iniciada a Nequi, Bancolombia y Daviplata.',
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

  if (loading && offers.length === 0 && !error) {
    return <RetroLoadingOverlay message="Cargando ofertas..." />;
  }

  return (
    <>
      <div className="retro-plantillas retro-ofertas">
        <div className="retro-plantillas__header">
          <div>
            <h2 className="retro-plantillas__title">Ofertas y descuentos</h2>
            <p className="retro-plantillas__subtitle">
              Solo puede haber una oferta activa. Al vencer la fecha de fin, se apaga sola.
            </p>
          </div>
          <button
            type="button"
            className="retro-manager-btn retro-manager-btn--primary"
            onClick={openCreateModal}
          >
            Nueva oferta
          </button>
        </div>

        {error && <p className="retro-plantillas__error">{error}</p>}

        {loading ? (
          <RetroLoadingOverlay message="Cargando ofertas..." />
        ) : offers.length === 0 ? (
          <p className="retro-plantillas__empty">
            No hay ofertas. Crea la primera para aplicar un descuento y anunciarlo por FCM.
          </p>
        ) : (
          <div className="retro-plantillas__grid">
            {offers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                className={`retro-plantillas__card retro-ofertas__card${
                  offer.active ? ' retro-ofertas__card--active' : ''
                }${isOfferExpired(offer) ? ' retro-ofertas__card--expired' : ''}`}
                onClick={() => setSelectedOffer(offer)}
              >
                <strong className="retro-plantillas__card-title">{offer.name}</strong>
                <span className="retro-plantillas__card-desc">{offer.description}</span>
                <span className="retro-ofertas__meta">
                  {offer.scope_label || OFFER_SCOPE_LABELS[offer.scope]} · {formatOfferDiscount(offer)}
                  {offer.active ? ' · ACTIVA' : isOfferExpired(offer) ? ' · VENCIDA' : ''}
                </span>
                <span className="retro-ofertas__meta">
                  {isOfferExpired(offer) ? 'Venció' : 'Vence'} {formatOfferEndsAt(offer.ends_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <RetroModal
          open
          title={formMode === 'create' ? 'Nueva oferta' : 'Editar oferta'}
          onClose={() => !saving && setShowFormModal(false)}
          zIndex={Z_DETAIL}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="office/document"
        >
          <RetroModalBanner variant="info">
            El nombre y la descripción se usan también en la notificación FCM.
          </RetroModalBanner>

          <RetroModalForm>
            <RetroModalField label="Nombre" htmlFor="offerName">
              <RetroModalInput
                id="offerName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Recargas -20% fin de semana"
                maxLength={80}
                autoFocus
              />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor="offerDescription">
              <RetroModalTextarea
                id="offerDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Texto que verán los usuarios en el push..."
                maxLength={500}
                rows={4}
              />
            </RetroModalField>
            <RetroModalField label="Aplica a" htmlFor="offerScope">
              <RetroModalSelect
                id="offerScope"
                value={formScope}
                disabled={saving}
                onChange={(e) => setFormScope(e.target.value as OfferScope)}
              >
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </RetroModalSelect>
            </RetroModalField>
            <RetroModalField label="Tipo de descuento" htmlFor="offerType">
              <RetroModalSelect
                id="offerType"
                value={formType}
                disabled={saving}
                onChange={(e) => setFormType(e.target.value as OfferDiscountType)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </RetroModalSelect>
            </RetroModalField>
            <RetroModalField
              label={formType === 'percent' ? 'Porcentaje (1-90)' : 'Monto fijo (COP)'}
              htmlFor="offerValue"
            >
              <RetroModalInput
                id="offerValue"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={formType === 'percent' ? '20' : '5000'}
                maxLength={8}
              />
            </RetroModalField>
            <RetroModalField label="Fin de vigencia" htmlFor="offerEndsAt">
              <RetroModalInput
                id="offerEndsAt"
                type="datetime-local"
                value={formEndsAt}
                min={formMode === 'create' ? toDatetimeLocalValue(new Date()) : undefined}
                disabled={saving}
                onChange={(e) => setFormEndsAt(e.target.value)}
              />
            </RetroModalField>
            <RetroCheckbox
              label="Activar ahora (apaga la oferta actual)"
              checked={formActive}
              disabled={saving}
              onChange={(e) => setFormActive(e.target.checked)}
            />
            {formMode === 'create' && (
              <RetroCheckbox
                label="Anunciar por FCM al crear"
                checked={formAnnounce}
                disabled={saving}
                onChange={(e) => setFormAnnounce(e.target.checked)}
              />
            )}
          </RetroModalForm>

          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowFormModal(false)} disabled={saving}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn
              onClick={() => void saveOffer()}
              disabled={
                saving ||
                !formName.trim() ||
                !formDescription.trim() ||
                !formValue.trim() ||
                !formEndsAt.trim()
              }
            >
              {saving ? 'Guardando...' : formMode === 'create' ? 'Crear oferta' : 'Guardar cambios'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedOffer && !showDeleteModal && !showActivateModal && !showFormModal && (
        <RetroModal
          open
          title={selectedOffer.name}
          onClose={closeDetail}
          zIndex={Z_DETAIL}
          width="lg"
          bodyClassName="retro-manager-modal__body"
          icon="office/document"
        >
          <RetroModalBanner variant={selectedOffer.active ? 'info' : 'warning'}>
            {selectedOffer.active
              ? 'Esta es la oferta activa. Tarifas, recargas y API ya usan este descuento.'
              : isOfferExpired(selectedOffer)
                ? 'Esta oferta ya venció y se apagó sola. Edítala con una fecha nueva para reactivarla.'
                : 'Oferta inactiva. Actívala para que aplique al simulador y a las recargas.'}
          </RetroModalBanner>
          <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
            <RetroModalText muted>{selectedOffer.description}</RetroModalText>
            <RetroModalText muted>
              Alcance: {selectedOffer.scope_label || OFFER_SCOPE_LABELS[selectedOffer.scope]} ·
              Descuento: {formatOfferDiscount(selectedOffer)}
            </RetroModalText>
            <RetroModalText muted>
              {isOfferExpired(selectedOffer) ? 'Venció' : 'Vence'}:{' '}
              {formatOfferEndsAt(selectedOffer.ends_at)}
            </RetroModalText>
          </div>
          <RetroModalActions center>
            <RetroModalBtn onClick={() => void announceOffer()} disabled={processing}>
              Anunciar por FCM
            </RetroModalBtn>
            <RetroModalBtn variant="secondary" onClick={openEditModal} disabled={processing}>
              Editar
            </RetroModalBtn>
            <RetroModalBtn
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={processing}
            >
              Eliminar
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {selectedOffer && showDeleteModal && (
        <RetroModal
          open
          title="Eliminar oferta"
          onClose={() => !deleting && setShowDeleteModal(false)}
          zIndex={Z_DETAIL + 10}
          width="sm"
          bodyClassName="retro-manager-modal__body"
        >
          <RetroModalText>
            ¿Seguro que quieres eliminar la oferta «{selectedOffer.name}»?
          </RetroModalText>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn variant="danger" onClick={() => void deleteOffer()} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {showActivateModal && (
        <RetroModal
          open
          title="Activar oferta"
          onClose={() => !saving && setShowActivateModal(false)}
          zIndex={Z_DETAIL + 10}
          width="sm"
          bodyClassName="retro-manager-modal__body"
        >
          <RetroModalText>
            Solo puede haber una oferta activa. Si continúas, se apaga la oferta actual.
          </RetroModalText>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowActivateModal(false)} disabled={saving}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn onClick={() => void saveOffer(true)} disabled={saving}>
              Activar esta y apagar la otra
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal
        open={processing || saving || deleting}
        message={
          deleting
            ? 'Eliminando oferta...'
            : saving
              ? 'Guardando oferta...'
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
