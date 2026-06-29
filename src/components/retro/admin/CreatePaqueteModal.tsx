'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroCheckbox } from '../RetroCheckbox';
import {
  RetroModal,
  RetroModalForm,
  RetroModalField,
  RetroModalInput,
  RetroModalTextarea,
  RetroModalActions,
  RetroModalBtn,
  RetroManagerProgressModal,
  RetroManagerConfirmModal,
} from './index';
import type { PromoApp, PromoPackage } from '../../../lib/promosShared';
import { promoAppLabel } from '../../../lib/promosShared';
import { playRetroSound } from '../../../lib/retroSounds';

export interface CreatePaqueteModalProps {
  open: boolean;
  app: PromoApp;
  onClose: () => void;
  onCreated?: () => void;
  promo?: PromoPackage | null;
}

export function CreatePaqueteModal({ open, app, onClose, onCreated, promo = null }: CreatePaqueteModalProps) {
  const isEditMode = Boolean(promo);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientValue, setClientValue] = useState('');
  const [saldo, setSaldo] = useState('');
  const [sms, setSms] = useState('');
  const [includesVip, setIncludesVip] = useState(false);
  const [vipIndefinite, setVipIndefinite] = useState(true);
  const [vipDurationDays, setVipDurationDays] = useState('30');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!open || !promo) return;
    setName(promo.name);
    setDescription(promo.description);
    setClientValue(String(Math.round(promo.client_value)));
    setSaldo(String(Math.round(promo.saldo)));
    setSms(String(promo.sms));
    setIncludesVip(Boolean(promo.includes_vip));
    setVipIndefinite(!promo.vip_duration_days);
    setVipDurationDays(promo.vip_duration_days ? String(promo.vip_duration_days) : '30');
  }, [open, promo]);

  const reset = () => {
    setName('');
    setDescription('');
    setClientValue('');
    setSaldo('');
    setSms('');
    setIncludesVip(false);
    setVipIndefinite(true);
    setVipDurationDays('30');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseAmount = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) {
      setErrorMessage('Nombre y descripción son obligatorios');
      setShowError(true);
      return;
    }

    const clientVal = parseAmount(clientValue);
    if (clientVal <= 0) {
      setErrorMessage('Ingrese un valor al cliente final válido');
      setShowError(true);
      return;
    }

    const saldoVal = parseAmount(saldo);
    const smsVal = parseInt(sms.replace(/\D/g, '') || '0', 10);
    const vip = app === 'nequi' && includesVip;

    if (saldoVal <= 0 && smsVal <= 0 && !vip) {
      setErrorMessage('El paquete debe incluir saldo, mensajes y/o VIP');
      setShowError(true);
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setErrorMessage('Sesión expirada');
        setShowError(true);
        return;
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        client_value: clientVal,
        saldo: saldoVal,
        sms: smsVal,
        includes_vip: vip,
        vip_duration_days: vip && !vipIndefinite ? parseInt(vipDurationDays || '0', 10) || null : null,
      };

      const response = await fetch(
        isEditMode && promo
          ? `${API_BASE_URL}/admin/promos/${promo.id}`
          : `${API_BASE_URL}/admin/promos`,
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(isEditMode ? payload : { app, ...payload }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || (isEditMode ? 'Error al actualizar paquete' : 'Error al crear paquete'));
      }

      onCreated?.();
      playRetroSound('success');
      handleClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error de conexión');
      setShowError(true);
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <RetroModal
        open
        title={isEditMode ? `Editar paquete — ${promoAppLabel(app)}` : `Crear paquete — ${promoAppLabel(app)}`}
        onClose={handleClose}
        zIndex={130}
        bodyClassName="retro-manager-modal__body"
      >
        <RetroModalForm>
          <RetroModalField label="Nombre del paquete" htmlFor="promoName">
            <RetroModalInput
              id="promoName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Promo VIP marzo"
              autoFocus
            />
          </RetroModalField>

          <RetroModalField label="Descripción de la promo" htmlFor="promoDesc">
            <RetroModalTextarea
              id="promoDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle para el equipo y clientes"
              rows={3}
            />
          </RetroModalField>

          <RetroModalField label="Valor al cliente final ($)" htmlFor="promoClientValue">
            <RetroModalInput
              id="promoClientValue"
              value={clientValue}
              onChange={(e) => setClientValue(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 100000"
              inputMode="numeric"
            />
          </RetroModalField>

          <RetroModalField label="Saldo incluido ($)" htmlFor="promoSaldo">
            <RetroModalInput
              id="promoSaldo"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </RetroModalField>

          <RetroModalField label="Mensajes incluidos" htmlFor="promoSms">
            <RetroModalInput
              id="promoSms"
              value={sms}
              onChange={(e) => setSms(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </RetroModalField>

          {app === 'nequi' && (
            <>
              <RetroCheckbox
                label="Incluye VIP"
                checked={includesVip}
                onChange={(e) => setIncludesVip(e.target.checked)}
              />

              {includesVip && (
                <>
                  <RetroCheckbox
                    label="Duración VIP indefinida"
                    checked={vipIndefinite}
                    onChange={(e) => setVipIndefinite(e.target.checked)}
                  />
                  {!vipIndefinite && (
                    <RetroModalField label="Duración VIP (días)" htmlFor="promoVipDays">
                      <RetroModalInput
                        id="promoVipDays"
                        value={vipDurationDays}
                        onChange={(e) => setVipDurationDays(e.target.value.replace(/\D/g, ''))}
                        placeholder="30"
                        inputMode="numeric"
                      />
                    </RetroModalField>
                  )}
                </>
              )}
            </>
          )}
        </RetroModalForm>

        <RetroModalActions>
          <RetroModalBtn variant="secondary" block onClick={handleClose}>
            Cancelar
          </RetroModalBtn>
          <RetroModalBtn block onClick={handleSubmit} disabled={processing}>
            {processing
              ? isEditMode
                ? 'Guardando...'
                : 'Creando...'
              : isEditMode
                ? 'Guardar cambios'
                : 'Crear paquete'}
          </RetroModalBtn>
        </RetroModalActions>
      </RetroModal>

      <RetroManagerProgressModal
        open={processing}
        message={isEditMode ? 'Guardando paquete...' : 'Creando paquete...'}
        zIndex={140}
      />

      <RetroManagerConfirmModal
        open={showError}
        type="error"
        message={errorMessage}
        title="Error"
        onClose={() => setShowError(false)}
      />
    </>
  );
}
