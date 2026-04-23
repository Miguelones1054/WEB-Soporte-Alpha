'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

interface AdminInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

interface UserData {
  numeroCel: string;
  /** Campo Firestore `NumeroCuenta` (número de cuenta bancaria). */
  numeroCuenta: string;
  /** Campo Firestore `username` (nombre visible). */
  username: string;
  /** Campo Firestore `usuario` (login; clave de búsqueda API). */
  usuarioLogin: string;
  baneado: boolean;
  banned_reason?: string | null;
  saldo: string;
  pin: string;
  device_status: string;
  device_linked: boolean;
  ok: string;
  role: string;
  type: string;
}

// Función para formatear números grandes
const formatLargeNumber = (num: number | string): string => {
  const INFINITY_THRESHOLD = 9999999999; // 10 mil millones

  const numericValue = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(numericValue)) {
    return '0';
  }

  if (numericValue >= INFINITY_THRESHOLD) {
    return '∞';
  }

  return numericValue.toLocaleString();
};

/** Saldo total Bancolombia (API: saldo_reserva + Saldo en Firestore). */
function bancolombiaSaldoTotalFromResponse(json: {
  saldo_total?: number;
  data?: Record<string, unknown>;
}): string {
  const t = json.saldo_total ?? json.data?.saldo_total;
  if (t != null && t !== '') return String(t);
  return '0';
}

/** Dispositivo vinculado si hay `dv` o un mapa `device_info` con datos. */
function bancolombiaDeviceLinked(raw: Record<string, unknown>): boolean {
  if (raw.dv != null && raw.dv !== undefined) return true;
  const di = raw.device_info;
  if (di != null && typeof di === 'object' && !Array.isArray(di)) {
    return Object.keys(di as Record<string, unknown>).length > 0;
  }
  return false;
}

