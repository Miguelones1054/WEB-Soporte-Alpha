'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { getAdminToken } from '../../../lib/sessionStorage';
import { copyTextToClipboard } from '../../../lib/copyToClipboard';
import { useOptionalAdminSessionContext } from '../../../contexts/AdminSessionContext';
import { RetroButton } from '../../../components/retro';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface EndpointDoc {
  method: HttpMethod;
  path: string;
  description: string;
  body?: string;
  cost?: boolean;
}

interface EndpointGroup {
  id: string;
  title: string;
  intro?: string;
  endpoints: EndpointDoc[];
}

interface KeyStatus {
  has_key: boolean;
  api_key: string | null;
  prefix: string | null;
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    id: 'cuenta',
    title: 'Cuenta y saldo',
    intro: 'Consulta tu información y el saldo disponible del administrador.',
    endpoints: [
      { method: 'GET', path: '/me', description: 'Datos del administrador (id, email, nombre, rol, saldo, porcentaje).' },
    ],
  },
  {
    id: 'pricing',
    title: 'Tarifas y simulaciones',
    intro: 'Calcula cuánto te costará una operación antes de ejecutarla (según tu porcentaje). No descuentan saldo.',
    endpoints: [
      { method: 'GET', path: '/pricing/tarifas', description: 'Tarifas del sistema según tu porcentaje.' },
      { method: 'POST', path: '/pricing/simulate-recarga', description: 'Simula el costo de una recarga.', body: '{"monto": 50000}' },
      { method: 'POST', path: '/pricing/simulate-sms', description: 'Simula el costo de un paquete de SMS.', body: '{"cantidad": 100}' },
    ],
  },
  {
    id: 'nequi',
    title: 'Nequi',
    intro: 'Operaciones sobre usuarios Nequi. El {numero_cel} es el número de celular (10 dígitos).',
    endpoints: [
      { method: 'GET', path: '/nequi/users/{numero_cel}', description: 'Consultar datos del usuario.' },
      { method: 'GET', path: '/nequi/users/{numero_cel}/security-question', description: 'Pregunta de seguridad del usuario con su respuesta.' },
      { method: 'POST', path: '/nequi/users/{numero_cel}/add-balance', description: 'Recargar saldo al usuario.', body: '{"amount": 50000, "reason": "Recarga"}', cost: true },
      { method: 'POST', path: '/nequi/users/{numero_cel}/subtract-balance', description: 'Restar saldo al usuario.', body: '{"amount": 20000, "reason": "Ajuste"}' },
      { method: 'PUT', path: '/nequi/users/{numero_cel}', description: 'Actualizar usuario. Subir SMS descuenta saldo.', body: '{"username": "Nombre", "pin": "1234", "numero_cel": "3001112233", "sms": 100}', cost: true },
      { method: 'POST', path: '/nequi/users/{numero_cel}/upgrade-vip', description: 'Activar VIP.', cost: true },
      { method: 'POST', path: '/nequi/users/{numero_cel}/cancel-vip', description: 'Cancelar VIP.' },
      { method: 'POST', path: '/nequi/users/{numero_cel}/ban', description: 'Bloquear usuario.', body: '{"reason": "Motivo", "is_temporary": false, "ban_days": null}' },
      { method: 'POST', path: '/nequi/users/{numero_cel}/unban', description: 'Desbloquear usuario.' },
      { method: 'POST', path: '/nequi/users/{numero_cel}/unlink', description: 'Desvincular dispositivo.' },
      { method: 'POST', path: '/nequi/users/{numero_cel}/notify', description: 'Enviar notificación push.', body: '{"title": "Título", "body": "Mensaje"}' },
      { method: 'GET', path: '/nequi/users/{numero_cel}/movements?limit=100', description: 'Movimientos del usuario.' },
      { method: 'GET', path: '/nequi/users/{numero_cel}/movements-deleted?limit=100', description: 'Movimientos eliminados.' },
      { method: 'POST', path: '/nequi/users', description: 'Crear usuario.', body: '{"numero": "3001112233", "pin": "1234", "balance": 50000}', cost: true },
      { method: 'POST', path: '/nequi/users/test', description: 'Crear usuario de prueba (saldo 0–5000, sin costo).', body: '{"numero": "3001112233", "pin": "1234", "balance": 5000}' },
    ],
  },
  {
    id: 'bancolombia',
    title: 'Bancolombia',
    intro: 'Operaciones sobre usuarios Bancolombia. El {usuario} es el login del usuario.',
    endpoints: [
      { method: 'GET', path: '/bancolombia/users/{usuario}', description: 'Consultar datos del usuario.' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/recarga-rapida', description: 'Recarga rápida por tier (25k, 35k, 45k, 60k).', body: '{"tier": "25k"}', cost: true },
      { method: 'POST', path: '/bancolombia/users/{usuario}/add-balance', description: 'Agregar saldo.', body: '{"amount": 50000, "reason": "Recarga"}', cost: true },
      { method: 'POST', path: '/bancolombia/users/{usuario}/subtract-balance', description: 'Restar saldo.', body: '{"amount": 20000, "reason": "Ajuste"}' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/add-sms', description: 'Agregar SMS.', body: '{"amount": 100, "reason": "SMS"}', cost: true },
      { method: 'POST', path: '/bancolombia/users/{usuario}/subtract-sms', description: 'Restar SMS.', body: '{"amount": 50, "reason": "Ajuste"}' },
      { method: 'PUT', path: '/bancolombia/users/{usuario}', description: 'Actualizar usuario.', body: '{"username": "Nombre", "usuario": "nuevo_login", "numero_cel": "3001112233", "pin": "1234"}' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/upgrade-vip', description: 'Activar VIP.', cost: true },
      { method: 'POST', path: '/bancolombia/users/{usuario}/cancel-vip', description: 'Cancelar VIP.' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/ban', description: 'Bloquear usuario.', body: '{"reason": "Motivo", "is_temporary": false, "ban_days": null}' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/unban', description: 'Desbloquear usuario.' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/unlink', description: 'Desvincular dispositivo.' },
      { method: 'POST', path: '/bancolombia/users/{usuario}/notify', description: 'Enviar notificación push.', body: '{"title": "Título", "body": "Mensaje"}' },
      { method: 'GET', path: '/bancolombia/users/{usuario}/movements?limit=100', description: 'Movimientos del usuario.' },
      { method: 'GET', path: '/bancolombia/users/{usuario}/movements-deleted?limit=100', description: 'Movimientos eliminados.' },
      { method: 'POST', path: '/bancolombia/users', description: 'Crear usuario.', body: '{"usuario": "juan", "pin": "1234", "balance": 50000}', cost: true },
      { method: 'POST', path: '/bancolombia/users/test', description: 'Crear usuario de prueba (saldo 0–5000, sin costo).', body: '{"usuario": "juan", "pin": "1234", "balance": 5000}' },
    ],
  },
  {
    id: 'daviplata',
    title: 'Daviplata',
    intro: 'Operaciones sobre usuarios Daviplata. El {numero_cel} es el número de celular (10 dígitos).',
    endpoints: [
      { method: 'GET', path: '/daviplata/users/{numero_cel}', description: 'Consultar datos del usuario.' },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/recarga-rapida', description: 'Recarga rápida por tier (25k, 35k, 45k, 60k).', body: '{"tier": "25k"}', cost: true },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/add-balance', description: 'Agregar saldo.', body: '{"amount": 50000, "reason": "Recarga"}', cost: true },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/subtract-balance', description: 'Restar saldo.', body: '{"amount": 20000, "reason": "Ajuste"}' },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/ban', description: 'Bloquear usuario.', body: '{"reason": "Motivo", "is_temporary": false, "ban_days": null}' },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/unban', description: 'Desbloquear usuario.' },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/unlink', description: 'Desvincular dispositivo.' },
      { method: 'POST', path: '/daviplata/users/{numero_cel}/notify', description: 'Enviar notificación push.', body: '{"title": "Título", "body": "Mensaje"}' },
      { method: 'PUT', path: '/daviplata/users/{numero_cel}', description: 'Actualizar usuario.', body: '{"username": "Nombre", "numero_cel": "3001112233", "pin": "1234"}' },
      { method: 'POST', path: '/daviplata/users', description: 'Crear usuario.', body: '{"numero": "3001112233", "pin": "1234", "balance": 50000}', cost: true },
      { method: 'POST', path: '/daviplata/users/test', description: 'Crear usuario de prueba (saldo 0–5000, sin costo).', body: '{"numero": "3001112233", "pin": "1234", "balance": 5000}' },
    ],
  },
];

