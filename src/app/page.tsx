'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail } from '../lib/firebase';
import { API_BASE_URL } from '../lib/constants';
import {
  clearAdminToken,
  getAdminToken,
  getSavedCredentials,
  isRememberSessionEnabled,
  persistRememberSession,
  saveAdminToken,
} from '../lib/sessionStorage';
import {
  RetroAlert,
  RetroButton,
  RetroCheckbox,
  RetroField,
  RetroInput,
  RetroLoadingOverlay,
  RetroPanel,
} from '../components/retro';

interface AdminData {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  user: { email: string };
  token: {
    access_token: string;
    token_type: string;
    admin: AdminData;
  };
}

function getMessageVariant(message: string): 'success' | 'error' | 'info' {
  const lower = message.toLowerCase();
  if (
    lower.includes('exitoso') ||
    lower.includes('bienvenido') ||
    lower.includes('redirigiendo') ||
    lower.includes('automáticamente') ||
    lower.includes('automaticamente') ||
    lower.includes('restaurada')
  ) {
    return 'success';
  }
  if (lower.includes('complete') || lower.includes('válido') || lower.includes('valido')) {
    return 'error';
  }
  return 'error';
}

async function completeLogin(
  email: string,
  password: string,
  rememberSession: boolean
): Promise<LoginResponse> {
  const result = await loginWithEmail(email, password);
  saveAdminToken(result.token.access_token);
  persistRememberSession(email, password, rememberSession);
  return result;
}

async function validateStoredToken(token: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/admin/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.ok;
}

export default function Home() {
  const router = useRouter();
  const bootstrappedRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrapSession = async () => {
      const rememberEnabled = isRememberSessionEnabled();
      const savedCredentials = getSavedCredentials();

      setRememberSession(rememberEnabled);
      if (savedCredentials) {
        setEmail(savedCredentials.email);
        setPassword(savedCredentials.password);
      }

      setIsLoading(true);

      try {
        if (rememberEnabled && savedCredentials) {
          await completeLogin(
            savedCredentials.email,
            savedCredentials.password,
            true
          );
          setMessage('Sesión iniciada automáticamente. Redirigiendo...');
          router.push('/admin-panel');
          return;
        }

        const token = getAdminToken();
        if (!token) return;

        const isValid = await validateStoredToken(token);
        if (isValid) {
          setMessage('Sesión restaurada. Redirigiendo...');
          router.push('/admin-panel');
          return;
        }

        clearAdminToken();
      } catch (error) {
        console.error('No fue posible restaurar la sesión:', error);
        clearAdminToken();
        if (rememberEnabled && savedCredentials) {
          setMessage('No se pudo iniciar sesión automáticamente. Verifique sus credenciales.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!email || !password) {
      setMessage('Por favor complete todos los campos');
      setIsLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setMessage('Ingrese un correo electrónico válido');
      setIsLoading(false);
      return;
    }

    try {
      await completeLogin(email, password, rememberSession);
      setMessage('');
      setTimeout(() => {
        router.push('/admin-panel');
      }, 500);
    } catch (error: unknown) {
      console.error('Error de autenticación:', error);
      const err = error as { message?: string };
      setMessage(err.message || 'Error en la autenticación');
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  return (
    <div className="retro-page retro-page--auth flex items-center justify-center p-4">
      {isLoading && <RetroLoadingOverlay message="Verificando credenciales..." />}

      <RetroPanel title="Nequi Admin — Inicio de sesión">
        <div className="flex flex-col items-center gap-4">
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <RetroField label="Correo de administrador" htmlFor="email">
              <RetroInput
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nequialpha.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </RetroField>

            <RetroField label="Clave" htmlFor="password">
              <RetroInput
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su clave"
                required
                disabled={isLoading}
                autoComplete="current-password"
                suffix={
                  <button
                    type="button"
                    className="retro-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? '◐' : '◎'}
                  </button>
                }
              />
            </RetroField>

            <RetroCheckbox
              label="Recordar sesión"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              disabled={isLoading}
            />

            {message && (
              <RetroAlert variant={getMessageVariant(message)}>{message}</RetroAlert>
            )}

            <RetroButton type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </RetroButton>
          </form>

          <p className="text-[11px] text-center m-0" style={{ color: 'var(--retro-muted)' }}>
            Panel de administración · v0.1
          </p>
        </div>
      </RetroPanel>
    </div>
  );
}
