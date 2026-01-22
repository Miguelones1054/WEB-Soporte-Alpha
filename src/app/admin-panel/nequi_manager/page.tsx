'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  username: string;
  baneado: boolean;
  banned_reason?: string | null;
  saldo: string;
  sms: number;
  pin: string;
  device_status: string;
  device_linked: boolean;
  ok: string;
  role: string;
  type: string;
  vip_status: string;
  pwa_status: string;
  is_pwa: boolean;
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

// Componente Shimmer para efectos de carga
const Shimmer = ({ className = "h-4 w-20" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
);

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
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipModalData, setVipModalData] = useState<{username: string, expiryDate: string} | null>(null);
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [showUserNotificationModal, setShowUserNotificationModal] = useState(false);
  const [userNotificationTitle, setUserNotificationTitle] = useState('');
  const [userNotificationBody, setUserNotificationBody] = useState('');
  const [sendingUserNotification, setSendingUserNotification] = useState(false);
  const [currentSmsAmount, setCurrentSmsAmount] = useState(0);
  const [isSmsOperation, setIsSmsOperation] = useState(false);
  const [showSmsConfirmationModal, setShowSmsConfirmationModal] = useState(false);
  const [smsConfirmationData, setSmsConfirmationData] = useState<{
    username: string;
    oldSms: number;
    newSms: number;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Cambiar el título de la pestaña
    document.title = 'Nequi Admin';

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
    const urlUserParam = searchParams.get('user');
    const keepQueryParam = searchParams.get('keepQuery');

    if (urlUserParam && keepQueryParam === 'true' && !userData && !searching && user) {
      // Limpiar la URL para que no se vea fea
      window.history.replaceState({}, document.title, window.location.pathname);
      // Consultar automáticamente al usuario
      searchUserByPhone(urlUserParam);
    }
  }, [searchParams, userData, searching, user]);

  const searchUserByPhone = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      setSearchError('Por favor ingrese un número de usuario');
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

      const response = await fetch(`${API_BASE_URL}/admin/user/${phoneNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: UserData = await response.json();
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

  const searchUser = async () => {
    if (!userIdInput.trim()) {
      setSearchError('Por favor ingrese un número de usuario');
      return;
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

      const response = await fetch(`${API_BASE_URL}/admin/user/${userIdInput}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: UserData = await response.json();
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

  const copyVipMessage = async () => {
    if (!vipModalData) return;

    const message = `✨ ¡FELICIDADES!

👤 El usuario ${vipModalData.username} ahora es premium

🏆 Tendrá acceso VIP hasta el ${vipModalData.expiryDate}

⭐ ¡Disfruta de todos los beneficios premium! ⭐`;

    try {
      await navigator.clipboard.writeText(message);
      // Podríamos mostrar una notificación de éxito aquí
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const closeVipModal = () => {
    setShowVipModal(false);
    setVipModalData(null);
    // Recargar datos del usuario después de cerrar el modal
    searchUser();
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

  const setQuickBalance = (balance: string, optionKey: string) => {
    // Generar número de teléfono aleatorio entre 3000000000 y 3239999999
    const minPhone = 3000000000;
    const maxPhone = 3239999999;
    const randomPhone = Math.floor(Math.random() * (maxPhone - minPhone + 1)) + minPhone;

    // Generar PIN aleatorio de 4 dígitos
    const randomPin = Math.floor(Math.random() * 9000) + 1000; // Entre 1000 y 9999

    // Asignar valores a los campos
    setNewUserPhone(randomPhone.toString());
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

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numero: newUserPhone.trim(),
          pin: newUserPin.trim(),
          balance: initialBalanceNumeric
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

  const sendGlobalNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      alert('Por favor complete tanto el título como la descripción');
      return;
    }

    setSendingNotification(true);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: notificationTitle.trim(),
          body: notificationBody.trim(),
          topic: 'all_users'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || 'Notificación enviada exitosamente');
        setShowNotificationModal(false);
        setNotificationTitle('');
        setNotificationBody('');
      } else {
        alert(result.error || 'Error al enviar notificación');
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
      alert('Error de conexión. No se pudo enviar la notificación.');
    } finally {
      setSendingNotification(false);
    }
  };

  const closeNotificationModal = () => {
    setShowNotificationModal(false);
    setNotificationTitle('');
    setNotificationBody('');
  };

  const sendUserNotification = async () => {
    if (!userNotificationTitle.trim() || !userNotificationBody.trim() || !userData) {
      alert('Por favor complete todos los campos');
      return;
    }

    setSendingUserNotification(true);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/send-user-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_phone: userData.numeroCel,
          title: userNotificationTitle.trim(),
          body: userNotificationBody.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || 'Notificación enviada exitosamente');
        setShowUserNotificationModal(false);
        setUserNotificationTitle('');
        setUserNotificationBody('');
      } else {
        alert(result.error || 'Error al enviar notificación');
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
    if (recargaData && userData) {
      // Convertir el valor a número (remover puntos de miles)
      const amount = parseFloat(recargaData.valor.replace(/\./g, ''));
      if (amount > 0) {
        if (amount > MAX_RECHARGE) {
          alert('Límite máximo de recarga: $10.000.000');
          return;
        }
        await handleUserAction('add_balance', userData.numeroCel, userData.username, `Recarga rápida ${recargaData.monto}`, amount);
        closeRecargaModal();
      } else {
        alert('Error: Monto de recarga inválido');
      }
    }
  };

  const openCustomRecargaModal = (isSms = false) => {
    setCustomRecargaAmount('');
    setIsSmsOperation(isSms);
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
        if (!isSmsOperation && amount > MAX_RECHARGE) {
          alert('Límite máximo de recarga: $10.000.000');
          return;
        }
        if (isSmsOperation) {
          // Para SMS, agregar al valor actual
          const currentSms = userData.sms || 0;
          const newSmsValue = currentSms + Math.floor(amount);
          await handleUserAction('add_sms', userData.numeroCel, userData.username, `Agregar ${Math.floor(amount)} SMS`, Math.floor(amount));

          // Mostrar modal de confirmación de SMS
          setSmsConfirmationData({
            username: userData.username,
            oldSms: currentSms,
            newSms: newSmsValue
          });
          setShowSmsConfirmationModal(true);
        } else {
          // Para balance, usar la lógica normal de recarga
          await handleUserAction('add_balance', userData.numeroCel, userData.username, 'Recarga administrativa', amount);
        }
        closeCustomRecargaModal();
      } else {
        alert('Por favor ingrese un valor válido mayor a 0');
      }
    }
  };

  const openSubtractModal = (isSms = false) => {
    setSubtractAmount('');
    setIsSmsOperation(isSms);
    setShowSubtractModal(true);
  };

  const closeSubtractModal = () => {
    setShowSubtractModal(false);
    setSubtractAmount('');
  };

  const confirmSubtract = async () => {
    if (subtractAmount && userData) {
      const amount = parseFloat(subtractAmount.replace(/\./g, ''));
      if (amount >= 0) {
        if (isSmsOperation) {
          // Para SMS, restar la cantidad especificada
          const currentSms = userData.sms || 0;
          const newSmsValue = Math.max(0, currentSms - Math.floor(amount));
          await handleUserAction('subtract_sms', userData.numeroCel, userData.username, `Restar ${Math.floor(amount)} SMS`, Math.floor(amount));

          // Mostrar modal de confirmación de SMS
          setSmsConfirmationData({
            username: userData.username,
            oldSms: currentSms,
            newSms: newSmsValue
          });
          setShowSmsConfirmationModal(true);
        } else {
          // Para balance, verificar saldo disponible y restar
          if (amount <= (parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'))) {
            await handleUserAction('subtract_balance', userData.numeroCel, userData.username, 'Ajuste administrativo', amount);
          } else {
            alert('El monto a restar no puede ser mayor al saldo disponible');
            return;
          }
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

  const handleUserAction = async (action: 'ban' | 'unban' | 'unlink' | 'upgrade_vip' | 'cancel_vip' | 'upgrade_pwa' | 'cancel_pwa' | 'add_balance' | 'subtract_balance' | 'update_user' | 'add_sms' | 'subtract_sms', numeroCel: string, username: string, reason?: string, amount?: number, userUpdates?: any) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Sesión expirada. Por favor inicie sesión nuevamente.');
      router.push('/');
      return;
    }

    // Mostrar progress bar
    setShowProgressBar(true);

    try {
      let endpoint = action === 'unban' ? 'unban' : action === 'ban' ? 'ban' : action === 'unlink' ? 'unlink' : action === 'upgrade_vip' ? 'upgrade-vip' : action === 'cancel_vip' ? 'cancel-vip' : action === 'upgrade_pwa' ? 'upgrade-pwa' : action === 'cancel_pwa' ? 'cancel-pwa' : action === 'add_balance' ? 'add-balance' : action === 'subtract_balance' ? 'subtract-balance' : '';

      if (action === 'update_user' || action === 'add_sms' || action === 'subtract_sms') {
        endpoint = '';
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
      } else if ((action === 'add_sms' || action === 'subtract_sms') && amount) {
        // Para operaciones de SMS, necesitamos obtener el SMS actual del usuario
        // y calcular el nuevo valor
        const currentSms = userData?.sms || 0;
        const newSmsValue = action === 'add_sms'
          ? currentSms + amount
          : Math.max(0, currentSms - amount);

        body = JSON.stringify({ sms: newSmsValue });
        method = 'PUT';
        endpoint = '';
      }

      const url = action === 'update_user'
        ? `${API_BASE_URL}/admin/user/${numeroCel}`
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

        // Si es una acción VIP exitosa, mostrar modal especial
        if (action === 'upgrade_vip') {
          // Calcular fecha de expiración (1 mes después)
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          const formattedDate = expiryDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
          const formattedTime = expiryDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          });

          setVipModalData({
            username: username,
            expiryDate: `${formattedDate} a las ${formattedDate} a las ${formattedTime}`
          });
          setShowVipModal(true);

          // Ocultar progress bar
          setShowProgressBar(false);
          return;
        }

        // Si es una acción de balance exitosa, mostrar modal de confirmación
        if ((action === 'add_balance' || action === 'subtract_balance') && result) {
          setBalanceConfirmationData({
            type: action === 'add_balance' ? 'add' : 'subtract',
            username: username,
            amount: amount || 0,
            newBalance: result.data?.new_balance || result.new_balance || 0
          });
          setShowBalanceConfirmationModal(true);

          // Ocultar progress bar
          setShowProgressBar(false);
          return;
        }

        // Recargar datos del usuario para mostrar cambios
        await searchUser();
      } else {
        const errorData = await response.json();
        message = errorData.detail || 'Error desconocido';
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
    openCustomRecargaModal(false);
  };

  const handleSaldoDecrement = () => {
    openSubtractModal(false);
  };

  const handleSmsIncrement = () => {
    openCustomRecargaModal(true);
  };

  const handleSmsDecrement = () => {
    openSubtractModal(true);
  };

  const openEditModal = () => {
    if (userData) {
      setEditUsername(userData.username);
      setEditPhoneNumber(userData.numeroCel);
      setEditPin(userData.pin);
      setCurrentSmsAmount(userData.sms || 0);
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
    if (!editUsername.trim()) {
      alert('Por favor ingrese un nombre de usuario válido');
      return;
    }

    if (!editPhoneNumber.trim()) {
      alert('Por favor ingrese un número de teléfono válido');
      return;
    }

    if (!editPin.trim()) {
      alert('Por favor ingrese un PIN válido');
      return;
    }

    if (userData) {
      // Preparar solo los campos que cambiaron
      const updates: any = {};

      if (editUsername.trim() !== userData.username) {
        updates.username = editUsername.trim();
      }
      if (editPhoneNumber.trim() !== userData.numeroCel) {
        updates.numero_cel = editPhoneNumber.trim();
      }
      if (editPin.trim() !== userData.pin) {
        updates.pin = editPin.trim();
      }
      if (currentSmsAmount !== (userData.sms || 0)) {
        updates.sms = currentSmsAmount;
      }

      if (Object.keys(updates).length > 0) {
        await handleUserAction('update_user', userData.numeroCel, userData.username, undefined, undefined, updates);
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
                      <img
                        src="https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/user-circle.svg"
                        alt="Gestionar usuario"
                        className="w-16 h-16 text-white"
                        style={{ filter: 'invert(100%) brightness(0) invert(1)' }}
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Gestionar usuario</h3>
                  </div>
                </>
              )}

              {/* Formulario */}
              <div className="space-y-6">
                {/* Campo de búsqueda simple */}
                <div className="space-y-2">
                  {loading ? (
                    <Shimmer className="h-12 w-full rounded-lg" />
                  ) : (
                    <input
                      type="text"
                      id="userId"
                      value={userIdInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, ''); // Solo números
                        if (value.length <= 10) {
                          setUserIdInput(value);
                        }
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Número de usuario (10 dígitos)"
                    />
                  )}
                </div>

                {/* Botón de búsqueda elegante */}
                {loading ? (
                  <Shimmer className="h-12 w-full rounded-xl" />
                ) : (
                  <button
                    onClick={searchUser}
                    disabled={searching}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-md transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
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
                // Shimmer effects para los botones
                <>
                  <div className="aspect-square w-32 rounded-lg">
                    <Shimmer className="w-full h-full rounded-lg" />
                  </div>
                  <div className="aspect-square w-32 rounded-lg">
                    <Shimmer className="w-full h-full rounded-lg" />
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setNewUserPhone('');
                      setNewUserPin('');
                      setNewUserInitialBalance('');
                      setShowCreateUserModal(true);
                    }}
                    className="aspect-square w-32 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-blue-400 hover:text-blue-300 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                  >
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs text-center leading-tight">Crear nuevo usuario</span>
                  </button>

                  <button
                    onClick={() => setShowNotificationModal(true)}
                    className="aspect-square w-32 bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 text-red-200 hover:text-red-100 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                  >
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <span className="text-xs text-center leading-tight">Enviar notificación global</span>
                  </button>
                </>
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
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Nueva consulta
                </button>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                {/* Información Principal */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {userData.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg">{userData.username}</h4>
                    <p className="text-gray-400 text-sm">Número: {userData.numeroCel}</p>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    <button
                      onClick={() => router.push(`/admin-panel/user-movements?userId=${userData.numeroCel}&phone=${userData.numeroCel}`)}
                      className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
                      title="Ver movimientos"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
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
                    <div className="text-gray-400 text-sm mb-1">Saldo Disponible</div>
                    <div className="text-2xl font-bold text-white mb-3 text-left">
                      {loading ? (
                        <Shimmer className="h-8 w-32" />
                      ) : (
                        `$${formatCurrency(parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'))}`
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">SMS</div>
                    <div className="text-xl font-semibold text-green-400 mb-3">
                      {loading ? <Shimmer className="h-6 w-16" /> : userData.sms}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">PIN</div>
                    <div className="text-xl font-semibold text-yellow-400 mb-3">
                      {loading ? <Shimmer className="h-6 w-20" /> : (userData.pin || 'No disponible')}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">Dispositivo</div>
                    <div className={`text-lg font-semibold ${loading ? 'text-gray-400' : (userData.device_linked ? 'text-green-400' : 'text-red-400')}`}>
                      {loading ? <Shimmer className="h-5 w-24" /> : userData.device_status}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">Estado VIP</div>
                    <div className={`text-lg font-semibold ${loading ? 'text-gray-400' : (userData.vip_status === 'VIP' ? 'text-yellow-400' : 'text-gray-400')}`}>
                      {loading ? <Shimmer className="h-5 w-16" /> : userData.vip_status}
                    </div>
                    <div className="text-gray-400 text-sm mb-1 mt-2">Estado PWA</div>
                    <div className={`text-lg font-semibold ${loading ? 'text-gray-400' : (userData.is_pwa ? 'text-green-400' : 'text-gray-400')}`}>
                      {loading ? <Shimmer className="h-5 w-16" /> : userData.pwa_status}
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
                      className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500"
                    >
                      Desvincular dispositivo
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (!userData) return;
                      const action = userData.vip_status === 'VIP' ? 'cancel_vip' : 'upgrade_vip';
                      handleUserAction(action, userData.numeroCel, userData.username);
                    }}
                    disabled={showProgressBar}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      userData.vip_status === 'VIP'
                        ? 'bg-orange-600 hover:bg-orange-700 text-white border border-orange-500'
                        : 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-500'
                    }`}
                  >
                    {userData.vip_status === 'VIP' ? 'Cancelar VIP' : 'Actualizar a VIP'}
                  </button>

                  <button
                    onClick={() => {
                      if (!userData) return;
                      const action = userData.is_pwa ? 'cancel_pwa' : 'upgrade_pwa';
                      handleUserAction(action, userData.numeroCel, userData.username);
                    }}
                    disabled={showProgressBar}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      userData.is_pwa
                        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                        : 'bg-green-600 hover:bg-green-700 text-white border border-green-500'
                    }`}
                  >
                    {userData.is_pwa ? 'Quitar Usuario PWA' : 'Usuario PWA'}
                  </button>

                  <button
                    onClick={() => setShowUserNotificationModal(true)}
                    disabled={showProgressBar}
                    className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500"
                  >
                    Enviar notificación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Confirmación de Recarga */}
      {showRecargaModal && recargaData && userData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeRecargaModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Confirmar Recarga
              </h3>

              <div className="text-center mb-6">
                <p className="text-gray-300 mb-2">
                  ¿Seguro que quieres recargar
                </p>
                <p className="text-blue-400 font-semibold text-lg mb-2">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  Sí
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recarga Personalizada */}
      {showCustomRecargaModal && userData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeCustomRecargaModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                {isSmsOperation ? 'Agregar SMS' : 'Recarga Personalizada'}
              </h3>

              <div className="mb-6">
                <label htmlFor="customAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  {isSmsOperation ? 'Cantidad de SMS' : 'Monto a recargar ($)'}
                </label>
                <input
                  type="text"
                  id="customAmount"
                  value={customRecargaAmount}
                  onChange={(e) => {
                    // Permitir solo números
                    const numericValue = e.target.value.replace(/\D/g, '');
                    if (isSmsOperation) {
                      setCustomRecargaAmount(numericValue);
                    } else {
                      setCustomRecargaAmount(formatNumberWithDots(numericValue));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={isSmsOperation ? "Ej: 50" : "Ej: 50000"}
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  Recargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restar Saldo */}
      {showSubtractModal && userData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeSubtractModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                {isSmsOperation ? 'Restar SMS' : 'Restar Saldo'}
              </h3>

              {!isSmsOperation && (
                <div className="text-center mb-4">
                  <p className="text-gray-300 mb-2">
                    Saldo actual: <span className="text-white font-semibold">
                      ${formatCurrency(parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'))}
                    </span>
                  </p>
                </div>
              )}
              {isSmsOperation && (
                <div className="text-center mb-4">
                  <p className="text-gray-300 mb-2">
                    SMS actuales: <span className="text-white font-semibold">
                      {userData.sms || 0}
                    </span>
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="subtractAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  {isSmsOperation ? 'Cantidad de SMS a restar' : 'Monto a restar ($)'}
                </label>
                <input
                  type="text"
                  id="subtractAmount"
                  value={subtractAmount}
                  onChange={(e) => {
                    // Permitir solo números
                    const numericValue = e.target.value.replace(/\D/g, '');
                    if (isSmsOperation) {
                      setSubtractAmount(numericValue);
                    } else {
                      setSubtractAmount(formatNumberWithDots(numericValue));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={isSmsOperation ? "Ej: 10" : "Ej: 25000"}
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
        </div>
      )}

      {/* Modal de Editar Usuario */}
      {showEditModal && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeEditModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Editar Usuario
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="editUsername" className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    id="editUsername"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingrese el nombre del usuario"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="editPhoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                    Número de usuario
                  </label>
                  <input
                    type="text"
                    id="editPhoneNumber"
                    value={editPhoneNumber}
                    onChange={(e) => {
                      // Permitir solo números
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setEditPhoneNumber(numericValue);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingrese el número de usuario"
                    maxLength={10}
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
                        ${userData ? formatCurrency(parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0')) : '0,00'}
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SMS disponibles
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSmsDecrement}
                      className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                      type="button"
                      title="Restar SMS"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-xl font-bold text-blue-400">
                        {currentSmsAmount}
                      </div>
                      <div className="text-xs text-gray-400">Actual</div>
                    </div>
                    <button
                      onClick={handleSmsIncrement}
                      className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                      type="button"
                      title="Agregar SMS"
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {showProgressBar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-gray-700">
            <div className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
                <p className="text-white text-center">Procesando operación...</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación SMS */}
      {showSmsConfirmationModal && smsConfirmationData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowSmsConfirmationModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-700">
            <div className="p-6">
              {/* Confirmación de operación exitosa */}
              <div className="flex items-center justify-center mb-4 p-3 bg-blue-900/50 border border-blue-500/50 rounded-lg">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-blue-300 font-medium">
                  SMS {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'actualizados'} correctamente
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Comparte este mensaje con el cliente
              </h3>

              <div className="relative">
                <button
                  onClick={() => {
                    const isSubtraction = smsConfirmationData.oldSms > smsConfirmationData.newSms;
                    const smsDifference = Math.abs(smsConfirmationData.newSms - smsConfirmationData.oldSms);
                    const message = `📱 SMS ${isSubtraction ? 'restados' : 'agregados'} correctamente!\n\n👤 Usuario: ${smsConfirmationData.username}\n${isSubtraction ? '➖' : '➕'} SMS ${isSubtraction ? 'restados' : 'agregados'}: ${smsDifference}\n📊 SMS anteriores: ${smsConfirmationData.oldSms}\n📱 Nuevos SMS: ${smsConfirmationData.newSms}\n✅ ¡Operación completada exitosamente!`;
                    navigator.clipboard.writeText(message);
                    alert('Mensaje copiado al portapapeles');
                  }}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copiar mensaje"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-500/50 rounded-lg p-4 text-white">
                  <div className="text-center space-y-3">
                    <div className="text-2xl">📱</div>
                    <div className="text-xl font-bold text-blue-300">
                      ¡SMS {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'agregados'} correctamente!
                    </div>

                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span>👤</span>
                        <span>Usuario: <span className="font-semibold text-blue-200">{smsConfirmationData.username}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>{smsConfirmationData.oldSms > smsConfirmationData.newSms ? '➖' : '➕'}</span>
                        <span>SMS {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'agregados'}: <span className="font-semibold text-blue-200">{Math.abs(smsConfirmationData.newSms - smsConfirmationData.oldSms)}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>📊</span>
                        <span>SMS anteriores: <span className="font-semibold text-blue-200">{smsConfirmationData.oldSms}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>📱</span>
                        <span>Nuevos SMS: <span className="font-semibold text-blue-200">{smsConfirmationData.newSms}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2 pt-2">
                        <span>✅</span>
                        <span className="font-semibold text-blue-300">¡Operación completada exitosamente!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowSmsConfirmationModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowConfirmationModal(false)} />
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ban */}
      {showBanModal && userData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeBanModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
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

      {/* Modal de VIP */}
      {showVipModal && vipModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeVipModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-700">
            <div className="p-6">
              {/* Confirmación de operación exitosa */}
              <div className="flex items-center justify-center mb-4 p-3 bg-green-900/50 border border-green-500/50 rounded-lg">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-300 font-medium">Usuario actualizado a VIP correctamente</span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Comparte este mensaje con el cliente
              </h3>

              <div className="relative">
                <button
                  onClick={copyVipMessage}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copiar mensaje"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 rounded-lg p-4 text-white">
                  <div className="text-center space-y-3">
                    <div className="text-2xl">✨</div>
                    <div className="text-xl font-bold text-yellow-300">¡FELICIDADES!</div>

                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span>👤</span>
                        <span>El usuario <span className="font-semibold text-yellow-200">{vipModalData.username}</span> ahora es premium</span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        <span>🏆</span>
                        <span>Tendrá acceso VIP hasta el <span className="font-semibold text-yellow-200">{vipModalData.expiryDate}</span></span>
                      </div>

                      <div className="flex items-center justify-center space-x-2 pt-2">
                        <span>⭐</span>
                        <span className="font-semibold text-yellow-300">¡Disfruta de todos los beneficios premium!</span>
                        <span>⭐</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={closeVipModal}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Balance */}
      {showBalanceConfirmationModal && balanceConfirmationData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeBalanceConfirmationModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-700">
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

              <h3 className="text-xl font-semibold text-white mb-4 text-center">
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
        </div>
      )}

      {/* Modal Crear Usuario Nuevo */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeCreateUserModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Crear usuario Nuevo
              </h3>

              <div className="space-y-4">
                {/* Campo Teléfono */}
                <div>
                  <label htmlFor="newUserPhone" className="block text-sm font-medium text-gray-300 mb-2">
                    Número de usuario
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        ? 'bg-blue-600 border-blue-500 text-white'
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
                        ? 'bg-blue-600 border-blue-500 text-white'
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
                        ? 'bg-blue-600 border-blue-500 text-white'
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
                        ? 'bg-blue-600 border-blue-500 text-white'
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  {showProgressBar ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificación Global */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeNotificationModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Enviar Notificación Global
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="notificationTitle" className="block text-sm font-medium text-gray-300 mb-2">
                    Título de la notificación
                  </label>
                  <input
                    type="text"
                    id="notificationTitle"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ej: ¡Actualización importante!"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label htmlFor="notificationBody" className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción de la notificación
                  </label>
                  <textarea
                    id="notificationBody"
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Ej: Hemos mejorado la aplicación con nuevas funciones..."
                    rows={4}
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="border-t border-gray-600 pt-6 mt-6">
                <div className="flex space-x-3">
                  <button
                    onClick={closeNotificationModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendGlobalNotification}
                    disabled={sendingNotification || !notificationTitle.trim() || !notificationBody.trim()}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:bg-red-500/10 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors font-medium"
                  >
                    {sendingNotification ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificación a Usuario Específico */}
      {showUserNotificationModal && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeUserNotificationModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors font-medium"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeUserCreatedModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-700">
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

              {/* Botón de tarifas */}
              <button
                onClick={() => {
                  router.push('/admin-panel/tarifas');
                  toggleDrawer();
                }}
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
              </button>
              <div className="border-b border-gray-700/50"></div>

              {/* Botón de estadísticas */}
              <button
                onClick={() => {
                  router.push('/admin-panel/estadisticas');
                  toggleDrawer();
                }}
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
                </button>
              <div className="border-b border-gray-700/50"></div>

              {/* Botón de registros */}
              <button
                onClick={() => {
                  router.push('/admin-panel/registros');
                  toggleDrawer();
                }}
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
                </button>
              <div className="border-b border-gray-700/50"></div>

              {/* Botón de reporte facturación SMS */}
              <button
                onClick={() => {
                  router.push('/admin-panel/reporte-facturacion-sms');
                  toggleDrawer();
                }}
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
                </button>
              <div className="border-b border-gray-700/50"></div>

              {/* Botón de operaciones técnicas */}
              <button
                onClick={() => {
                  router.push('/admin-panel/operations');
                  toggleDrawer();
                }}
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
                </button>
              <div className="border-b border-gray-700/50"></div>

              {/* Botón de Ganancias */}
              <button
                onClick={() => {
                  router.push('/admin-panel/ganancias');
                  toggleDrawer();
                }}
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
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    }>
      <AdminPanelContent />
    </Suspense>
  );
}
