'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail } from '../lib/firebase';
import { API_BASE_URL } from '../lib/constants';

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

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const validateSavedSession = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setMessage('Sesion restaurada. Redirigiendo...');
          router.push('/admin-panel');
          return;
        }

        localStorage.removeItem('admin_token');
      } catch (error) {
        // Si hay fallo de red, conservamos el token para reintentar luego.
        console.error('No fue posible validar la sesion guardada:', error);
      } finally {
        setIsLoading(false);
      }
    };

    validateSavedSession();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // Validación simple
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
      const result: LoginResponse = await loginWithEmail(email, password);

      // Limpiar cualquier mensaje anterior
      setMessage('');

      // Guardar token en localStorage
      localStorage.setItem('admin_token', result.token.access_token);

      // Redirigir al panel de admin
      setTimeout(() => {
        router.push('/admin-panel');
      }, 500);

    } catch (error: any) {
      console.error('Error de autenticación:', error);

      // Los errores ahora vienen del backend
      setMessage(error.message || 'Error en la autenticación');
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  // Formulario de login
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-800 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-900 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>
      {/* Overlay de carga - Spinner circular simple */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-red-500"></div>
        </div>
      )}

      <div className="bg-gray-800/95 backdrop-blur-sm p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700/50 relative z-10">
        <div className="text-center mb-6">
          <img
            src="/support.svg"
            alt="Support Icon"
            className="w-64 h-64 mx-auto"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Correo de Administrador
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              placeholder="admin@nequialpha.com"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Clave
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                placeholder="Ingrese su clave"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 focus:outline-none disabled:opacity-50"
                disabled={isLoading}
              >
                {showPassword ? (
                  // Icono de ojo cerrado (ocultar contraseña)
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  // Icono de ojo abierto (mostrar contraseña)
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>


          {message && (
            <div className={`text-sm text-center p-3 rounded-md ${
              message.includes('exitoso') || message.includes('Bienvenido') || message.includes('automáticamente')
                ? 'text-green-400 bg-green-900/30'
                : 'text-red-400 bg-red-900/30'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed cursor-pointer text-white py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
}

