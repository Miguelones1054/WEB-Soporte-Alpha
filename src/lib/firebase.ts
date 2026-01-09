// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { API_BASE_URL } from './constants';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBefDvlrg1n7haTuoiQqekKoV139BmK5c",
  authDomain: "nequi-comprobantes.firebaseapp.com",
  databaseURL: "https://nequi-comprobantes-default-rtdb.firebaseio.com",
  projectId: "nequi-comprobantes",
  storageBucket: "nequi-comprobantes.firebasestorage.app",
  messagingSenderId: "673658453367",
  appId: "1:673658453367:web:73194541b843d77f2a7572",
  measurementId: "G-0D4TDX2FT3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Tipos para la respuesta del login
interface AdminData {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface LoginToken {
  access_token: string;
  token_type: string;
  admin: AdminData;
}

interface LoginResult {
  user: { email: string };
  token: LoginToken;
}

// Función helper para manejar errores de red
export const handleNetworkError = (error: any): Error => {
  if (error.message === 'Failed to fetch' ||
      error.message?.includes('fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
      error.name === 'TypeError' && error.message?.includes('fetch')) {
    return new Error('Servicio no disponible');
  }
  return error;
};

// Funciones de autenticación - Ahora usa el backend
export const loginWithEmail = async (email: string, password: string): Promise<LoginResult> => {
  try {
    // Llamar al backend para autenticación
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error en la autenticación');
    }

    const tokenData = await response.json();

    // Opcional: También podemos autenticar con Firebase usando el token
    // Pero por ahora solo usaremos el token del backend

    return {
      user: { email: email }, // Usuario simulado
      token: tokenData
    };
  } catch (error: any) {
    console.error('Error en login:', error);
    throw handleNetworkError(error);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
};

export const getCurrentUserToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

// Escuchar cambios de estado de autenticación
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
