'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroAlert, RetroLoadingOverlay, RetroWindow } from '../../../components/retro';
import {
  RetroModal,
  RetroManagerConfirmModal,
  RetroManagerProgressModal,
} from '../../../components/retro/admin';

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AjustesSectionContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [smsValor, setSmsValor] = useState<number | null>(null);
  const [smsValorVenta, setSmsValorVenta] = useState<number | null>(null);
  const [smsConfigurado, setSmsConfigurado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [inputValor, setInputValor] = useState('');
  const [inputValorVenta, setInputValorVenta] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const loadSmsConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/sms`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al cargar configuración');
      }

      const data = await response.json();
      setSmsConfigurado(Boolean(data.configurado));
      setSmsValor(typeof data.valor === 'number' ? data.valor : null);
      setSmsValorVenta(typeof data.valor_venta === 'number' ? data.valor_venta : null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSmsConfig();
  }, [loadSmsConfig]);

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
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/configuraciones/sms`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setErrorModalMessage(message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <RetroLoadingOverlay message="Cargando ajustes..." />;
  }

  return (
    <>
      <div className="retro-admin-container space-y-4">
        {error && <RetroAlert variant="error">{error}</RetroAlert>}

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

      <RetroManagerConfirmModal
        open={showSuccess}
        type="success"
        title="Guardado"
        message="La configuración del SMS se actualizó correctamente."
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

      <RetroManagerProgressModal open={saving} message="Guardando configuración SMS..." zIndex={130} />
    </>
  );
}
