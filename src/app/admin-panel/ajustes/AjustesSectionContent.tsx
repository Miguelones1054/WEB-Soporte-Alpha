'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { useOptionalAdminSessionContext } from '../../../contexts/AdminSessionContext';
import { RetroAlert, RetroCheckbox, RetroLoadingOverlay, RetroWindow } from '../../../components/retro';
import {
  FALLBACK_PRICING_PACKAGES,
  FALLBACK_VIP_PRICE,
  formatCop,
  PRICING_APP_LABELS,
  PRICING_APPS,
  type AllAppsPricingSnapshot,
  type PricingApp,
  type PricingPackage,
} from '../../../lib/pricingShared';
import {
  RetroModal,
  RetroManagerConfirmModal,
  RetroManagerProgressModal,
} from '../../../components/retro/admin';

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fallbackAppPricing(): Record<PricingApp, { packages: PricingPackage[]; vipPrice: number }> {
  const clone = () => FALLBACK_PRICING_PACKAGES.map((item) => ({ ...item }));
  return {
    nequi: { packages: clone(), vipPrice: FALLBACK_VIP_PRICE.price_base },
    bancolombia: { packages: clone(), vipPrice: FALLBACK_VIP_PRICE.price_base },
    daviplata: { packages: clone(), vipPrice: FALLBACK_VIP_PRICE.price_base },
  };
}

function snapshotToAppPricing(data: AllAppsPricingSnapshot) {
  const next = fallbackAppPricing();
  for (const app of PRICING_APPS) {
    const nested = data.apps?.[app];
    if (nested && Array.isArray(nested.packages) && nested.packages.length === 4) {
      next[app] = {
        packages: nested.packages,
        vipPrice: nested.vip?.price_base ?? next[app].vipPrice,
      };
    }
  }
  return next;
}

