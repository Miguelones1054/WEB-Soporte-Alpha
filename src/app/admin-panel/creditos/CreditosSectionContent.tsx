'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { getAdminToken } from '../../../lib/sessionStorage';

interface DoxingUser {
  uid: string;
  email: string | null;
  name: string | null;
  creditos: number;
}

const API_BASE = `${API_BASE_URL}/doxing/credits`;

export function CreditosSectionContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [user, setUser] = useState<DoxingUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const getToken = (): string | null => {
    const token = getAdminToken();
    if (!token) {
      router.push('/');
      return null;
    }
    return token;
  };

  const lookup = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Ingresa el correo del usuario.');
      return;
    }
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    setUser(null);
    try {
      const res = await fetch(`${API_BASE}/lookup?email=${encodeURIComponent(trimmed)}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user as DoxingUser);
      } else {
        setError(data.detail || 'No se encontró el usuario.');
      }
    } catch {
      setError('Error de conexión al buscar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const changeCredits = async (op: 'recharge' | 'subtract') => {
    if (!user) return;
    const value = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!value || value <= 0) {
      setError('Ingresa una cantidad válida de créditos.');
      return;
    }
    const token = getToken();
    if (!token) return;
    setWorking(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/${op}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email ?? email.trim(), amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user as DoxingUser);
        setAmount('');
        setFeedback(
          op === 'recharge'
            ? `Se recargaron ${value} créditos. Nuevo saldo: ${data.user.creditos}.`
            : `Se restaron ${Math.abs(data.delta ?? value)} créditos. Nuevo saldo: ${data.user.creditos}.`,
        );
      } else {
        setError(data.detail || 'No se pudo actualizar los créditos.');
      }
    } catch {
      setError('Error de conexión al actualizar los créditos.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="retro-creditos">
      <p className="retro-creditos__intro">
        Busca un usuario de la app de consultas (Data) por su correo y gestiona sus créditos.
        Por ahora solo puedes recargar o restar créditos; esta operación no descuenta tu saldo de administrador.
      </p>

      <fieldset className="retro-creditos__box">
        <legend>Buscar usuario</legend>
        <div className="retro-creditos__row">
          <div className="retro-creditos__field">
            <label htmlFor="creditosEmail">Correo del usuario</label>
            <input
              id="creditosEmail"
              type="email"
              autoComplete="off"
              value={email}
              disabled={loading}
              placeholder="usuario@correo.com"
              className="retro-manager-modal__input"
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) lookup();
              }}
            />
          </div>
          <button
            type="button"
            onClick={lookup}
            disabled={loading || !email.trim()}
            className="retro-manager-btn retro-manager-btn--primary"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </fieldset>

      {user && (
        <fieldset className="retro-creditos__box">
          <legend>Usuario encontrado</legend>
          <div className="retro-creditos__user">
            <div className="retro-creditos__user-line">
              <span className="retro-creditos__label">Nombre:</span>
              <span className="retro-creditos__value">{user.name || '—'}</span>
            </div>
            <div className="retro-creditos__user-line">
              <span className="retro-creditos__label">Correo:</span>
              <span className="retro-creditos__value">{user.email || '—'}</span>
            </div>
            <div className="retro-creditos__user-line">
              <span className="retro-creditos__label">Créditos:</span>
              <span className="retro-creditos__value retro-creditos__credits">{user.creditos}</span>
            </div>
          </div>

          <div className="retro-creditos__row retro-creditos__row--actions">
            <div className="retro-creditos__field">
              <label htmlFor="creditosAmount">Cantidad de créditos</label>
              <input
                id="creditosAmount"
                type="text"
                inputMode="numeric"
                value={amount}
                disabled={working}
                placeholder="Ej: 10"
                className="retro-manager-modal__input"
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9]/g, ''));
                  setError(null);
                }}
              />
            </div>
            <div className="retro-creditos__buttons">
              <button
                type="button"
                onClick={() => changeCredits('recharge')}
                disabled={working || !amount.trim()}
                className="retro-manager-btn retro-manager-btn--primary"
              >
                {working ? '...' : 'Recargar'}
              </button>
              <button
                type="button"
                onClick={() => changeCredits('subtract')}
                disabled={working || !amount.trim()}
                className="retro-manager-btn retro-manager-btn--secondary"
              >
                {working ? '...' : 'Restar'}
              </button>
            </div>
          </div>
        </fieldset>
      )}

      {error && <p className="retro-creditos__feedback retro-creditos__feedback--err">{error}</p>}
      {feedback && <p className="retro-creditos__feedback retro-creditos__feedback--ok">{feedback}</p>}

      <style>{`
        .retro-creditos { display: flex; flex-direction: column; gap: 16px; }
        .retro-creditos__intro { font-size: 13px; line-height: 1.5; margin: 0; }
        .retro-creditos__box {
          border: 2px groove #c0c0c0; padding: 12px 14px 14px; margin: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .retro-creditos__box legend { font-weight: 700; padding: 0 6px; font-size: 13px; }
        .retro-creditos__row {
          display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;
        }
        .retro-creditos__row--actions { align-items: flex-end; }
        .retro-creditos__field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 220px; min-width: 200px; }
        .retro-creditos__field label { font-size: 12px; font-weight: 600; }
        .retro-creditos__buttons { display: flex; gap: 8px; }
        .retro-creditos__user { display: flex; flex-direction: column; gap: 6px; }
        .retro-creditos__user-line { display: flex; gap: 8px; font-size: 13px; }
        .retro-creditos__label { font-weight: 700; min-width: 72px; }
        .retro-creditos__value { word-break: break-word; }
        .retro-creditos__credits { font-weight: 700; font-size: 16px; }
        .retro-creditos__feedback { font-size: 13px; margin: 0; padding: 8px 10px; border: 1px solid; }
        .retro-creditos__feedback--err { color: #a80000; border-color: #a80000; background: #ffecec; }
        .retro-creditos__feedback--ok { color: #0a6b0a; border-color: #0a6b0a; background: #eafbe7; }
      `}</style>
    </div>
  );
}
