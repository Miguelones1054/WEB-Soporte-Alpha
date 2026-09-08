'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RetroCheckbox } from '../RetroCheckbox';
import { RetroModal } from './RetroModal';
import { RetroManagerProgressModal } from './RetroManagerProgressModal';
import { RetroModalActions, RetroModalBtn } from './RetroManagerModalUI';
import {
  getAdminToken,
  getLastRecargaDaviplata,
  getLastRecargaNequi,
  saveLastRecargaDaviplata,
  saveLastRecargaNequi,
} from '../../../lib/sessionStorage';
import {
  ADMIN_RECARGA_ESTADOS_FINALES,
  ADMIN_RECARGA_POLL_MS,
  type AdminRecargaMetodo,
  ejecutarRecargaAdmin,
  fetchAdminRecargaTransaccion,
  formatCop,
  mensajeErrorRecargaAdmin,
  validarDocumentoDaviplata,
  validarNequiReal,
} from '../../../lib/adminRecargaApi';

type RecargaStep = 'monto' | 'metodo' | 'datos' | 'esperando' | 'exito' | 'error';

export interface AdminRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onRecargaExitosa?: (newBalance?: number) => void;
}

const MONTO_MIN = 10_000;
const MONTO_MAX = 10_000_000;

const DOC_TIPOS = ['CC', 'CE', 'NIT', 'PP', 'TI'] as const;

function formatNequiInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function AdminRecargaModal({ open, onClose, onRecargaExitosa }: AdminRecargaModalProps) {
  const [step, setStep] = useState<RecargaStep>('monto');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<AdminRecargaMetodo | null>(null);
  const [nequiPhone, setNequiPhone] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState<string>('CC');
  const [documentoNumero, setDocumentoNumero] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [transaccionId, setTransaccionId] = useState<string | null>(null);
  const [montoCobro, setMontoCobro] = useState(0);
  const [otpUrl, setOtpUrl] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState('Esperando confirmación del pago…');
  const [successBalance, setSuccessBalance] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetFlow = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStep('monto');
    setMonto('');
    setMetodo(null);
    setNequiPhone('');
    setDocumentoTipo('CC');
    setDocumentoNumero('');
    setProcessing(false);
    setErrorMessage('');
    setTransaccionId(null);
    setMontoCobro(0);
    setOtpUrl(null);
    setPollingMessage('Esperando confirmación del pago…');
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
    }
    const savedDv = getLastRecargaDaviplata();
    if (savedDv) {
      setDocumentoTipo(savedDv.tipo);
      setDocumentoNumero(savedDv.documento);
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
    if (!metodo) {
      setErrorMessage('Selecciona un método de pago');
      return;
    }
    setErrorMessage('');
    setStep('datos');
  };

  const iniciarPolling = useCallback(
    (txId: string, metodoPago: AdminRecargaMetodo, montoPesos: number, referencia?: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      const poll = async () => {
        const token = getAdminToken();
        if (!token) return;

        try {
          const result = await fetchAdminRecargaTransaccion(token, txId);
          const estado = result.estado;

          if (result.otp_url) {
            setOtpUrl(result.otp_url);
          }

          if (estado === 'PENDING') {
            setPollingMessage(
              metodoPago === 'DAVIPLATA'
                ? 'Confirma el OTP de Daviplata…'
                : 'Confirma el cobro en tu app Nequi…',
            );
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
                mensajeErrorRecargaAdmin(estado, result.status_message, result.detail, metodoPago),
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
    if (num == null || !metodo) {
      setErrorMessage('Monto o método inválido');
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setErrorMessage('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }

    if (metodo === 'NEQUI') {
      const nequi = nequiPhone.trim().replace(/\s/g, '');
      if (!validarNequiReal(nequi)) {
        setErrorMessage('Ingresa un Nequi válido de 10 dígitos (empieza por 3)');
        return;
      }
      saveLastRecargaNequi(nequi);
      setProcessing(true);
      setErrorMessage('');
      setMontoCobro(num);
      setOtpUrl(null);

      try {
        const result = await ejecutarRecargaAdmin(token, { valor: num, metodo: 'NEQUI', nequi });
        await manejarResultadoCobro(token, result, 'NEQUI');
      } catch (err) {
        setProcessing(false);
        setErrorMessage(err instanceof Error ? err.message : 'No se pudo crear el cobro');
        setStep('error');
      }
      return;
    }

    const doc = documentoNumero.trim().replace(/\D/g, '');
    if (!validarDocumentoDaviplata(doc)) {
      setErrorMessage('Ingresa un documento válido (5 a 15 dígitos)');
      return;
    }
    saveLastRecargaDaviplata(documentoTipo, doc);
    setProcessing(true);
    setErrorMessage('');
    setMontoCobro(num);
    setOtpUrl(null);

    try {
      const result = await ejecutarRecargaAdmin(token, {
        valor: num,
        metodo: 'DAVIPLATA',
        documento_tipo: documentoTipo,
        documento_numero: doc,
      });
      await manejarResultadoCobro(token, result, 'DAVIPLATA');
    } catch (err) {
      setProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo crear el cobro');
      setStep('error');
    }
  };

  const manejarResultadoCobro = async (
    token: string,
    result: Awaited<ReturnType<typeof ejecutarRecargaAdmin>>,
    metodoPago: AdminRecargaMetodo,
  ) => {
    if (result.otp_url) {
      setOtpUrl(result.otp_url);
    }

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
        mensajeErrorRecargaAdmin(result.estado, result.status_message, result.detail, metodoPago),
      );
      setStep('error');
      return;
    }

    setTransaccionId(result.transaccion_id);
    setStep('esperando');
    iniciarPolling(
      result.transaccion_id,
      metodoPago,
      result.monto_pesos ?? result.saldo_acreditar ?? montoCobro ?? 0,
      result.referencia,
    );
  };

  if (!open) return null;

  const processingLabel =
    metodo === 'DAVIPLATA' ? 'Generando cobro Daviplata…' : 'Generando cobro Nequi…';

  return (
    <>
      <RetroManagerProgressModal
        open={processing && step !== 'esperando'}
        message={processingLabel}
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
                checked={metodo === 'NEQUI'}
                onChange={(e) => {
                  if (e.target.checked) setMetodo('NEQUI');
                }}
              />
            </div>
            <div className="retro-manager-modal__checkbox-row">
              <RetroCheckbox
                label="Daviplata (OTP por cédula)"
                checked={metodo === 'DAVIPLATA'}
                onChange={(e) => {
                  if (e.target.checked) setMetodo('DAVIPLATA');
                }}
              />
            </div>
            <p className="retro-manager-modal__text" style={{ fontSize: '12px', opacity: 0.8 }}>
              Wompi no envía push a Daviplata: pide documento y confirma con OTP por SMS.
            </p>
            {errorMessage && (
              <p className="retro-manager-modal__text" style={{ color: 'var(--retro-danger, #c00)' }}>
                {errorMessage}
              </p>
            )}
            <RetroModalActions>
              <RetroModalBtn variant="secondary" onClick={() => setStep('monto')}>
                Atrás
              </RetroModalBtn>
              <RetroModalBtn variant="primary" onClick={handleContinuarMetodo} disabled={!metodo}>
                Continuar
              </RetroModalBtn>
            </RetroModalActions>
          </div>
        </RetroModal>
      )}

      {step === 'datos' && metodo === 'NEQUI' && (
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

      {step === 'datos' && metodo === 'DAVIPLATA' && (
        <RetroModal
          open
          title="Daviplata para cobro"
          onClose={handleClose}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="files/briefcase"
        >
          <div className="retro-manager-modal__form">
            <p className="retro-manager-modal__text">
              Ingresa el documento de tu Daviplata. Wompi enviará un OTP por SMS y podrás
              confirmar el cobro de <strong>${formatCop(parseMonto() ?? 0)}</strong>.
            </p>
            <div>
              <label htmlFor="recargaDocTipo" className="retro-manager-modal__label">
                Tipo de documento
              </label>
              <select
                id="recargaDocTipo"
                value={documentoTipo}
                onChange={(e) => setDocumentoTipo(e.target.value)}
                className="retro-manager-modal__input"
              >
                {DOC_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="recargaDocNum" className="retro-manager-modal__label">
                Número de documento
              </label>
              <input
                id="recargaDocNum"
                type="text"
                inputMode="numeric"
                value={documentoNumero}
                onChange={(e) => setDocumentoNumero(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="1234567890"
                className="retro-manager-modal__input"
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
            {metodo === 'DAVIPLATA' ? (
              <>
                <p className="retro-manager-modal__text">
                  Revisa el SMS con el código OTP e ingrésalo en la página de Wompi para aprobar{' '}
                  <strong>${formatCop(montoCobro)}</strong>.
                </p>
                {otpUrl ? (
                  <RetroModalActions>
                    <RetroModalBtn
                      variant="primary"
                      onClick={() => window.open(otpUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir confirmación OTP
                    </RetroModalBtn>
                  </RetroModalActions>
                ) : (
                  <p className="retro-manager-modal__text" style={{ fontSize: '12px', opacity: 0.75 }}>
                    Preparando enlace de confirmación…
                  </p>
                )}
              </>
            ) : (
              <p className="retro-manager-modal__text">
                Abre tu app Nequi y aprueba el cobro de <strong>${formatCop(montoCobro)}</strong>.
              </p>
            )}
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
                  setStep('datos');
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