const API_BASE = `${API_BASE_URL}/api/v1`;

function methodClass(method: HttpMethod): string {
  return `retro-api__method retro-api__method--${method.toLowerCase()}`;
}

function buildCurl(ep: EndpointDoc, apiKey: string): string {
  const url = `${API_BASE}${ep.path}`;
  const lines = [`curl -X ${ep.method} "${url}"`, `  -H "X-API-Key: ${apiKey}"`];
  if (ep.body) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${ep.body}'`);
  }
  return lines.join(' \\\n');
}

export function ApiSectionContent() {
  const router = useRouter();
  const session = useOptionalAdminSessionContext();
  const balance = session?.adminInfo?.balance;

  const [keyInfo, setKeyInfo] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>(ENDPOINT_GROUPS[0].id);

  const currentGroup =
    ENDPOINT_GROUPS.find((g) => g.id === activeGroup) ?? ENDPOINT_GROUPS[0];

  const currentKey = keyInfo?.api_key ?? null;
  const effectiveKey = currentKey ?? 'TU_API_KEY';

  const getToken = useCallback((): string | null => {
    const token = getAdminToken();
    if (!token) {
      router.push('/');
      return null;
    }
    return token;
  }, [router]);

  const fetchStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/api-keys`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setKeyInfo({
          has_key: !!data.has_key,
          api_key: data.api_key ?? null,
          prefix: data.prefix ?? null,
        });
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'No se pudo cargar el estado de la API key.');
      }
    } catch {
      setError('Error de conexión al cargar la API key.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) return;
    setWorking(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback(keyInfo?.has_key ? 'API key regenerada.' : 'API key generada.');
        await fetchStatus();
      } else {
        setError(data.detail || 'No se pudo generar la API key.');
      }
    } catch {
      setError('Error de conexión al generar la API key.');
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async () => {
    const token = getToken();
    if (!token) return;
    setWorking(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/api-keys`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback('API key eliminada.');
        await fetchStatus();
      } else {
        setError(data.detail || 'No se pudo eliminar la API key.');
      }
    } catch {
      setError('Error de conexión al eliminar la API key.');
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async (text: string, okMessage = 'Copiado al portapapeles.') => {
    try {
      await copyTextToClipboard(text);
      setError(null);
      setFeedback(okMessage);
    } catch {
      setError('No se pudo copiar.');
    }
  };

  return (
    <div className="retro-api">
      <p className="retro-api__intro">
        Genera tu <strong>API key</strong> personal para integrar Alpha desde tus propios sistemas.
        Con ella puedes consultar tu saldo y ejecutar por API <strong>las mismas operaciones</strong>{' '}
        que realizas desde el panel (Nequi, Bancolombia y Daviplata). Cada recarga, SMS, VIP u operación
        con costo <strong>descuenta de tu saldo exactamente igual</strong> que desde el panel.
      </p>

      {error && <p className="retro-api__feedback retro-api__feedback--err">{error}</p>}
      {feedback && <p className="retro-api__feedback retro-api__feedback--ok">{feedback}</p>}

      {/* Gestión de la key */}
      <div className="retro-api__card">
        <h3 className="retro-api__card-title">Tu API key</h3>

        {loading ? (
          <p className="retro-api__muted">Cargando…</p>
        ) : (
          <>
            <div className="retro-api__row">
              <span>Estado:</span>
              {keyInfo?.has_key ? (
                <span className="retro-api__badge retro-api__badge--on">ACTIVA</span>
              ) : (
                <span className="retro-api__badge retro-api__badge--off">SIN KEY</span>
              )}
            </div>

            {keyInfo?.has_key && currentKey && (
              <div className="retro-api__row">
                <code className="retro-api__inline-code retro-api__key-value">{currentKey}</code>
                <RetroButton type="button" onClick={() => handleCopy(currentKey)}>
                  Copiar key
                </RetroButton>
              </div>
            )}

            <div className="retro-api__actions">
              <RetroButton type="button" onClick={handleGenerate} disabled={working}>
                {keyInfo?.has_key ? 'Regenerar key' : 'Generar API key'}
              </RetroButton>
              {keyInfo?.has_key && (
                <RetroButton type="button" onClick={handleRevoke} disabled={working}>
                  Eliminar key
                </RetroButton>
              )}
            </div>
            {keyInfo?.has_key && (
              <p className="retro-api__muted">
                Al regenerar, la key anterior deja de funcionar de inmediato.
              </p>
            )}
          </>
        )}
      </div>

      {/* Autenticación */}
      <div className="retro-api__card">
        <h3 className="retro-api__card-title">Cómo autenticar</h3>
        <p className="retro-api__muted">
          Base URL: <code className="retro-api__inline-code">{API_BASE}</code>
        </p>
        <p className="retro-api__muted">
          Envía tu key en el header{' '}
          <code className="retro-api__inline-code">X-API-Key: {effectiveKey}</code> en cada petición.
          Los ejemplos <strong>curl</strong> de abajo ya incluyen tu key
          {currentKey ? '' : ' (aparecerá cuando generes una)'}. Tu saldo actual es{' '}
          <strong>{balance != null ? `$${balance.toLocaleString('es-CO')}` : '—'}</strong>.
        </p>
      </div>

      {/* Selector de sección (una pestaña por app / grupo) */}
      <div className="retro-api__tabs" role="tablist" aria-label="Secciones de la API">
        {ENDPOINT_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={group.id === activeGroup}
            className={`retro-api__tab${group.id === activeGroup ? ' retro-api__tab--active' : ''}`}
            onClick={() => setActiveGroup(group.id)}
          >
            {group.title}
          </button>
        ))}
      </div>

      {/* Documentación de endpoints del grupo seleccionado, cada uno con su curl */}
      <div className="retro-api__card" key={currentGroup.id}>
        <h3 className="retro-api__card-title">{currentGroup.title}</h3>
        {currentGroup.intro && <p className="retro-api__muted">{currentGroup.intro}</p>}

        {currentGroup.endpoints.map((ep) => {
          const curl = buildCurl(ep, effectiveKey);
          return (
            <div className="retro-api__endpoint" key={`${ep.method}-${ep.path}`}>
              <div className="retro-api__endpoint-head">
                <span className={methodClass(ep.method)}>{ep.method}</span>
                <code className="retro-api__path">{ep.path}</code>
                {ep.cost && (
                  <span className="retro-api__badge retro-api__badge--cost">DESCUENTA SALDO</span>
                )}
              </div>
              <p className="retro-api__endpoint-desc">{ep.description}</p>
              <div className="retro-api__endpoint-curl">
                <pre className="retro-api__code">{curl}</pre>
                <RetroButton type="button" onClick={() => handleCopy(curl, 'Comando curl copiado.')}>
                  Copiar curl
                </RetroButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