export function AjustesSectionContent() {
  const router = useRouter();
  const hubSession = useOptionalAdminSessionContext();
  const role = (hubSession?.adminInfo?.role || '').toLowerCase();
  const isOwner = role === 'owner';
  const [loading, setLoading] = useState(true);
  const [smsValor, setSmsValor] = useState<number | null>(null);
  const [smsValorVenta, setSmsValorVenta] = useState<number | null>(null);
  const [smsConfigurado, setSmsConfigurado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [byApp, setByApp] = useState(fallbackAppPricing);
  const [pricingApp, setPricingApp] = useState<PricingApp>('nequi');
  const packages = byApp[pricingApp].packages;
  const vipPrice = byApp[pricingApp].vipPrice;
  const [priceInputs, setPriceInputs] = useState<string[]>(
    FALLBACK_PRICING_PACKAGES.map((item) => String(item.price_base)),
  );
  const [vipInput, setVipInput] = useState(String(FALLBACK_VIP_PRICE.price_base));
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const [freeNames, setFreeNames] = useState(false);
  const [freeNamesSaving, setFreeNamesSaving] = useState(false);

  const [listaPhones, setListaPhones] = useState<string[]>([]);
  const [listaKeys, setListaKeys] = useState<string[]>([]);
  const [listaInputType, setListaInputType] = useState<'phone' | 'key'>('phone');
  const [listaInputValue, setListaInputValue] = useState('');
  const [listaSaving, setListaSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [inputValor, setInputValor] = useState('');
  const [inputValorVenta, setInputValorVenta] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('La configuración se actualizó correctamente.');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }

      if (role === 'partner') {
        setError('El rol partner no tiene acceso a Ajustes.');
        return;
      }

      const listaRes = await fetch(`${API_BASE_URL}/admin/configuraciones/lista-digna`, {
        headers,
      });
      if (!listaRes.ok) {
        const errorData = await listaRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar lista digna');
      }
      const listaData = await listaRes.json();
      setListaPhones(Array.isArray(listaData.phones) ? listaData.phones.map(String) : []);
      setListaKeys(Array.isArray(listaData.keys) ? listaData.keys.map(String) : []);

      if (!isOwner) {
        return;
      }

      const [smsRes, freeRes, pricingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/configuraciones/sms`, { headers }),
        fetch(`${API_BASE_URL}/admin/configuraciones/free-names`, { headers }),
        fetch(`${API_BASE_URL}/admin/pricing`, { headers }),
      ]);

      if (!smsRes.ok) {
        const errorData = await smsRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar configuración SMS');
      }

      const smsData = await smsRes.json();
      setSmsConfigurado(Boolean(smsData.configurado));
      setSmsValor(typeof smsData.valor === 'number' ? smsData.valor : null);
      setSmsValorVenta(typeof smsData.valor_venta === 'number' ? smsData.valor_venta : null);

      if (freeRes.ok) {
        const freeData = await freeRes.json();
        setFreeNames(Boolean(freeData.free_names));
      } else {
        const errorData = await freeRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar FREE NOMBRES');
      }

      if (pricingRes.ok) {
        const pricingData = (await pricingRes.json()) as AllAppsPricingSnapshot;
        setByApp(snapshotToAppPricing(pricingData));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isOwner, role, router]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const openPricingModal = () => {
    setPriceInputs(packages.map((item) => String(item.price_base)));
    setVipInput(String(vipPrice));
    setShowPricingModal(true);
  };

  const savePricing = async () => {
    const parsedPrices = priceInputs.map((value) => parseInt(value.replace(/\D/g, ''), 10));
    const parsedVip = parseInt(vipInput.replace(/\D/g, ''), 10);
    if (parsedPrices.some((value) => Number.isNaN(value) || value <= 0) || Number.isNaN(parsedVip) || parsedVip <= 0) {
      setErrorModalMessage('Todos los precios deben ser enteros positivos.');
      setShowErrorModal(true);
      return;
    }

    setSavingPricing(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/owner/pricing`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          app: pricingApp,
          packages: packages.map((item, index) => ({
            credits: item.credits,
            price: parsedPrices[index],
          })),
          vip_price: parsedVip,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudieron guardar los precios');
      }
      const data = (await response.json()) as AllAppsPricingSnapshot;
      if (Array.isArray(data.packages) && data.packages.length === 4) {
        setByApp((current) => ({
          ...current,
          [pricingApp]: {
            packages: data.packages ?? current[pricingApp].packages,
            vipPrice: data.vip?.price_base ?? current[pricingApp].vipPrice,
          },
        }));
      }
      setShowPricingModal(false);
      setSuccessMessage(`Precios de recarga y VIP actualizados para ${PRICING_APP_LABELS[pricingApp]}.`);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setSavingPricing(false);
    }
  };

  const openModal = () => {
    setInputValor(smsValor != null ? String(smsValor) : '');
    setInputValorVenta(smsValorVenta != null ? String(smsValorVenta) : '');
    setShowModal(true);
  };

  const saveSmsValor = async () => {
    const parsedCosto = parseInt(inputValor.replace(/\./g, '').replace(/\$/g, ''), 10);
    const parsedVenta = parseInt(inputValorVenta.replace(/\./g, '').replace(/\$/g, ''), 10);

    if (isNaN(parsedCosto) || parsedCosto <= 0) {
      setErrorModalMessage('Ingresa un costo por SMS entero y positivo.');
      setShowErrorModal(true);
      return;
    }

    if (isNaN(parsedVenta) || parsedVenta <= 0) {
      setErrorModalMessage('Ingresa un valor de venta por SMS entero y positivo.');
      setShowErrorModal(true);
      return;
    }

    setSaving(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/sms`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ valor: parsedCosto, valor_venta: parsedVenta }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo guardar la configuración del SMS');
      }

      const data = await response.json();
      setSmsValor(typeof data.valor === 'number' ? data.valor : parsedCosto);
      setSmsValorVenta(typeof data.valor_venta === 'number' ? data.valor_venta : parsedVenta);
      setSmsConfigurado(true);
      setShowModal(false);
      setSuccessMessage('La configuración del SMS se actualizó correctamente.');
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleFreeNames = async (next: boolean) => {
    const previous = freeNames;
    setFreeNames(next);
    setFreeNamesSaving(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/free-names`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ free_names: next }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo actualizar FREE NOMBRES');
      }

      const data = await response.json();
      setFreeNames(Boolean(data.free_names));
      setSuccessMessage(
        next
          ? 'FREE NOMBRES activado. Nombres abiertos con restricciones (IP CO, rate limit, last_login).'
          : 'FREE NOMBRES desactivado.'
      );
      setShowSuccess(true);
    } catch (err: unknown) {
      setFreeNames(previous);
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setFreeNamesSaving(false);
    }
  };

  const applyListaPayload = (data: { phones?: unknown; keys?: unknown }) => {
    setListaPhones(Array.isArray(data.phones) ? data.phones.map(String) : []);
    setListaKeys(Array.isArray(data.keys) ? data.keys.map(String) : []);
  };

  const addListaItem = async () => {
    const value = listaInputValue.trim();
    if (!value) {
      setErrorModalMessage(
        listaInputType === 'phone' ? 'Ingresa un número Nequi.' : 'Ingresa una llave BRE-B.'
      );
      setShowErrorModal(true);
      return;
    }

    setListaSaving(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/lista-digna`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: listaInputType, value }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo agregar a la lista digna');
      }
      const data = await response.json();
      applyListaPayload(data);
      setListaInputValue('');
      setSuccessMessage(
        listaInputType === 'phone'
          ? 'Número agregado a la lista digna.'
          : 'Llave agregada a la lista digna.'
      );
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setListaSaving(false);
    }
  };

  const removeListaItem = async (type: 'phone' | 'key', value: string) => {
    setListaSaving(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        router.push('/');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/lista-digna`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ type, value }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo eliminar de la lista digna');
      }
      const data = await response.json();
      applyListaPayload(data);
      setSuccessMessage(
        type === 'phone'
          ? 'Número eliminado de la lista digna.'
          : 'Llave eliminada de la lista digna.'
      );
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setListaSaving(false);
    }
  };

  if (loading) {
    return <RetroLoadingOverlay message="Cargando ajustes..." />;
  }

  return (
    <>
      <div className="retro-admin-container space-y-4">
        {error && <RetroAlert variant="error">{error}</RetroAlert>}

        {isOwner ? (
          <>
            <RetroWindow title="Configuración de SMS" fullWidth>
              <div className="space-y-3">
                <div className="retro-stat-grid">
                  <div className="retro-stat-card">
                    <p className="retro-stat-card__label">Costo por SMS</p>
                    <p className="retro-stat-card__value">
                      {smsConfigurado && smsValor != null ? formatCurrency(smsValor) : 'Sin configurar'}
                    </p>
                  </div>
                  <div className="retro-stat-card">
                    <p className="retro-stat-card__label">Valor de venta por SMS</p>
                    <p className="retro-stat-card__value">
                      {smsConfigurado && smsValorVenta != null
                        ? formatCurrency(smsValorVenta)
                        : 'Sin configurar'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="retro-manager-btn retro-manager-btn--primary"
                  onClick={openModal}
                >
                  {smsConfigurado ? 'Cambiar valores del SMS' : 'Definir valores del SMS'}
                </button>
              </div>
            </RetroWindow>

            <RetroWindow title="Precios de recarga y VIP" fullWidth>
              <div className="space-y-3">
                <div className="retro-plantillas__tabs" role="tablist" aria-label="App de precios">
                  {PRICING_APPS.map((app) => (
                    <button
                      key={app}
                      type="button"
                      role="tab"
                      aria-selected={pricingApp === app}
                      className={`retro-plantillas__tab${pricingApp === app ? ' retro-plantillas__tab--active' : ''}`}
                      disabled={showPricingModal || savingPricing}
                      onClick={() => setPricingApp(app)}
                    >
                      {PRICING_APP_LABELS[app]}
                    </button>
                  ))}
                </div>
                <div className="retro-stat-grid">
                  {packages.map((pkg) => (
                    <div key={pkg.credits} className="retro-stat-card">
                      <p className="retro-stat-card__label">
                        {pkg.tag_base} · {pkg.credits.toLocaleString('es-CO')} créditos
                      </p>
                      <p className="retro-stat-card__value">{formatCop(pkg.price_base)}</p>
                    </div>
                  ))}
                  <div className="retro-stat-card">
                    <p className="retro-stat-card__label">VIP</p>
                    <p className="retro-stat-card__value">{formatCop(vipPrice)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="retro-manager-btn retro-manager-btn--primary"
                  onClick={openPricingModal}
                >
                  Cambiar precios de {PRICING_APP_LABELS[pricingApp]}
                </button>
              </div>
            </RetroWindow>

            <RetroWindow title="FREE NOMBRES" fullWidth>
              <div className="space-y-3">
                <p className="text-sm opacity-80">
                  Si está activo, todos los usuarios pueden consultar nombres (Nequi, Bre-B, QR,
                  Bancolombia) sin VIP. Aplica IP Colombia, rate limit estricto y last_login ≤ 2h.
                </p>
                <RetroCheckbox
                  label={freeNames ? 'FREE NOMBRES activo' : 'FREE NOMBRES inactivo'}
                  checked={freeNames}
                  disabled={freeNamesSaving}
                  onChange={(e) => void toggleFreeNames(e.target.checked)}
                />
              </div>
            </RetroWindow>
          </>
        ) : null}

        <RetroWindow title="Lista digna" fullWidth>
          <div className="space-y-3">
            <p className="text-sm opacity-80">
              Números Nequi y llaves BRE-B prohibidos. Si un usuario intenta enviar a cualquiera
              de estos destinos en Nequi Alpha o Bancolombia Alpha, su cuenta se banea con:
              &quot;Incumpliste los terminos y condiciones de la app&quot;.
            </p>

            <div className="flex flex-wrap gap-2 items-end">
              <label className="block">
                <span className="retro-tarifas__simulator-field label">Tipo</span>
                <select
                  className="retro-manager-modal__input mt-1"
                  value={listaInputType}
                  disabled={listaSaving}
                  onChange={(e) => setListaInputType(e.target.value === 'key' ? 'key' : 'phone')}
                >
                  <option value="phone">Número Nequi</option>
                  <option value="key">Llave BRE-B</option>
                </select>
              </label>
              <label className="block flex-1 min-w-[180px]">
                <span className="retro-tarifas__simulator-field label">
                  {listaInputType === 'phone' ? 'Número (10 dígitos)' : 'Llave'}
                </span>
                <input
                  type="text"
                  value={listaInputValue}
                  disabled={listaSaving}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setListaInputValue(
                      listaInputType === 'phone' ? raw.replace(/\D/g, '').slice(0, 10) : raw
                    );
                  }}
                  className="retro-manager-modal__input w-full mt-1"
                  placeholder={listaInputType === 'phone' ? 'Ej. 3001234567' : 'Ej. mi_llave'}
                />
              </label>
              <button
                type="button"
                className="retro-manager-btn retro-manager-btn--primary"
                disabled={listaSaving || !listaInputValue.trim()}
                onClick={() => void addListaItem()}
              >
                Agregar
              </button>
            </div>

            <div className="retro-stat-grid">
              <div className="retro-stat-card">
                <p className="retro-stat-card__label">Números Nequi ({listaPhones.length})</p>
                {listaPhones.length === 0 ? (
                  <p className="text-sm opacity-70 mt-2">Sin números</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {listaPhones.map((phone) => (
                      <li key={phone} className="flex items-center justify-between gap-2 text-sm">
                        <span>{phone}</span>
                        <button
                          type="button"
                          className="retro-manager-btn"
                          disabled={listaSaving}
                          onClick={() => void removeListaItem('phone', phone)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="retro-stat-card">
                <p className="retro-stat-card__label">Llaves BRE-B ({listaKeys.length})</p>
                {listaKeys.length === 0 ? (
                  <p className="text-sm opacity-70 mt-2">Sin llaves</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {listaKeys.map((key) => (
                      <li key={key} className="flex items-center justify-between gap-2 text-sm">
                        <span>{key}</span>
                        <button
                          type="button"
                          className="retro-manager-btn"
                          disabled={listaSaving}
                          onClick={() => void removeListaItem('key', key)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </RetroWindow>
      </div>

      <RetroModal
        open={showModal}
        title="Valores del SMS"
        onClose={() => !saving && setShowModal(false)}
        zIndex={110}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="retro-tarifas__simulator-field label">Costo por SMS (COP)</span>
            <input
              type="text"
              value={inputValor}
              disabled={saving}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setInputValor(value);
              }}
              className="retro-manager-modal__input w-full mt-1"
              placeholder="Ej: 600"
            />
          </label>

          <label className="block">
            <span className="retro-tarifas__simulator-field label">Valor de venta por SMS (COP)</span>
            <input
              type="text"
              value={inputValorVenta}
              disabled={saving}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setInputValorVenta(value);
              }}
              className="retro-manager-modal__input w-full mt-1"
              placeholder="Ej: 800"
            />
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="retro-manager-btn"
              disabled={saving}
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="retro-manager-btn retro-manager-btn--primary"
              disabled={saving || !inputValor.trim() || !inputValorVenta.trim()}
              onClick={() => void saveSmsValor()}
            >
              Guardar
            </button>
          </div>
        </div>
      </RetroModal>

      <RetroModal
        open={showPricingModal}
        title={`Precios de recarga y VIP · ${PRICING_APP_LABELS[pricingApp]}`}
        onClose={() => !savingPricing && setShowPricingModal(false)}
        zIndex={110}
      >
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <label key={pkg.credits} className="block">
              <span className="retro-tarifas__simulator-field label">
                {pkg.credits.toLocaleString('es-CO')} créditos (tag {pkg.tag_base})
              </span>
              <input
                type="text"
                value={priceInputs[index] ?? ''}
                disabled={savingPricing}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setPriceInputs((current) => {
                    const next = [...current];
                    next[index] = value;
                    return next;
                  });
                }}
                className="retro-manager-modal__input w-full mt-1"
              />
            </label>
          ))}
          <label className="block">
            <span className="retro-tarifas__simulator-field label">Precio VIP (COP)</span>
            <input
              type="text"
              value={vipInput}
              disabled={savingPricing}
              onChange={(e) => setVipInput(e.target.value.replace(/[^0-9]/g, ''))}
              className="retro-manager-modal__input w-full mt-1"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="retro-manager-btn"
              disabled={savingPricing}
              onClick={() => setShowPricingModal(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="retro-manager-btn retro-manager-btn--primary"
              disabled={savingPricing}
              onClick={() => void savePricing()}
            >
              Guardar
            </button>
          </div>
        </div>
      </RetroModal>

      <RetroManagerConfirmModal
        open={showSuccess}
        type="success"
        title="Guardado"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
        zIndex={120}
      />

      <RetroManagerConfirmModal
        open={showErrorModal}
        type="error"
        title="Error"
        message={errorModalMessage}
        onClose={() => setShowErrorModal(false)}
        zIndex={120}
      />

      <RetroManagerProgressModal
        open={saving || freeNamesSaving || savingPricing}
        message={
          freeNamesSaving
            ? 'Actualizando FREE NOMBRES...'
            : savingPricing
              ? 'Guardando precios...'
              : 'Guardando configuración SMS...'
        }
        zIndex={130}
      />
    </>
  );
}