// Componente Shimmer para efectos de carga
const Shimmer = ({ className = "h-4 w-20" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
);

/** Fijos y centrados en el viewport: sin scroll en la capa overlay; el scroll solo en el panel si hace falta. */
const MODAL_ROOT_Z50 =
  'fixed inset-0 z-50 flex min-h-0 max-h-dvh w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-contain p-4 sm:px-6 sm:py-6';
const MODAL_ROOT_Z60 =
  'fixed inset-0 z-[60] flex min-h-0 max-h-dvh w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-contain p-4 sm:px-6 sm:py-6';
const MODAL_ROOT_Z70 =
  'fixed inset-0 z-[70] flex min-h-0 max-h-dvh w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-contain p-4 sm:px-6 sm:py-6';
/** Portal a `document.body` + z alto: no hereda transform/overflow del layout; queda fijo al viewport y centrado. */
const MODAL_ROOT_EDIT_PORTAL =
  'fixed inset-0 z-[100] flex h-[100dvh] w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-none p-4 sm:px-6 sm:py-6';
/** Encima del modal de edición (z-100): recargas, restas y confirmaciones. */
const MODAL_ROOT_STACK_PORTAL =
  'fixed inset-0 z-[110] flex h-[100dvh] w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-none p-4 sm:px-6 sm:py-6';
/** Procesando: por encima de confirmaciones y edición. */
const MODAL_ROOT_PROGRESS_PORTAL =
  'fixed inset-0 z-[120] flex h-[100dvh] w-full max-w-[100dvw] items-center justify-center overflow-x-hidden overflow-y-hidden overscroll-none p-4 sm:px-6 sm:py-6';
const MODAL_BACKDROP = 'absolute inset-0 z-0 cursor-default bg-black/50 transition-opacity';
const MODAL_PANEL_BASE =
  'pointer-events-auto relative z-10 mx-auto w-full max-h-[min(90dvh,calc(100dvh-1.5rem))] min-h-0 flex-shrink-0 overflow-y-auto overscroll-contain';

function AdminPanelContent() {
  const MAX_RECHARGE = 10_000_000;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [userIdInput, setUserIdInput] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [recargaData, setRecargaData] = useState<{monto: string, valor: string} | null>(null);
  const [showCustomRecargaModal, setShowCustomRecargaModal] = useState(false);
  const [customRecargaAmount, setCustomRecargaAmount] = useState('');
  const [showSubtractModal, setShowSubtractModal] = useState(false);
  const [subtractAmount, setSubtractAmount] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editPin, setEditPin] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationType, setConfirmationType] = useState<'success' | 'error'>('success');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isTemporaryBan, setIsTemporaryBan] = useState(false);
  const [banDays, setBanDays] = useState(1);
  const [showBalanceConfirmationModal, setShowBalanceConfirmationModal] = useState(false);
  const [balanceConfirmationData, setBalanceConfirmationData] = useState<{
    type: 'add' | 'subtract';
    username: string;
    amount: number;
    newBalance: number;
  } | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserInitialBalance, setNewUserInitialBalance] = useState('');
  const [selectedRandomOption, setSelectedRandomOption] = useState<string | null>(null);
  const [showUserCreatedModal, setShowUserCreatedModal] = useState(false);
  const [userCreatedMessage, setUserCreatedMessage] = useState('');
  const [editUserData, setEditUserData] = useState<{
    username: string;
    pin: string;
    numero_cel: string;
  } | null>(null);
  const [showUserNotificationModal, setShowUserNotificationModal] = useState(false);
  const [userNotificationTitle, setUserNotificationTitle] = useState('');
  const [userNotificationBody, setUserNotificationBody] = useState('');
  const [sendingUserNotification, setSendingUserNotification] = useState(false);
  const router = useRouter();

  const isAnyDialogOpen = useMemo(
    () =>
      isDrawerOpen ||
      showRecargaModal ||
      showCustomRecargaModal ||
      showSubtractModal ||
      showEditModal ||
      showProgressBar ||
      showConfirmationModal ||
      showBanModal ||
      showBalanceConfirmationModal ||
      showCreateUserModal ||
      showUserNotificationModal ||
      showUserCreatedModal,
    [
      isDrawerOpen,
      showRecargaModal,
      showCustomRecargaModal,
      showSubtractModal,
      showEditModal,
      showProgressBar,
      showConfirmationModal,
      showBanModal,
      showBalanceConfirmationModal,
      showCreateUserModal,
      showUserNotificationModal,
      showUserCreatedModal,
    ],
  );

  useEffect(() => {
    if (!isAnyDialogOpen) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [isAnyDialogOpen]);

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Bancolombia Admin';

    const loadAdminData = async () => {
      // Verificar token en localStorage
      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Hacer petición GET al backend para obtener datos frescos del admin
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const adminData = await response.json();
          setUser({
            email: adminData.email,
            displayName: adminData.name,
            role: adminData.role
          });
          // Establecer adminInfo para el popup
          setAdminInfo(adminData);

          // Estadísticas se cargan solo en la página dedicada
        } else {
          // Token inválido o expirado
          localStorage.removeItem('admin_token');
          router.push('/');
        }
      } catch (error) {
        console.error('Error obteniendo datos del admin:', error);
        localStorage.removeItem('admin_token');
        router.push('/');
      }

      setLoading(false);
    };

    loadAdminData();

    // Cerrar popup cuando se hace click fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-popup') && !target.closest('.profile-button')) {
        setShowProfile(false);
      }
    };

    // Cerrar drawer y modal con Escape
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showRecargaModal) {
          closeRecargaModal();
        } else if (isDrawerOpen) {
          toggleDrawer();
        }
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Efecto separado para detectar cambios en los parámetros de búsqueda
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUserParam = params.get('user');
    const keepQueryParam = params.get('keepQuery');

    if (urlUserParam && keepQueryParam === 'true' && !userData && !searching && user) {
      // Limpiar la URL para que no se vea fea
      window.history.replaceState({}, document.title, window.location.pathname);
      // Consultar automáticamente al usuario
      searchUserByPhone(urlUserParam);
    }
  }, [userData, searching, user]);

  const searchUserByPhone = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      setSearchError('Por favor ingrese un usuario');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setUserData(null);
    setUserIdInput(phoneNumber); // Actualizar el input también

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setSearchError('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bancolombia/user/${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        const raw = json.data || {};
        const processedPin = (raw.pin || '').replace(/##$/, '');
        const deviceLinked = bancolombiaDeviceLinked(raw);
        const cuentaRaw = raw.NumeroCuenta ?? raw.numeroCuenta;
        const data: UserData = {
          numeroCel: raw.numeroCel || phoneNumber,
          numeroCuenta: cuentaRaw != null && cuentaRaw !== '' ? String(cuentaRaw).trim() : '',
          username: raw.username != null ? String(raw.username) : '',
          usuarioLogin: String(raw.usuario || phoneNumber),
          baneado: raw.banned === true || raw.enabled === false,
          banned_reason: raw.banned_reason || null,
          saldo: bancolombiaSaldoTotalFromResponse(json),
          pin: processedPin,
          device_status: deviceLinked ? 'Vinculado' : 'Desvinculado',
          device_linked: deviceLinked,
          ok: String(raw.ok ?? '0'),
          role: raw.role || 'regular',
          type: raw.type || 'regular',
        };
        setUserData(data);
        setSearchError(null);
      } else if (response.status === 404) {
        setSearchError('Usuario no encontrado');
      } else {
        const errorData = await response.json();
        setSearchError(errorData.detail || 'Error al consultar usuario');
      }
    } catch (error) {
      console.error('Error consultando usuario:', error);
      setSearchError('Error de conexión. Intente nuevamente.');
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpiar todas las credenciales y tokens del localStorage
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('admin_password');
      localStorage.removeItem('admin_remember');
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleProfileClick = () => {
    // Solo alternar la visibilidad del popup ya que ya tenemos los datos
    setShowProfile(!showProfile);
  };

  const handleHome = () => {
    router.push('/admin-panel');
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      // Cerrando drawer
      setIsAnimating(false);
      setTimeout(() => setIsDrawerOpen(false), 300); // Esperar a que termine la animación
    } else {
      // Abriendo drawer
      setIsDrawerOpen(true);
      // Pequeño delay para que el componente se monte antes de animar
      requestAnimationFrame(() => {
        setTimeout(() => setIsAnimating(true), 50);
      });
    }
  };

  const searchUser = async (overrideUsuario?: string) => {
    const queryUsuario = (overrideUsuario !== undefined ? overrideUsuario : userIdInput).trim();
    if (!queryUsuario) {
      setSearchError('Por favor ingrese un usuario');
      return;
    }

    if (overrideUsuario !== undefined && overrideUsuario.trim() !== '') {
      setUserIdInput(overrideUsuario.trim());
    }

    setSearching(true);
    setSearchError(null);
    setUserData(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setSearchError('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bancolombia/user/${encodeURIComponent(queryUsuario)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        const raw = json.data || {};
        const processedPin = (raw.pin || '').replace(/##$/, '');
        const deviceLinked = bancolombiaDeviceLinked(raw);
        const cuentaRaw = raw.NumeroCuenta ?? raw.numeroCuenta;
        const data: UserData = {
          numeroCel: raw.numeroCel || queryUsuario,
          numeroCuenta: cuentaRaw != null && cuentaRaw !== '' ? String(cuentaRaw).trim() : '',
          username: raw.username != null ? String(raw.username) : '',
          usuarioLogin: String(raw.usuario || queryUsuario),
          baneado: raw.banned === true || raw.enabled === false,
          banned_reason: raw.banned_reason || null,
          saldo: bancolombiaSaldoTotalFromResponse(json),
          pin: processedPin,
          device_status: deviceLinked ? 'Vinculado' : 'Desvinculado',
          device_linked: deviceLinked,
          ok: String(raw.ok ?? '0'),
          role: raw.role || 'regular',
          type: raw.type || 'regular',
        };
        setUserData(data);
        setSearchError(null);
      } else if (response.status === 404) {
        setSearchError('Usuario no encontrado');
      } else {
        const errorData = await response.json();
        setSearchError(errorData.detail || 'Error al consultar usuario');
      }
    } catch (error) {
      console.error('Error consultando usuario:', error);
      setSearchError('Error de conexión. Intente nuevamente.');
    } finally {
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setUserData(null);
    setUserIdInput('');
    setSearchError(null);
  };

  const openRecargaModal = (monto: string, valor: string) => {
    setRecargaData({ monto, valor });
    setShowRecargaModal(true);
  };

  const closeRecargaModal = () => {
    setShowRecargaModal(false);
    setRecargaData(null);
  };

  const confirmBan = async () => {
    if (userData && banReason.trim()) {
      await handleUserAction('ban', userData.numeroCel, userData.username, banReason.trim(), undefined, {
        is_temporary: isTemporaryBan,
        ban_days: isTemporaryBan ? banDays : null
      });
      setShowBanModal(false);
      setBanReason('');
      setIsTemporaryBan(false);
      setBanDays(1);
    }
  };

  const closeBanModal = () => {
    setShowBanModal(false);
    setBanReason('');
    setIsTemporaryBan(false);
    setBanDays(1);
  };

  const copyBalanceMessage = async () => {
    if (!balanceConfirmationData) return;

    const actionText = balanceConfirmationData.type === 'add' ? 'agregado' : 'restado';
    const message = `✨ ¡Saldo ${actionText} correctamente!

👤 Usuario: ${balanceConfirmationData.username}
💰 Monto ${actionText}: $${formatCurrency(balanceConfirmationData.amount)}
💵 Nuevo saldo: $${formatCurrency(balanceConfirmationData.newBalance)}

✅ Operación completada exitosamente`;

    try {
      await navigator.clipboard.writeText(message);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const closeBalanceConfirmationModal = () => {
    setShowBalanceConfirmationModal(false);
    setBalanceConfirmationData(null);
    // Recargar datos del usuario después de cerrar el modal
    searchUser();
  };

  const RANDOM_NAMES = [
    'Santiago', 'Valentina', 'Mateo', 'Isabella', 'Sebastian', 'Camila', 'Miguel', 'Sofía',
    'Alejandro', 'Mariana', 'Daniel', 'Gabriela', 'Andres', 'Natalia', 'Felipe', 'Daniela',
    'Juan', 'Laura', 'David', 'Paula', 'Carlos', 'Juliana', 'Luis', 'Andrea', 'Jorge',
    'Catalina', 'Ricardo', 'Paola', 'Rodrigo', 'Valeria', 'Fernando', 'Monica', 'Sergio',
    'Carolina', 'Eduardo', 'Alejandra', 'Alberto', 'Melissa', 'Oscar', 'Diana', 'Javier',
    'Tatiana', 'Nicolas', 'Stefania', 'Mauricio', 'Lorena', 'Gustavo', 'Angela', 'Cristian',
    'Viviana', 'Hector', 'Marcela', 'Mario', 'Claudia', 'Raul', 'Patricia', 'Hernan',
    'Sandra', 'Victor', 'Elena', 'Ernesto', 'Silvia', 'Pablo', 'Adriana', 'Gonzalo',
    'Luisa', 'Esteban', 'Yessica', 'Fabian', 'Xiomara', 'Jonathan', 'Liliana', 'Wilmer',
    'Nathalia', 'Brayan', 'Estefania', 'Kevin', 'Dayana', 'Jefferson', 'Leidy', 'Jhon',
    'Milena', 'Edson', 'Karina', 'Duvan', 'Wendy', 'Elias', 'Vanessa', 'Cesar', 'Gloria',
    'Ruben', 'Ingrid', 'Jhonatan', 'Lina', 'Ivan', 'Angie', 'Yamid', 'Karen', 'Harold',
    'Manuela', 'Herber', 'Yeimi', 'Cristobal', 'Shirley', 'Bladimir', 'Johana', 'Alexis',
    'Berenice', 'Fredy', 'Esperanza', 'Oswaldo', 'Rocio', 'Armando', 'Nubia', 'Jairo',
    'Olga', 'Elkin', 'Blanca', 'Ferney', 'Amparo', 'Giovanny', 'Marta', 'Camilo', 'Rosa',
    'Abel', 'Zulma', 'Nelson', 'Ximena', 'Wilson', 'Luz', 'Yhon', 'Yuri', 'Jhony', 'Sonia',
    'Tobias', 'Rebeca', 'Isidro', 'Constanza', 'Leonel', 'Marisol', 'Ramiro', 'Susana',
  ];

  const setQuickBalance = (balance: string, optionKey: string) => {
    // Generar nombre aleatorio + 3 dígitos
    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const randomSuffix = Math.floor(Math.random() * 900) + 100; // Entre 100 y 999
    const randomUsername = `${randomName}${randomSuffix}`;

    // Generar PIN aleatorio de 4 dígitos
    const randomPin = Math.floor(Math.random() * 9000) + 1000; // Entre 1000 y 9999

    // Asignar valores a los campos
    setNewUserPhone(randomUsername);
    setNewUserPin(randomPin.toString());
    setNewUserInitialBalance(balance);
    setSelectedRandomOption(optionKey);
  };

  const createNewUser = async () => {
    if (!newUserPhone.trim() || !newUserPin.trim() || !newUserInitialBalance.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    if (newUserPin.length !== 4) {
      alert('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    // Validar límite de saldo inicial
    const initialBalanceNumeric = parseFloat(newUserInitialBalance.replace(/\./g, ''));
    if (initialBalanceNumeric > MAX_RECHARGE) {
      alert('Límite máximo de saldo inicial: $10.000.000');
      return;
    }

    // Mostrar barra de progreso
    setShowProgressBar(true);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        setShowProgressBar(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bancolombia/user/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: newUserPhone.trim(),
          pin: newUserPin.trim(),
          balance: initialBalanceNumeric,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setUserCreatedMessage(result.client_message);
        setShowUserCreatedModal(true);
        closeCreateUserModal();
      } else {
        const errorData = await response.json();
        alert(`Error creando usuario: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión. Intente nuevamente.');
    } finally {
      // Ocultar barra de progreso
      setShowProgressBar(false);
    }
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setNewUserPhone('');
    setNewUserPin('');
    setNewUserInitialBalance('');
    setSelectedRandomOption(null);
  };

  const copyUserCreatedMessage = async () => {
    if (userCreatedMessage) {
      try {
        await navigator.clipboard.writeText(userCreatedMessage);
      } catch (err) {
        console.error('Error al copiar:', err);
      }
    }
  };

  const closeUserCreatedModal = () => {
    setShowUserCreatedModal(false);
    setUserCreatedMessage('');
  };

  const sendUserNotification = async () => {
    if (!userNotificationTitle.trim() || !userNotificationBody.trim() || !userData) {
      alert('Por favor complete todos los campos');
      return;
    }

    const usuarioKey = userIdInput.trim();
    if (!usuarioKey) {
      alert('No se pudo identificar el usuario Bancolombia. Vuelva a buscar.');
      return;
    }

    setSendingUserNotification(true);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuarioKey)}/notify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: userNotificationTitle.trim(),
            body: userNotificationBody.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(result.message || 'Notificación enviada exitosamente');
        setShowUserNotificationModal(false);
        setUserNotificationTitle('');
        setUserNotificationBody('');
      } else {
        const detail = result.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(' ')
              : 'Error al enviar notificación';
        alert(msg);
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
      alert('Error de conexión. No se pudo enviar la notificación.');
    } finally {
      setSendingUserNotification(false);
    }
  };

  const closeUserNotificationModal = () => {
    setShowUserNotificationModal(false);
    setUserNotificationTitle('');
    setUserNotificationBody('');
  };

  const confirmRecarga = async () => {
    if (!recargaData || !userData) return;

    const tier = recargaData.monto;
    const usuarioKey = userIdInput.trim();
    if (!usuarioKey) {
      alert('No se pudo identificar el usuario Bancolombia. Vuelva a buscar.');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Sesión expirada. Por favor inicie sesión nuevamente.');
      router.push('/');
      return;
    }

    setShowProgressBar(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuarioKey)}/recarga-rapida`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = result.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(' ')
              : 'Error al aplicar la recarga';
        alert(msg);
        return;
      }

      closeRecargaModal();
      setBalanceConfirmationData({
        type: 'add',
        username: userData.username,
        amount: Number(result.amount_added ?? 0),
        newBalance: Number(result.saldo_total ?? 0),
      });
      setShowBalanceConfirmationModal(true);
      await searchUser();
    } catch (e) {
      console.error('Recarga Bancolombia:', e);
      alert('Error de conexión. Intente nuevamente.');
    } finally {
      setShowProgressBar(false);
    }
  };

  const openCustomRecargaModal = () => {
    setCustomRecargaAmount('');
    setShowCustomRecargaModal(true);
  };

  const closeCustomRecargaModal = () => {
    setShowCustomRecargaModal(false);
    setCustomRecargaAmount('');
  };

  const confirmCustomRecarga = async () => {
    if (customRecargaAmount && userData) {
      const amount = parseFloat(customRecargaAmount.replace(/\./g, ''));
      if (amount > 0) {
        if (amount > MAX_RECHARGE) {
          alert('Límite máximo de recarga: $10.000.000');
          return;
        }
        await handleUserAction('add_balance', userData.numeroCel, userData.username, 'Recarga administrativa', amount);
        closeCustomRecargaModal();
      } else {
        alert('Por favor ingrese un valor válido mayor a 0');
      }
    }
  };

  const openSubtractModal = () => {
    setSubtractAmount('');
    setShowSubtractModal(true);
  };

  const closeSubtractModal = () => {
    setShowSubtractModal(false);
    setSubtractAmount('');
  };

  const confirmSubtract = async () => {
    if (subtractAmount && userData) {
      const amount = parseFloat(subtractAmount.replace(/\./g, ''));
      if (amount > 0) {
        if (amount <= parseFloat(userData.saldo || '0')) {
          await handleUserAction('subtract_balance', userData.numeroCel, userData.username, 'Ajuste administrativo', amount);
        } else {
          alert('El monto a restar no puede ser mayor al saldo disponible');
          return;
        }
        closeSubtractModal();
      } else {
        alert('Por favor ingrese un valor válido');
      }
    }
  };

  const handleSubtract = () => {
    openSubtractModal();
  };

  const handleUserAction = async (action: 'ban' | 'unban' | 'unlink' | 'add_balance' | 'subtract_balance' | 'update_user', numeroCel: string, username: string, reason?: string, amount?: number, userUpdates?: any) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Sesión expirada. Por favor inicie sesión nuevamente.');
      router.push('/');
      return;
    }

    // Mostrar progress bar
    setShowProgressBar(true);

    try {
      let endpoint = action === 'unban' ? 'unban' : action === 'ban' ? 'ban' : action === 'unlink' ? 'unlink' : action === 'add_balance' ? 'add-balance' : action === 'subtract_balance' ? 'subtract-balance' : '';

      if (action === 'update_user') {
        endpoint = '';
      }

      const usuarioBc = userIdInput.trim();
      if (
        (action === 'ban' ||
          action === 'unban' ||
          action === 'unlink' ||
          action === 'add_balance' ||
          action === 'subtract_balance' ||
          action === 'update_user') &&
        !usuarioBc
      ) {
        setShowProgressBar(false);
        alert('No se pudo identificar el usuario Bancolombia. Vuelva a buscar.');
        return;
      }

      // Preparar body y método según la acción
      let body = undefined;
      let method = 'POST';
      if (action === 'ban') {
        // Para ban, combinar reason con userUpdates (que contiene info de suspensión temporal)
        const banData = { reason: reason || '', ...userUpdates };
        body = JSON.stringify(banData);
      } else if ((action === 'add_balance' || action === 'subtract_balance') && amount && reason) {
        body = JSON.stringify({ amount, reason });
      } else if (action === 'update_user' && userUpdates) {
        body = JSON.stringify(userUpdates);
        method = 'PUT';
        endpoint = '';
      }

      const url =
        action === 'update_user'
          ? `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuarioBc)}`
          : action === 'ban' ||
              action === 'unban' ||
              action === 'unlink' ||
              action === 'add_balance' ||
              action === 'subtract_balance'
            ? `${API_BASE_URL}/bancolombia/user/${encodeURIComponent(usuarioBc)}/${endpoint}`
            : `${API_BASE_URL}/admin/user/${numeroCel}/${endpoint}`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      let message = '';
      let type: 'success' | 'error' = 'success';

      if (response.ok) {
        const result = await response.json();
        message = result.message;

        // Si es una acción de balance exitosa, mostrar modal de confirmación
        if ((action === 'add_balance' || action === 'subtract_balance') && result) {
          setBalanceConfirmationData({
            type: action === 'add_balance' ? 'add' : 'subtract',
            username: username,
            amount: amount || 0,
            newBalance: result.data?.new_balance ?? result.new_balance ?? 0
          });
          setShowBalanceConfirmationModal(true);

          // Ocultar progress bar
          setShowProgressBar(false);
          return;
        }

        // Recargar datos del usuario para mostrar cambios
        if (action === 'update_user' && result.usuario_bc != null) {
          await searchUser(String(result.usuario_bc));
        } else {
          await searchUser();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const d = errorData.detail;
        message =
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x: { msg?: string }) => x.msg || JSON.stringify(x)).join(' ')
              : 'Error desconocido';
        type = 'error';
      }

      // Ocultar progress bar y mostrar modal de confirmación
      setShowProgressBar(false);
      setConfirmationMessage(message);
      setConfirmationType(type);
      setShowConfirmationModal(true);

    } catch (error) {
      console.error(`Error en operación ${action}:`, error);

      // Ocultar progress bar y mostrar error
      setShowProgressBar(false);
      setConfirmationMessage('Error de conexión. Intente nuevamente.');
      setConfirmationType('error');
      setShowConfirmationModal(true);
    }
  };

  const handleSaldoIncrement = () => {
    openCustomRecargaModal();
  };

  const handleSaldoDecrement = () => {
    openSubtractModal();
  };

  const openEditModal = () => {
    if (userData) {
      setEditUsername(userData.username);
      setEditPhoneNumber(userData.usuarioLogin);
      setEditPin(userData.pin);
      setShowEditModal(true);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditUsername('');
    setEditPhoneNumber('');
    setEditPin('');
  };

  const confirmEditUser = async () => {
    if (!editPhoneNumber.trim()) {
      alert('Por favor ingrese el usuario (login)');
      return;
    }

    if (!editPin.trim()) {
      alert('Por favor ingrese un PIN válido');
      return;
    }

    if (userData) {
      // Preparar solo los campos que cambiaron (username = nombre visible; usuario = login + Auth)
      const updates: Record<string, string> = {};

      if (editUsername.trim() !== (userData.username ?? '')) {
        updates.username = editUsername.trim();
      }
      if (editPhoneNumber.trim() !== userData.usuarioLogin) {
        updates.usuario = editPhoneNumber.trim();
      }
      if (editPin.trim() !== userData.pin) {
        updates.pin = editPin.trim();
      }

      if (Object.keys(updates).length > 0) {
        await handleUserAction('update_user', userData.numeroCel, userData.username || userData.usuarioLogin, undefined, undefined, updates);
        closeEditModal();
      } else {
        alert('No se realizaron cambios');
      }
    }
  };

  const formatNumberWithDots = (value: string) => {
    // Remover todos los caracteres no numéricos
    const numericValue = value.replace(/\D/g, '');

    // Si está vacío, devolver vacío
    if (!numericValue) return '';

    // Formatear con puntos como separadores de miles
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatCurrency = (amount: number | string) => {
    // Convertir a número si es string (manejar diferentes formatos)
    let numAmount: number;

    if (typeof amount === 'string') {
      // Limpiar string: remover caracteres no numéricos excepto punto, coma y guion
      const cleaned = amount.replace(/[^\d.,-]/g, '');
      // Convertir coma a punto para parseFloat
      numAmount = parseFloat(cleaned.replace(',', '.'));
    } else {
      numAmount = amount;
    }

    // Asegurarse de que sea un número válido
    if (isNaN(numAmount)) {
      return '0,00';
    }

    // Si el monto es muy grande, mostrar infinito
    const INFINITY_THRESHOLD = 9999999999; // 10 mil millones
    if (numAmount >= INFINITY_THRESHOLD) {
      return '∞';
    }

    // Formatear número con puntos como separadores de miles y coma para decimales
    return numAmount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Si no hay usuario, será redirigido por useEffect, pero permitimos renderizar con shimmer effects
  // durante la carga inicial para evitar pantalla negra

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Botón de Inicio */}
            <button
              onClick={handleHome}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              title="Ir al inicio"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>
            {/* Botón de Menú Desplegable */}
            <button
              onClick={toggleDrawer}
              className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-white rounded-lg"
              title="Abrir menú lateral"
            >
              <div className="flex flex-col space-y-1">
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
                <div className="w-5 h-0.5 bg-current rounded-full"></div>
              </div>
            </button>

            {/* Título */}
            <h1 className="text-2xl font-bold text-white">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <span>Hola,</span>
                  <Shimmer className="h-6 w-24" />
                </div>
              ) : (
                `Hola, ${user?.displayName || 'Admin'}`
              )}
            </h1>
          </div>

          <div className="flex items-center space-x-4">

            {/* Ícono de Perfil */}
            <button
              onClick={handleProfileClick}
              className="profile-button text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700 relative"
              title="Perfil de Administrador"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {/* Ícono de Logout */}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              title="Cerrar Sesión"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
          </div>

          {/* Popup de Perfil */}
          {showProfile && adminInfo && !loading && (
            <div className="profile-popup absolute top-full right-6 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Perfil de Administrador</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">ID</label>
                  <div className="text-white font-medium">
                    {loading || !adminInfo ? <Shimmer className="h-4 w-8" /> : adminInfo.id}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Nombre</label>
                  <div className="text-white font-medium">
                    {loading || !adminInfo ? <Shimmer className="h-4 w-24" /> : adminInfo.name}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <div className="text-white font-medium">
                    {loading || !adminInfo ? <Shimmer className="h-4 w-32" /> : adminInfo.email}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Rol</label>
                  <div className="text-white font-medium capitalize">
                    {loading || !adminInfo ? <Shimmer className="h-4 w-16" /> : adminInfo.role}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Estado</label>
                  <div className="font-medium">
                    {loading || !adminInfo ? (
                      <Shimmer className="h-4 w-28" />
                    ) : (
                      <span className={adminInfo.active ? 'text-green-400' : 'text-red-400'}>
                        {adminInfo.active ? 'Administrador Activo' : 'Administrador Inactivo'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Campo de Gestión de Usuario */}
          {!userData && (
            <div className={`bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-full max-w-md mx-auto shadow-2xl border border-gray-700/50 backdrop-blur-sm ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              {loading ? (
                // Shimmer effect para el contenedor de búsqueda
                <div className="text-center mb-8">
                  <div className="flex justify-center items-center mb-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <Shimmer className="h-8 w-48 mx-auto" />
                    <Shimmer className="h-4 w-64 mx-auto" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Header con icono */}
                  <div className="text-center mb-8">
                    <div className="flex justify-center items-center mb-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/20">
                        <img
                          src="/bancolombia-logo.png"
                          alt="Bancolombia"
                          className="h-full w-full object-contain p-1.5"
                        />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Gestionar usuario</h3>
                  </div>
                </>
              )}

              {/* Formulario (Enter en el campo envía la búsqueda) */}
              <div className="space-y-6">
                {loading ? (
                  <>
                    <Shimmer className="h-12 w-full rounded-lg" />
                    <Shimmer className="h-12 w-full rounded-xl" />
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!searching) {
                        void searchUser();
                      }
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <input
                        type="text"
                        id="userId"
                        value={userIdInput}
                        onChange={(e) => {
                          setUserIdInput(e.target.value);
                        }}
                        autoComplete="off"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                        placeholder="Usuario"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searching}
                      className="w-full border border-amber-500/90 bg-transparent text-amber-200 py-3 px-6 rounded-md transition-all duration-200 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-600 disabled:text-gray-500 enabled:hover:border-amber-400 enabled:hover:text-amber-100"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {searching ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Buscando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Buscar Usuario</span>
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                )}

                {/* Mensaje de error elegante */}
                {searchError && !loading && (
                  <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-300 text-sm font-medium">{searchError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subtítulo Acciones de Administrador */}
          {!userData && (
            <div className="text-center mt-6 mb-4">
              {loading ? (
                <Shimmer className="h-6 w-48 mx-auto" />
              ) : (
                <h4 className="text-lg font-medium text-gray-300">Acciones de administrador</h4>
              )}
            </div>
          )}

          {/* Botones de Acciones de Administrador */}
          {!userData && (
            <div className="flex justify-center gap-4 mt-4">
              {loading ? (
                <div className="aspect-square w-32 rounded-lg">
                  <Shimmer className="h-full w-full rounded-lg" />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewUserPhone('');
                    setNewUserPin('');
                    setNewUserInitialBalance('');
                    setShowCreateUserModal(true);
                  }}
                  className="aspect-square w-32 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-yellow-400 hover:text-yellow-300 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                >
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs text-center leading-tight">Crear nuevo usuario</span>
                </button>
              )}
            </div>
          )}

          {/* Usuario encontrado */}
          {userData && (
            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Usuario Encontrado</h3>
                <button
                  onClick={resetSearch}
                  className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                >
                  Nueva consulta
                </button>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                {/* Información Principal */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/20">
                    <img
                      src="/bancolombia-logo.png"
                      alt="Bancolombia"
                      className="h-full w-full object-contain p-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg">
                      {userData.username || userData.usuarioLogin}
                    </h4>
                    <p className="text-gray-400 text-sm">Usuario (login): {userData.usuarioLogin}</p>
                    <p className="text-gray-400 text-sm">
                      Número de cuenta:{' '}
                      <span className="text-gray-200 font-mono">
                        {userData.numeroCuenta || '—'}
                      </span>
                    </p>
                    <p className="text-gray-400 text-sm">Celular / número: {userData.numeroCel}</p>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    <button
                      onClick={openEditModal}
                      className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-full flex items-center justify-center transition-colors"
                      title="Editar usuario"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium w-fit ${
                    userData.baneado
                      ? 'bg-red-900 text-red-300'
                      : 'bg-green-900 text-green-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      userData.baneado ? 'bg-red-400' : 'bg-green-400'
                    }`}></span>
                    {userData.baneado ? 'Baneado' : 'Activo'}
                  </div>

                  {userData.baneado && userData.banned_reason && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                      <div className="text-red-300 text-sm font-medium mb-1">Razón del ban:</div>
                      <div className="text-red-200 text-sm">{userData.banned_reason}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-gray-400 text-sm mb-1">Saldo total (Bancolombia)</div>
                    <div className="text-2xl font-bold text-white mb-3 text-left">
                      {loading ? (
                        <Shimmer className="h-8 w-32" />
                      ) : (
                        `$${formatCurrency(parseFloat(userData.saldo || '0'))}`
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">PIN</div>
                    <div className="text-xl font-semibold text-yellow-400 mb-3">
                      {loading ? <Shimmer className="h-6 w-20" /> : (userData.pin || 'No disponible')}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">Dispositivo</div>
                    <div className={`text-lg font-semibold ${loading ? 'text-gray-400' : (userData.device_linked ? 'text-green-400' : 'text-red-400')}`}>
                      {loading ? <Shimmer className="h-5 w-24" /> : userData.device_status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Acciones Rápidas - Solo visible cuando hay usuario */}
          {userData && (
            <div className="bg-gray-700 p-6 rounded-lg mt-6">
              <h3 className="text-lg font-medium text-white mb-2">Acciones Rápidas</h3>
              <p className="text-gray-400 text-sm mb-4">Recargas</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Botón 1 */}
                <button
                  onClick={() => openRecargaModal('25k', '1.200.000')}
                  className="border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white hover:shadow-lg p-3 rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 bg-gray-800/50 backdrop-blur-sm"
                >
                  <span className="text-base font-semibold">25k</span>
                  <span className="text-xs">1.200.000</span>
                </button>

                {/* Botón 2 */}
                <button
                  onClick={() => openRecargaModal('35k', '2.600.000')}
                  className="border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white hover:shadow-lg p-3 rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 bg-gray-800/50 backdrop-blur-sm"
                >
                  <span className="text-base font-semibold">35k</span>
                  <span className="text-xs">2.600.000</span>
                </button>

                {/* Botón 3 */}
                <button
                  onClick={() => openRecargaModal('45k', '5.000.000')}
                  className="border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white hover:shadow-lg p-3 rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 bg-gray-800/50 backdrop-blur-sm"
                >
                  <span className="text-base font-semibold">45k</span>
                  <span className="text-xs">5.000.000</span>
                </button>

                {/* Botón 4 */}
                <button
                  onClick={() => openRecargaModal('60k', '10.000.000')}
                  className="border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white hover:shadow-lg p-3 rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 bg-gray-800/50 backdrop-blur-sm"
                >
                  <span className="text-base font-semibold">60k</span>
                  <span className="text-xs">10.000.000</span>
                </button>
              </div>

              {/* Gestión de Usuario */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <p className="text-gray-400 text-sm mb-4">Gestionar usuario</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      if (!userData) return;
                      if (userData.baneado) {
                        // Para habilitar usuario, acción directa
                        handleUserAction('unban', userData.numeroCel, userData.username);
                      } else {
                        // Para inhabilitar usuario, abrir modal para pedir razón
                        setBanReason('');
                        setShowBanModal(true);
                      }
                    }}
                    disabled={showProgressBar}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      userData.baneado
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                        : 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                    }`}
                  >
                    {userData.baneado ? 'Habilitar usuario' : 'Inhabilitar usuario'}
                  </button>

                  {userData.device_linked && (
                    <button
                      onClick={() => {
                        if (!userData) return;
                        handleUserAction('unlink', userData.numeroCel, userData.username);
                      }}
                      disabled={showProgressBar}
                      className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-red-700 hover:bg-red-800 text-white border border-red-600"
                    >
                      Desvincular dispositivo
                    </button>
                  )}

                  <button
                    onClick={() => setShowUserNotificationModal(true)}
                    disabled={showProgressBar}
                    className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-rose-800 hover:bg-rose-900 text-white border border-rose-600"
                  >
                    Enviar notificación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Confirmación de Recarga (portal, encima del de edición) */}
      {showRecargaModal &&
        recargaData &&
        userData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={MODAL_ROOT_STACK_PORTAL}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bancolombia-confirmar-recarga-title"
          >
            <div className={MODAL_BACKDROP} onClick={closeRecargaModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3
                id="bancolombia-confirmar-recarga-title"
                className="text-xl font-semibold text-white mb-4 text-center"
              >
                Confirmar Recarga
              </h3>

              <div className="text-center mb-6">
                <p className="text-gray-300 mb-2">
                  ¿Seguro que quieres recargar
                </p>
                <p className="text-yellow-400 font-semibold text-lg mb-2">
                  {recargaData.valor}
                </p>
                <p className="text-gray-300">
                  al usuario <span className="text-white font-medium">{userData.username}</span>?
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeRecargaModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  No
                </button>
                <button
                  onClick={confirmRecarga}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  Sí
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal de Recarga Personalizada (portal, encima del de edición) */}
      {showCustomRecargaModal &&
        userData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={MODAL_ROOT_STACK_PORTAL}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bancolombia-recarga-personalizada-title"
          >
            <div className={MODAL_BACKDROP} onClick={closeCustomRecargaModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3
                id="bancolombia-recarga-personalizada-title"
                className="text-xl font-semibold text-white mb-4 text-center"
              >
                Recarga personalizada
              </h3>

              <div className="mb-6">
                <label htmlFor="customAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  Monto a recargar ($)
                </label>
                <input
                  type="text"
                  id="customAmount"
                  value={customRecargaAmount}
                  onChange={(e) => {
                    // Permitir solo números
                    const numericValue = e.target.value.replace(/\D/g, '');
                    setCustomRecargaAmount(formatNumberWithDots(numericValue));
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Ej: 50000"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeCustomRecargaModal}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCustomRecarga}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  Recargar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal de Restar Saldo (portal, encima del de edición) */}
      {showSubtractModal &&
        userData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={MODAL_ROOT_STACK_PORTAL}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bancolombia-restar-saldo-title"
          >
            <div className={MODAL_BACKDROP} onClick={closeSubtractModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3
                id="bancolombia-restar-saldo-title"
                className="text-xl font-semibold text-white mb-4 text-center"
              >
                Restar saldo
              </h3>

              <div className="text-center mb-4">
                <p className="text-gray-300 mb-2">
                  Saldo actual: <span className="text-white font-semibold">
                    ${formatCurrency(parseFloat(userData.saldo || '0'))}
                  </span>
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="subtractAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  Monto a restar ($)
                </label>
                <input
                  type="text"
                  id="subtractAmount"
                  value={subtractAmount}
                  onChange={(e) => {
                    // Permitir solo números
                    const numericValue = e.target.value.replace(/\D/g, '');
                    setSubtractAmount(formatNumberWithDots(numericValue));
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ej: 25000"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeSubtractModal}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSubtract}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  Restar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal de Editar Usuario: portal a body, fuera de cualquier scroll de la página */}
      {showEditModal &&
        userData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={MODAL_ROOT_EDIT_PORTAL}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bancolombia-edit-user-title"
          >
            <div className={MODAL_BACKDROP} onClick={closeEditModal} />
            <div
              className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}
            >
            <div className="p-8">
              <h3
                id="bancolombia-edit-user-title"
                className="text-xl font-semibold text-white mb-6 text-center"
              >
                Editar Usuario
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="editUsername" className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre visible (campo username)
                  </label>
                  <input
                    type="text"
                    id="editUsername"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ingrese el nombre del usuario"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="editPhoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                    Usuario (login, campo usuario)
                  </label>
                  <input
                    type="text"
                    id="editPhoneNumber"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value.replace(/\s/g, ''))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Login del usuario"
                    maxLength={40}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="editPin" className="block text-sm font-medium text-gray-300 mb-2">
                    PIN de seguridad
                  </label>
                  <input
                    type="text"
                    id="editPin"
                    value={editPin}
                    onChange={(e) => {
                      // Permitir solo números y limitar a 4 dígitos máximo
                      const numericValue = e.target.value.replace(/\D/g, '');
                      if (numericValue.length <= 4) {
                        setEditPin(numericValue);
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ingrese el PIN (4 dígitos)"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Saldo disponible ($)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaldoDecrement}
                      className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                      type="button"
                      title="Restar saldo"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-xl font-bold text-green-400">
                        ${userData ? formatCurrency(parseFloat(userData.saldo || '0')) : '0,00'}
                      </div>
                      <div className="text-xs text-gray-400">Actual</div>
                    </div>
                    <button
                      onClick={handleSaldoIncrement}
                      className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                      type="button"
                      title="Recargar saldo"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-6 mt-6">
                <div className="flex space-x-3">
                  <button
                    onClick={closeEditModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmEditUser}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Progress Bar (portal, capa más alta) */}
      {showProgressBar &&
        typeof document !== 'undefined' &&
        createPortal(
        <div className={MODAL_ROOT_PROGRESS_PORTAL} role="status" aria-live="polite" aria-busy="true">
            <div className={MODAL_BACKDROP} />
            <div className={`${MODAL_PANEL_BASE} max-w-sm rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-yellow-500"></div>
                <p className="text-white text-center">Procesando operación...</p>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div className="h-2 w-full rounded-full bg-yellow-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal de Confirmación (portal, encima del de edición) */}
      {showConfirmationModal &&
        typeof document !== 'undefined' &&
        createPortal(
        <div
          className={MODAL_ROOT_STACK_PORTAL}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="bancolombia-confirmacion-inline-title"
        >
            <div className={MODAL_BACKDROP} onClick={() => setShowConfirmationModal(false)} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3 id="bancolombia-confirmacion-inline-title" className="sr-only">
                Resultado
              </h3>
              <div className="flex items-center justify-center mb-4">
                {confirmationType === 'success' ? (
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-white text-center mb-6">
                {confirmationMessage}
              </p>

              <div className="flex justify-center">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal de Ban */}
      {showBanModal && userData && (
        <div className={MODAL_ROOT_Z60}>
            <div className={MODAL_BACKDROP} onClick={closeBanModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Confirmar Inhabilitación
              </h3>

              <div className="text-center mb-6">
                <p className="text-gray-300 mb-4">
                  ¿Por qué deseas inhabilitar al usuario <span className="text-white font-medium">{userData.username}</span>?
                </p>

                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm mb-3 block">Razones comunes:</span>
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {[
                        'Solicitud del usuario',
                        'Cuenta sospechosa de actividad maliciosa',
                        'Venta no autorizada de la APK'
                      ].map((reason, index) => (
                        <button
                          key={index}
                          onClick={() => setBanReason(reason)}
                          className="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white text-sm transition-colors"
                          type="button"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-left">
                    <span className="text-gray-400 text-sm mb-2 block">Razón de la inhabilitación:</span>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ingresa la razón..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none"
                      rows={3}
                      maxLength={500}
                    />
                  </label>
                  <p className="text-xs text-gray-500 text-left">
                    {banReason.length}/500 caracteres
                  </p>
                </div>

                {/* Suspensión temporal */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="temporaryBan"
                      checked={isTemporaryBan}
                      onChange={(e) => setIsTemporaryBan(e.target.checked)}
                      className="h-4 w-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                    />
                    <label htmlFor="temporaryBan" className="ml-2 block text-sm text-gray-300">
                      Suspensión temporal
                    </label>
                  </div>

                  {isTemporaryBan && (
                    <div className="ml-6 mt-4">
                      <label htmlFor="banDays" className="block text-sm font-medium text-gray-300 mb-3">
                        Duración de la suspensión:
                      </label>
                      <div className="relative">
                        <select
                          id="banDays"
                          value={banDays}
                          onChange={(e) => setBanDays(parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none pr-10 transition-colors hover:bg-gray-650"
                        >
                          <option value={1}>1 día</option>
                          <option value={3}>3 días</option>
                          <option value={7}>7 días</option>
                          <option value={14}>14 días</option>
                          <option value={30}>30 días</option>
                          <option value={60}>60 días</option>
                          <option value={90}>90 días</option>
                        </select>
                        {/* Icono de flecha personalizada */}
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {/* Información adicional */}
                      <p className="text-xs text-gray-500 mt-2">
                        La cuenta se habilitará automáticamente después de {banDays} día{banDays !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeBanModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                  disabled={showProgressBar}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBan}
                  disabled={!banReason.trim() || showProgressBar}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  {showProgressBar ? 'Procesando...' : 'Inhabilitar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Balance (portal, encima del de edición) */}
      {showBalanceConfirmationModal &&
        balanceConfirmationData &&
        typeof document !== 'undefined' &&
        createPortal(
        <div
          className={MODAL_ROOT_STACK_PORTAL}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bancolombia-balance-confirm-title"
        >
            <div className={MODAL_BACKDROP} onClick={closeBalanceConfirmationModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-lg rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              {/* Confirmación de operación exitosa */}
              <div className="flex items-center justify-center mb-4 p-3 bg-green-900/50 border border-green-500/50 rounded-lg">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-300 font-medium">
                  Saldo {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'} correctamente
                </span>
              </div>

              <h3
                id="bancolombia-balance-confirm-title"
                className="text-xl font-semibold text-white mb-4 text-center"
              >
                Comparte este mensaje con el cliente
              </h3>

              <div className="relative">
                <button
                  onClick={copyBalanceMessage}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copiar mensaje"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-500/50 rounded-lg p-4 text-white">
                  <div className="text-center space-y-3">
                    <div className="text-2xl">💰</div>
                    <div className="text-xl font-bold text-green-300">
                      ¡Saldo {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'} correctamente!
                    </div>

                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span>👤</span>
                        <span>Usuario: <span className="font-semibold text-green-200">{balanceConfirmationData.username}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>{balanceConfirmationData.type === 'add' ? '💚' : '❤️'}</span>
                        <span>Monto {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'}: <span className="font-semibold text-green-200">${formatCurrency(balanceConfirmationData.amount)}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>💵</span>
                        <span>Nuevo saldo: <span className="font-semibold text-green-200">${formatCurrency(balanceConfirmationData.newBalance)}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2 pt-2">
                        <span>✅</span>
                        <span className="font-semibold text-green-300">¡Operación completada exitosamente!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={closeBalanceConfirmationModal}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal Crear Usuario Nuevo */}
      {showCreateUserModal && (
        <div className={MODAL_ROOT_Z60}>
            <div className={MODAL_BACKDROP} onClick={closeCreateUserModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Crear usuario Nuevo
              </h3>

              <div className="space-y-4">
                {/* Campo Teléfono */}
                <div>
                  <label htmlFor="newUserPhone" className="block text-sm font-medium text-gray-300 mb-2">
                    Usuario
                  </label>
                  <input
                    type="text"
                    id="newUserPhone"
                    value={newUserPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 10) {
                        setNewUserPhone(value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ej: 3000000000"
                    maxLength={10}
                  />
                </div>

                {/* Campo PIN */}
                <div>
                  <label htmlFor="newUserPin" className="block text-sm font-medium text-gray-300 mb-2">
                    PIN de seguridad (4 dígitos)
                  </label>
                  <input
                    type="text"
                    id="newUserPin"
                    value={newUserPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 4) {
                        setNewUserPin(value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ej: 1234"
                    maxLength={4}
                  />
                </div>

                {/* Campo Saldo Inicial */}
                <div>
                  <label htmlFor="newUserInitialBalance" className="block text-sm font-medium text-gray-300 mb-2">
                    Saldo inicial ($)
                  </label>
                  <input
                    type="text"
                    id="newUserInitialBalance"
                    value={newUserInitialBalance}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setNewUserInitialBalance(formatNumberWithDots(value));
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ej: 50000"
                  />
                </div>

                {/* Subtítulo Crear random */}
                <div className="text-center mt-6 mb-4">
                  <h4 className="text-lg font-medium text-gray-300">Crear random</h4>
                </div>

                {/* Botones de saldo predefinidos */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQuickBalance('1200000', '25k')}
                    className={`px-3 py-2 rounded-md transition-colors text-sm text-center ${
                      selectedRandomOption === '25k'
                        ? 'bg-yellow-600 border-yellow-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">25k</div>
                    <div className="text-xs">1.200.000</div>
                  </button>

                  <button
                    onClick={() => setQuickBalance('2600000', '35k')}
                    className={`px-3 py-2 rounded-md transition-colors text-sm text-center ${
                      selectedRandomOption === '35k'
                        ? 'bg-yellow-600 border-yellow-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">35k</div>
                    <div className="text-xs">2.600.000</div>
                  </button>

                  <button
                    onClick={() => setQuickBalance('5000000', '45k')}
                    className={`px-3 py-2 rounded-md transition-colors text-sm text-center ${
                      selectedRandomOption === '45k'
                        ? 'bg-yellow-600 border-yellow-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">45k</div>
                    <div className="text-xs">5.000.000</div>
                  </button>

                  <button
                    onClick={() => setQuickBalance('10000000', '60k')}
                    className={`px-3 py-2 rounded-md transition-colors text-sm text-center ${
                      selectedRandomOption === '60k'
                        ? 'bg-yellow-600 border-yellow-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">60k</div>
                    <div className="text-xs">10.000.000</div>
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={closeCreateUserModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={createNewUser}
                  disabled={!newUserPhone.trim() || !newUserPin.trim() || !newUserInitialBalance.trim() || newUserPin.length !== 4 || showProgressBar}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  {showProgressBar ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificación a Usuario Específico */}
      {showUserNotificationModal && userData && (
        <div className={MODAL_ROOT_Z50}>
            <div className={MODAL_BACKDROP} onClick={closeUserNotificationModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Enviar Notificación
              </h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                A: <span className="text-white font-medium">{userData.username}</span> ({userData.numeroCel})
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="userNotificationTitle" className="block text-sm font-medium text-gray-300 mb-2">
                    Título de la notificación
                  </label>
                  <input
                    type="text"
                    id="userNotificationTitle"
                    value={userNotificationTitle}
                    onChange={(e) => setUserNotificationTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ej: ¡Mensaje importante!"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label htmlFor="userNotificationBody" className="block text-sm font-medium text-gray-300 mb-2">
                    Mensaje de la notificación
                  </label>
                  <textarea
                    id="userNotificationBody"
                    value={userNotificationBody}
                    onChange={(e) => setUserNotificationBody(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                    placeholder="Escribe el mensaje que quieres enviar..."
                    rows={4}
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="border-t border-gray-600 pt-6 mt-6">
                <div className="flex space-x-3">
                  <button
                    onClick={closeUserNotificationModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendUserNotification}
                    disabled={sendingUserNotification || !userNotificationTitle.trim() || !userNotificationBody.trim()}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    {sendingUserNotification ? 'Enviando...' : 'Enviar Notificación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usuario Creado */}
      {showUserCreatedModal && (
        <div className={MODAL_ROOT_Z60}>
            <div className={MODAL_BACKDROP} onClick={closeUserCreatedModal} />
            <div className={`${MODAL_PANEL_BASE} max-w-lg rounded-lg border border-gray-700 bg-gray-800 shadow-xl`}>
            <div className="p-6">
              {/* Confirmación de usuario creado */}
              <div className="flex items-center justify-center mb-4 p-3 bg-green-900/50 border border-green-500/50 rounded-lg">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-300 font-medium">
                  Usuario creado correctamente
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Comparte este mensaje con el cliente
              </h3>

              <div className="relative">
                <button
                  onClick={copyUserCreatedMessage}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copiar mensaje"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-500/50 rounded-lg p-4 text-white max-w-full">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed break-words overflow-x-auto max-w-full">
                    {userCreatedMessage}
                  </pre>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={closeUserCreatedModal}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Estadísticas */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay con efecto blur */}
          <div
            className={`fixed inset-0 backdrop-blur-xl backdrop-brightness-75 transition-opacity duration-200 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={toggleDrawer}
          />

          {/* Drawer */}
          <div className={`relative w-full max-w-md bg-gray-800/95 backdrop-blur-xl border-r border-gray-700/50 shadow-2xl transform transition-transform duration-200 ${
            isAnimating ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Header del Drawer */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                  <img
                    src="https://unpkg.com/lucide-static@0.294.0/icons/headphones.svg"
                    alt="Soporte"
                    className="w-6 h-6 filter brightness-0 invert"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{adminInfo?.name || 'Administrador'}</h2>
                  <p className="text-gray-400 text-sm">ID: {adminInfo?.id || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">{adminInfo?.email || 'admin@admin.com'}</p>
                  <p className="text-gray-500 text-xs capitalize">{adminInfo?.role || 'admin'}</p>
                  <p className={`text-xs font-medium ${adminInfo?.active ? 'text-green-400' : 'text-red-400'}`}>
                    {adminInfo?.active ? 'Administrador Activo' : 'Administrador Inactivo'}
                  </p>
                </div>
              </div>
            <button
              onClick={toggleDrawer}
              className="w-10 h-10 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
            >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Contenido del Drawer */}
            <div className="flex-1 overflow-y-auto">
              {/* Información de Fondos */}
              <div className="px-6 py-3 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Fondos Disponibles</span>
                  <span className="text-white font-bold text-lg">
                    {loading || !adminInfo ? (
                      <Shimmer className="h-6 w-24" />
                    ) : (
                      `$${adminInfo.balance?.toLocaleString('es-CO') || '0'}`
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/admin-panel/tarifas"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                <span>Tarifas</span>
              </Link>
              <div className="border-b border-gray-700/50"></div>

              <Link
                href="/admin-panel/estadisticas"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>Ver Estadísticas</span>
                </Link>
              <div className="border-b border-gray-700/50"></div>

              <Link
                href="/admin-panel/registros"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Registros</span>
                </Link>
              <div className="border-b border-gray-700/50"></div>

              <Link
                href="/admin-panel/reporte-facturacion-sms"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>Reporte facturación SMS</span>
                </Link>
              <div className="border-b border-gray-700/50"></div>

              <Link
                href="/admin-panel/operations"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Operaciones técnicas</span>
                </Link>
              <div className="border-b border-gray-700/50"></div>

              <Link
                href="/admin-panel/ganancias"
                onClick={toggleDrawer}
                className="w-full text-white py-3 px-6 rounded-none font-medium flex items-center space-x-3 hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8" />
                </svg>
                <span>Ganancias</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  return <AdminPanelContent />;
}
