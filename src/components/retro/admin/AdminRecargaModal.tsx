'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RetroCheckbox } from '../RetroCheckbox';
import { RetroModal } from './RetroModal';
import { RetroManagerProgressModal } from './RetroManagerProgressModal';
import { RetroModalActions, RetroModalBtn } from './RetroManagerModalUI';
import { getAdminToken, getLastRecargaNequi, saveLastRecargaNequi } from '../../../lib/sessionStorage';
import {
  ADMIN_RECARGA_ESTADOS_FINALES,
  ADMIN_RECARGA_POLL_MS,
  ejecutarRecargaAdmin,
  fetchAdminRecargaTransaccion,
  formatCop,
  mensajeErrorRecargaAdmin,
  validarNequiReal,
} from '../../../lib/adminRecargaApi';

type RecargaStep = 'monto' | 'metodo' | 'nequi' | 'esperando' | 'exito' | 'error';

export interface AdminRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onRecargaExitosa?: (newBalance?: number) => void;
}

const MONTO_MIN = 10_000;
const MONTO_MAX = 10_000_000;

function formatNequiInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function AdminRecargaModal({ open, onClose, onRecargaExitosa }: AdminRecargaModalProps) {
  const [step, setStep] = useState<RecargaStep>('monto');
  const [monto, setMonto] = useState('');
  const [nequiSelected, setNequiSelected] = useState(false);
  const [nequiPhone, setNequiPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [transaccionId, setTransaccionId] = useState<string | null>(null);
  const [montoCobro, setMontoCobro] = useState(0);
  const [pollingMessage, setPollingMessage] = useState('Esperando confirmación del pago en Nequi…');
  const [successBalance, setSuccessBalance] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetFlow = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStep('monto');
    setMonto('');
    setNequiSelected(false);
    setNequiPhone('');
    setProcessing(false);
    setErrorMessage('');
    setTransaccionId(null);
    setMontoCobro(0);
    setPollingMessage('Esperando confirmación del pago en Nequi…');
    setSuccessBalance(null);
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onClose();
  }, [onClose, resetFlow]);

  useEffect(() => {
    if (!open) {
      resetFlow();
      return;
    }

    const savedNequi = getLastRecargaNequi();
    if (savedNequi) {
      setNequiPhone(formatNequiInput(savedNequi));
      setNequiSelected(true);
    }
  }, [open, resetFlow]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const parseMonto = (): number | null => {
    const raw = monto.trim().replace(/\./g, '').replace(/,/g, '');
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < MONTO_MIN || num > MONTO_MAX) return null;
    return num;
  };

  const handleContinuarMonto = () => {
    const num = parseMonto();
    if (num == null) {
      setErrorMessage(`Ingresa un monto entre $${formatCop(MONTO_MIN)} y $${formatCop(MONTO_MAX)} COP`);
      return;
    }
    setErrorMessage('');
    setStep('metodo');
  };

  const handleContinuarMetodo = () => {
    if (!nequiSelected) {
      setErrorMessage('Selecciona Nequi como método de pago');
      return;
    }
    setErrorMessage('');
    setStep('nequi');
  };

  const iniciarPolling = useCallback(
    (txId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      const poll = async () => {
        const token = getAdminToken();
        if (!token) return;

        try {
          const result = await fetchAdminRecargaTransaccion(token, txId);
          const estado = result.estado;

          if (estado === 'PENDING') {
            setPollingMessage('Confirma el cobro en tu app Nequi…');
            return;
          }

          if (ADMIN_RECARGA_ESTADOS_FINALES.includes(estado)) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setProcessing(false);

            if (estado === 'APPROVED') {
              const nuevoSaldo = result.new_balance;
              setSuccessBalance(nuevoSaldo ?? null);
              setStep('exito');
              if (nuevoSaldo != null) {
                onRecargaExitosa?.(nuevoSaldo);
              }
            } else {
              setErrorMessage(
                mensajeErrorRecargaAdmin(estado, result.status_message, result.detail),
              );
              setStep('error');
            }
          }
        } catch (err) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setProcessing(false);
          setErrorMessage(err instanceof Error ? err.message : 'Error al verificar el pago');
          setStep('error');
        }
      };

      void poll();
      pollRef.current = setInterval(() => void poll(), ADMIN_RECARGA_POLL_MS);
    },
    [onRecargaExitosa],
  );

  const handleIniciarCobro = async () => {
    const num = parseMonto();
    const nequi = nequiPhone.trim().replace(/\s/g, '');

    if (num == null) {
      setErrorMessage('Monto inválido');
      return;
    }
    if (!validarNequiReal(nequi)) {
      setErrorMessage('Ingresa un Nequi válido de 10 dígitos (empieza por 3)');
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setErrorMessage('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    setMontoCobro(num);
    saveLastRecargaNequi(nequi);

    try {
      const result = await ejecutarRecargaAdmin(token, { valor: num, nequi });

      if (result.estado === 'APPROVED') {
        setProcessing(false);
        try {
          const tx = await fetchAdminRecargaTransaccion(token, result.transaccion_id);
          if (tx.new_balance != null) {
            setSuccessBalance(tx.new_balance);
            onRecargaExitosa?.(tx.new_balance);
          } else {
            onRecargaExitosa?.();
          }
        } catch {
          onRecargaExitosa?.();
        }
        setStep('exito');
        return;
      }

      if (result.estado === 'DECLINED' || result.estado === 'VOIDED' || result.estado === 'ERROR') {
        setProcessing(false);
        setErrorMessage(
          mensajeErrorRecargaAdmin(result.estado, result.status_message, result.detail),
        );
        setStep('error');
        return;
      }

      setTransaccionId(result.transaccion_id);
      setStep('esperando');
      iniciarPolling(result.transaccion_id);
    } catch (err) {
      setProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo crear el cobro');
      setStep('error');
    }
  };

  if (!open) return null;

  return (
    <>
      <RetroManagerProgressModal
        open={processing && step !== 'esperando'}
        message="Generando cobro Nequi…"
        zIndex={130}
      />

      {step === 'monto' && (
        <RetroModal
          open
          title="Recargar saldo"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text">
              Ingresa el monto que deseas recargar.
            </p>
            <div>
              <label htmlFor="recargaMonto" className="retro-manager-modal__label">
                Monto (COP)
              </label>
              <input
                id="recargaMonto"
                type="text"
                inputMode="numeric"
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder={`Mín. $${formatCop(MONTO_MIN)}`}
                className="retro-manager-modal__input"
              />
            </div>
            {errorMessage && (
              <p className="retro-manager-modal__text" style={{ color: 'var(--retro-danger, #c00)' }}>
                {errorMessage}
              </p>
            )}
            <RetroModalActions>
              <RetroModalBtn variant="secondary" onClick={handleClose}>
                Cancelar
              </RetroModalBtn>
              <RetroModalBtn variant="primary" onClick={handleContinuarMonto}>
                Continuar
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}

      {step === 'metodo' && (
        <RetroModal
          open
          title="Método de pago"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text">
              Monto a pagar: <strong>${formatCop(parseMonto() ?? 0)}</strong>
            </p>
            <div className="retro-manager-modal__checkbox-row">
              <RetroCheckbox
                label="Nequi (cobro push)"
                checked={nequiSelected}
                onChange={(e) => setNequiSelected(e.target.checked)}
              />
            </div>
            {errorMessage && (
              <p className="retro-manager-modal__text" style={{ color: 'var(--retro-danger, #c00)' }}>
                {errorMessage}
              </p>
            )}
            <RetroModalActions>
              <RetroModalBtn variant="secondary" onClick={() => setStep('monto')}>
                Atrás
              </RetroModalBtn>
              <RetroModalBtn variant="primary" onClick={handleContinuarMetodo} disabled={!nequiSelected}>
                Continuar
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}

      {step === 'nequi' && (
        <RetroModal
          open
          title="Nequi para cobro"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text">
              Ingresa el número de tu Nequi. Recibirás un cobro push por{' '}
              <strong>${formatCop(parseMonto() ?? 0)}</strong>.
            </p>
            <div>
              <label htmlFor="recargaNequi" className="retro-manager-modal__label">
                Número Nequi
              </label>
              <input
                id="recargaNequi"
                type="tel"
                inputMode="numeric"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(formatNequiInput(e.target.value))}
                placeholder="300 123 4567"
                className="retro-manager-modal__input"
                maxLength={12}
              />
            </div>
            {errorMessage && (
              <p className="retro-manager-modal__text" style={{ color: 'var(--retro-danger, #c00)' }}>
                {errorMessage}
              </p>
            )}
            <RetroModalActions>
              <RetroModalBtn variant="secondary" onClick={() => setStep('metodo')}>
                Atrás
              </RetroModalBtn>
              <RetroModalBtn variant="primary" onClick={() => void handleIniciarCobro()}>
                Generar cobro
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}

      {step === 'esperando' && (
        <RetroModal
          open
          title="Esperando pago"
          onClose={undefined}
          showClose={false}
          closeOnBackdrop={false}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="misc/clock"
        >
          <div className="retro-manager-modal__form retro-manager-progress">
            <div className="retro-hourglass" aria-hidden="true">
              <div className="retro-hourglass__frame">
                <span className="retro-hourglass__top-sand" />
                <span className="retro-hourglass__stream" />
                <span className="retro-hourglass__bottom-sand" />
              </div>
            </div>
            <p className="retro-manager-progress__message">{pollingMessage}</p>
            <p className="retro-manager-modal__text">
              Abre tu app Nequi y aprueba el cobro de <strong>${formatCop(montoCobro)}</strong>.
            </p>
            {transaccionId && (
              <p className="retro-manager-modal__text" style={{ fontSize: '11px', opacity: 0.75 }}>
                Ref. transacción: {transaccionId.slice(0, 12)}…
              </p>
            )}
          </div>
        </RetroModal>
      )}

      {step === 'exito' && (
        <RetroModal
          open
          title="Recarga exitosa"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text">
              Se acreditaron <strong>${formatCop((montoCobro || parseMonto()) ?? 0)}</strong> a tu saldo de
              administrador.
            </p>
            {successBalance != null && (
              <p className="retro-manager-modal__highlight">
                Nuevo saldo: ${formatCop(successBalance)}
              </p>
            )}
            <RetroModalActions>
              <RetroModalBtn variant="primary" onClick={handleClose}>
                Aceptar
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}

      {step === 'error' && (
        <RetroModal
          open
          title="Recarga no completada"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text" style={{ color: 'var(--retro-danger, #c00)' }}>
              {errorMessage || 'No se pudo completar la recarga.'}
            </p>
            <RetroModalActions>
              <RetroModalBtn variant="secondary" onClick={handleClose}>
                Cerrar
              </RetroModalBtn>
              <RetroModalBtn
                variant="primary"
                onClick={() => {
                  setErrorMessage('');
                  setStep('nequi');
                }}
              >
                Reintentar
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}
    </>
  );
}
