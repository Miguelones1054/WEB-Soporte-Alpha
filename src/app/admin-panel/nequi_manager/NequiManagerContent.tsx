'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { humanizeNotificationError, parseApiErrorDetail } from '../../../lib/humanizeNotificationError';
import {
  extractAdminBalanceDeduction,
  syncAdminInfoBalance,
  type AdminBalanceDeduction,
} from '../../../lib/adminBalanceDeduction';
import { RetroLoadingOverlay, RetroIcon, RetroCheckbox, RetroSelect } from '../../../components/retro';
import {
  RetroModal,
  RetroManagerProgressModal,
  RetroManagerConfirmModal,
  RetroUserDetailField,
  RetroModalBanner,
  RetroModalMessagePanel,
  RetroModalAlertCenter,
  RetroModalAdminBalanceDeduction,
} from '../../../components/retro/admin';

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

export interface NequiManagerContentProps {
  embedded?: boolean;
  adminInfo?: AdminInfo | null;
  onBackToHub?: () => void;
}

export function NequiManagerContent({
  embedded = false,
  adminInfo: adminInfoProp,
  onBackToHub,
}: NequiManagerContentProps) {
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
  const [vipModalData, setVipModalData] = useState<{
    username: string;
    expiryDate: string;
    adminBalanceDeduction?: AdminBalanceDeduction | null;
  } | null>(null);
  const [showBalanceConfirmationModal, setShowBalanceConfirmationModal] = useState(false);
  const [balanceConfirmationData, setBalanceConfirmationData] = useState<{
    type: 'add' | 'subtract';
    username: string;
    amount: number;
    newBalance: number;
    adminBalanceDeduction?: AdminBalanceDeduction | null;
  } | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserInitialBalance, setNewUserInitialBalance] = useState('');
  const [selectedRandomOption, setSelectedRandomOption] = useState<string | null>(null);
  const [showUserCreatedModal, setShowUserCreatedModal] = useState(false);
  const [userCreatedMessage, setUserCreatedMessage] = useState('');
  const [userCreatedAdminDeduction, setUserCreatedAdminDeduction] = useState<AdminBalanceDeduction | null>(null);
  const [editUserData, setEditUserData] = useState<{
    username: string;
    pin: string;
    numero_cel: string;
  } | null>(null);
  const [showUserNotificationModal, setShowUserNotificationModal] = useState(false);
  const [userNotificationTitle, setUserNotificationTitle] = useState('');
  const [userNotificationBody, setUserNotificationBody] = useState('');
  const [sendingUserNotification, setSendingUserNotification] = useState(false);
  const [isSmsOperation, setIsSmsOperation] = useState(false);
  const [showSmsConfirmationModal, setShowSmsConfirmationModal] = useState(false);
  const [smsConfirmationData, setSmsConfirmationData] = useState<{
    username: string;
    oldSms: number;
    newSms: number;
    adminBalanceDeduction?: AdminBalanceDeduction | null;
  } | null>(null);
  const [showNoRefundDialog, setShowNoRefundDialog] = useState(false);
  const [showUpgradeVipConfirmModal, setShowUpgradeVipConfirmModal] = useState(false);
  const [showCancelVipConfirmModal, setShowCancelVipConfirmModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!embedded) {
      document.title = 'Nequi Admin';
    }
  }, [embedded]);

  useEffect(() => {
    if (embedded) {
      if (adminInfoProp) {
        setAdminInfo(adminInfoProp);
        setUser({
          email: adminInfoProp.email,
          displayName: adminInfoProp.name,
          role: adminInfoProp.role,
        });
      }
      setLoading(false);
      return;
    }

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
  }, [embedded, adminInfoProp, router]);

  // Efecto separado para detectar cambios en los parámetros de búsqueda
  useEffect(() => {
    if (embedded) return;

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
    if (embedded && onBackToHub) {
      onBackToHub();
      return;
    }
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
        const deduction = extractAdminBalanceDeduction(result);
        syncAdminInfoBalance(setAdminInfo, deduction);
        setUserCreatedMessage(result.client_message);
        setUserCreatedAdminDeduction(deduction);
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
    setUserCreatedAdminDeduction(null);
  };

  const openResultModal = (message: string, type: 'success' | 'error') => {
    setConfirmationMessage(message);
    setConfirmationType(type);
    setShowConfirmationModal(true);
  };

  const sendUserNotification = async () => {
    if (!userNotificationTitle.trim() || !userNotificationBody.trim() || !userData) {
      openResultModal('Por favor complete todos los campos', 'error');
      return;
    }

    setSendingUserNotification(true);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        openResultModal('Sesión expirada. Por favor inicie sesión nuevamente.', 'error');
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

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setShowUserNotificationModal(false);
        setUserNotificationTitle('');
        setUserNotificationBody('');
        openResultModal(result.message || 'Notificación enviada exitosamente', 'success');
      } else {
        const raw = parseApiErrorDetail(result.detail ?? result.error, 'Error al enviar notificación');
        openResultModal(humanizeNotificationError(raw), 'error');
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
      openResultModal('Error de conexión. No se pudo enviar la notificación.', 'error');
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
          await handleUserAction(
            'add_sms',
            userData.numeroCel,
            userData.username,
            `Agregar ${Math.floor(amount)} SMS`,
            Math.floor(amount),
          );
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
      if (amount > 0) {
        if (isSmsOperation) {
          // Para SMS, restar la cantidad especificada (sin reembolso automático)
          await handleUserAction('subtract_sms', userData.numeroCel, userData.username, `Restar ${Math.floor(amount)} SMS`, Math.floor(amount));

          // Aviso: el saldo no se reembolsa automáticamente
          setShowNoRefundDialog(true);
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

  const handleUserAction = async (action: 'ban' | 'unban' | 'unlink' | 'upgrade_vip' | 'cancel_vip' | 'add_balance' | 'subtract_balance' | 'update_user' | 'add_sms' | 'subtract_sms', numeroCel: string, username: string, reason?: string, amount?: number, userUpdates?: any) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Sesión expirada. Por favor inicie sesión nuevamente.');
      router.push('/');
      return;
    }

    // Mostrar progress bar
    setShowProgressBar(true);

    try {
      let endpoint = action === 'unban' ? 'unban' : action === 'ban' ? 'ban' : action === 'unlink' ? 'unlink' : action === 'upgrade_vip' ? 'upgrade-vip' : action === 'cancel_vip' ? 'cancel-vip' : action === 'add_balance' ? 'add-balance' : action === 'subtract_balance' ? 'subtract-balance' : '';

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

          const deduction = extractAdminBalanceDeduction(result);
          syncAdminInfoBalance(setAdminInfo, deduction);

          setVipModalData({
            username: username,
            expiryDate: `${formattedDate} a las ${formattedTime}`,
            adminBalanceDeduction: deduction,
          });
          setShowVipModal(true);

          setShowProgressBar(false);
          await searchUser();
          return;
        }

        if (action === 'add_sms' && result) {
          setShowProgressBar(false);
          const currentSms = userData?.sms || 0;
          const newSmsValue = amount ? currentSms + amount : currentSms;
          const deduction = extractAdminBalanceDeduction(result);
          syncAdminInfoBalance(setAdminInfo, deduction);

          setSmsConfirmationData({
            username,
            oldSms: currentSms,
            newSms: newSmsValue,
            adminBalanceDeduction: deduction,
          });
          setShowSmsConfirmationModal(true);
          await searchUser();
          return;
        }

        // Si es una acción de balance exitosa
        if ((action === 'add_balance' || action === 'subtract_balance') && result) {
          setShowProgressBar(false);

          if (action === 'subtract_balance') {
            await searchUser();
            setShowNoRefundDialog(true);
          } else {
            const deduction = extractAdminBalanceDeduction(result);
            syncAdminInfoBalance(setAdminInfo, deduction);

            setBalanceConfirmationData({
              type: 'add',
              username: username,
              amount: amount || 0,
              newBalance: result.data?.new_balance || result.new_balance || 0,
              adminBalanceDeduction: deduction,
            });
            setShowBalanceConfirmationModal(true);
          }
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
    <div className={embedded ? 'retro-app-manager' : 'min-h-screen bg-gray-900'}>
      {!embedded && (
      <>
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
      </>
      )}

      {/* Contenido principal */}
      <main className={embedded ? 'retro-app-manager__main' : 'flex-1 p-6'}>
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Campo de Gestión de Usuario */}
          {!userData && (
            <div
              className={
                embedded
                  ? `retro-user-search-panel${loading ? ' retro-user-search-panel--loading' : ''}`
                  : `bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-full max-w-md mx-auto shadow-2xl border border-gray-700/50 backdrop-blur-sm ${loading ? 'opacity-50 pointer-events-none' : ''}`
              }
            >
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
                          src="/nequi-logo.png"
                          alt="Nequi"
                          className="h-full w-full object-cover"
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
                    <div className={embedded ? 'retro-user-search-panel__field' : 'space-y-2'}>
                      {embedded && (
                        <label htmlFor="userId" className="retro-user-search-panel__label">
                          Número de usuario
                        </label>
                      )}
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
                        className={
                          embedded
                            ? 'retro-user-search-panel__input'
                            : 'w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors'
                        }
                        placeholder={embedded ? '10 dígitos' : 'Número de usuario (10 dígitos)'}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searching}
                      className={
                        embedded
                          ? 'retro-user-search-panel__submit'
                          : 'w-full border border-red-500/90 bg-transparent text-red-200 py-3 px-6 rounded-md transition-all duration-200 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-600 disabled:text-gray-500 enabled:hover:border-red-400 enabled:hover:text-red-100'
                      }
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <RetroIcon name="misc/magnifying_glass" size={16} alt="" />
                        <span>Buscar Usuario</span>
                      </div>
                    </button>
                  </form>
                )}

                {/* Mensaje de error elegante */}
                {searchError && !loading && (
                  <div
                    className={
                      embedded
                        ? 'retro-user-search-panel__error'
                        : 'bg-red-900/20 border border-red-700/50 rounded-xl p-4 backdrop-blur-sm'
                    }
                  >
                    <div className={embedded ? 'retro-user-search-panel__error-inner' : 'flex items-center space-x-2'}>
                      {!embedded && (
                        <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <p className={embedded ? 'retro-user-search-panel__error-text' : 'text-red-300 text-sm font-medium'}>
                        {searchError}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subtítulo Acciones rápidas */}
          {!userData && (
            <div className="text-center mt-6 mb-4">
              {loading ? (
                <Shimmer className="h-6 w-48 mx-auto" />
              ) : (
                <h4 className="text-lg font-medium text-gray-300">Acciones rápidas</h4>
              )}
            </div>
          )}

          {/* Botones de acciones rápidas */}
          {!userData && (
            <div className="flex justify-center gap-4 mt-4">
              {loading ? (
                // Shimmer effects para los botones
                <div className="aspect-square w-32 rounded-lg">
                  <Shimmer className="w-full h-full rounded-lg" />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewUserPhone('');
                    setNewUserPin('');
                    setNewUserInitialBalance('');
                    setShowCreateUserModal(true);
                  }}
                  className="aspect-square w-32 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-red-400 hover:text-red-300 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                >
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs text-center leading-tight">Crear nuevo usuario</span>
                </button>
              )}
            </div>
          )}

          {userData && (
            <div className="retro-user-panel">
              <div className="retro-user-panel__toolbar">
                <button type="button" className="retro-user-panel__link-btn" onClick={resetSearch}>
                  Nueva consulta
                </button>
              </div>

              <div className="retro-user-panel__card">
                <div className="retro-user-panel__header">
                  <div className="retro-user-panel__avatar">
                    <img src="/nequi-logo.png" alt="Nequi" />
                  </div>
                  <div className="retro-user-panel__identity">
                    <h4>{userData.username}</h4>
                    <p className="retro-user-panel__phone">
                      <RetroIcon name="communication/conn_dialup_recbin_phone" size={16} alt="" />
                      <span className="retro-user-panel__phone-label">Número:</span>
                      <span className="retro-user-panel__phone-value">{userData.numeroCel}</span>
                    </p>
                  </div>
                  <div className="retro-user-panel__header-actions">
                    <button
                      type="button"
                      className="retro-user-panel__icon-btn"
                      onClick={() =>
                        router.push(
                          `/admin-panel/user-movements?userId=${userData.numeroCel}&phone=${userData.numeroCel}`,
                        )
                      }
                      title="Ver movimientos"
                    >
                      <RetroIcon name="office/document" size={16} alt="Movimientos" />
                    </button>
                    <button
                      type="button"
                      className="retro-user-panel__icon-btn"
                      onClick={openEditModal}
                      title="Editar usuario"
                    >
                      <RetroIcon name="users/computer_user_pencil" size={16} alt="Editar" />
                    </button>
                  </div>
                </div>

                <div
                  className={`retro-user-panel__badge ${
                    userData.baneado ? 'retro-user-panel__badge--danger' : 'retro-user-panel__badge--success'
                  }`}
                >
                  <RetroIcon
                    name={userData.baneado ? 'communication/msg_error' : 'communication/msg_information'}
                    size={14}
                    alt=""
                  />
                  {userData.baneado ? 'Baneado' : 'Activo'}
                </div>

                {userData.baneado && userData.banned_reason && (
                  <div className="retro-user-panel__alert">
                    <div className="retro-user-panel__alert-title">
                      <RetroIcon name="communication/msg_warning" size={14} alt="" />
                      Razón del ban
                    </div>
                    <div className="retro-user-panel__alert-body">{userData.banned_reason}</div>
                  </div>
                )}

                <div className="retro-user-panel__grid">
                  <RetroUserDetailField
                    icon="office/calculator"
                    label="Saldo disponible"
                    valueSize="lg"
                    onAdd={handleSaldoIncrement}
                    onSubtract={handleSaldoDecrement}
                    addTitle="Recargar saldo"
                    subtractTitle="Restar saldo"
                  >
                    {loading ? (
                      <Shimmer className="h-8 w-32" />
                    ) : (
                      `$${formatCurrency(parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'))}`
                    )}
                  </RetroUserDetailField>

                  <RetroUserDetailField
                    icon="communication/message_file"
                    label="SMS"
                    valueVariant="success"
                    onAdd={handleSmsIncrement}
                    onSubtract={handleSmsDecrement}
                    addTitle="Agregar SMS"
                    subtractTitle="Restar SMS"
                  >
                    {loading ? <Shimmer className="h-6 w-16" /> : userData.sms}
                  </RetroUserDetailField>

                  <RetroUserDetailField icon="security/key_win" label="Clave" valueVariant="warning">
                    {loading ? <Shimmer className="h-6 w-20" /> : userData.pin || 'No disponible'}
                  </RetroUserDetailField>

                  <RetroUserDetailField
                    icon="system/palm_computer"
                    label="Dispositivo"
                    valueVariant={
                      loading ? 'muted' : userData.device_linked ? 'success' : 'danger'
                    }
                  >
                    {loading ? <Shimmer className="h-5 w-24" /> : userData.device_status}
                  </RetroUserDetailField>

                  <RetroUserDetailField
                    icon="navigation/world_star"
                    label="Estado VIP"
                    valueVariant={
                      loading ? 'muted' : userData.vip_status === 'VIP' ? 'warning' : 'muted'
                    }
                  >
                    {loading ? <Shimmer className="h-5 w-16" /> : userData.vip_status}
                  </RetroUserDetailField>
                </div>
              </div>
            </div>
          )}

          {userData && (
            <div className="retro-user-actions">
              <div className="retro-user-actions__titlebar">
                <RetroIcon name="navigation/program_manager" size={14} alt="" />
                Acciones rápidas
              </div>
              <div className="retro-user-actions__body">
                <p className="retro-user-actions__section-title">Recargas</p>
                <div className="retro-user-actions__grid">
                  <button
                    type="button"
                    onClick={() => openRecargaModal('25k', '1.200.000')}
                    className="retro-user-actions__chip"
                  >
                    <strong>25k</strong>
                    <small>1.200.000</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => openRecargaModal('35k', '2.600.000')}
                    className="retro-user-actions__chip"
                  >
                    <strong>35k</strong>
                    <small>2.600.000</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => openRecargaModal('45k', '5.000.000')}
                    className="retro-user-actions__chip"
                  >
                    <strong>45k</strong>
                    <small>5.000.000</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => openRecargaModal('60k', '10.000.000')}
                    className="retro-user-actions__chip"
                  >
                    <strong>60k</strong>
                    <small>10.000.000</small>
                  </button>
                </div>

                <hr className="retro-user-actions__divider" />
                <p className="retro-user-actions__section-title">Gestionar usuario</p>
                <div className="retro-user-actions__buttons">
                  <button
                    type="button"
                    onClick={() => {
                      if (!userData) return;
                      if (userData.baneado) {
                        handleUserAction('unban', userData.numeroCel, userData.username);
                      } else {
                        setBanReason('');
                        setShowBanModal(true);
                      }
                    }}
                    disabled={showProgressBar}
                    className={`retro-user-actions__btn ${
                      userData.baneado ? 'retro-user-actions__btn--success' : 'retro-user-actions__btn--danger'
                    }`}
                  >
                    {userData.baneado ? 'Habilitar usuario' : 'Inhabilitar usuario'}
                  </button>

                  {userData.device_linked && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!userData) return;
                        handleUserAction('unlink', userData.numeroCel, userData.username);
                      }}
                      disabled={showProgressBar}
                      className="retro-user-actions__btn retro-user-actions__btn--danger"
                    >
                      Desvincular dispositivo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!userData) return;
                      if (userData.vip_status === 'VIP') {
                        setShowCancelVipConfirmModal(true);
                      } else {
                        setShowUpgradeVipConfirmModal(true);
                      }
                    }}
                    disabled={showProgressBar}
                    className="retro-user-actions__btn"
                  >
                    {userData.vip_status === 'VIP' ? 'Cancelar VIP' : 'Actualizar a VIP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUserNotificationModal(true)}
                    disabled={showProgressBar}
                    className="retro-user-actions__btn retro-user-actions__btn--secondary"
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
      {showRecargaModal && recargaData && userData && (
        <RetroModal
          open
          title="Confirmar recarga"
          onClose={closeRecargaModal}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__intro">
                <p className="retro-manager-modal__text">
                  ¿Seguro que quieres recargar
                </p>
                <p className="retro-manager-modal__highlight">
                  {recargaData.valor}
                </p>
                <p className="retro-manager-modal__text">
                  al usuario <strong>{userData.username}</strong>?
                </p>
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={closeRecargaModal}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  No
                </button>
                <button
                  onClick={confirmRecarga}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  Sí
                </button>
              </div>
        </RetroModal>
      )}

      {/* Modal de Recarga Personalizada (portal, encima del de edición) */}
      {showCustomRecargaModal && userData && (
        <RetroModal
          open
          title={isSmsOperation ? 'Agregar SMS' : 'Recarga personalizada'}
          onClose={closeCustomRecargaModal}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__field-wrap">
                <label htmlFor="customAmount" className="retro-manager-modal__label">
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
                  className="retro-manager-modal__input"
                  placeholder={isSmsOperation ? "Ej: 50" : "Ej: 50000"}
                  autoFocus
                />
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={closeCustomRecargaModal}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCustomRecarga}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  Recargar
                </button>
              </div>
        </RetroModal>
      )}

      {/* Modal de Restar Saldo (portal, encima del de edición) */}
      {showSubtractModal && userData && (
        <RetroModal
          open
          title={isSmsOperation ? 'Restar SMS' : 'Restar saldo'}
          onClose={closeSubtractModal}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
              {!isSmsOperation && (
                <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
                  <p className="retro-manager-modal__text">
                    Saldo actual: <strong>
                      ${formatCurrency(parseFloat(userData.saldo || '0') + parseFloat(userData.ok || '0'))}
                    </strong>
                  </p>
                </div>
              )}
              {isSmsOperation && (
                <div className="retro-manager-modal__intro retro-manager-modal__intro--compact">
                  <p className="retro-manager-modal__text">
                    SMS actuales: <strong>
                      {userData.sms || 0}
                    </strong>
                  </p>
                </div>
              )}

              <div className="retro-manager-modal__field-wrap">
                <label htmlFor="subtractAmount" className="retro-manager-modal__label">
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
                  className="retro-manager-modal__input"
                  placeholder={isSmsOperation ? "Ej: 10" : "Ej: 25000"}
                  autoFocus
                />
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={closeSubtractModal}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSubtract}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  Restar
                </button>
              </div>
        </RetroModal>
      )}

      {showEditModal && userData && (
        <RetroModal
          open
          title="Editar usuario"
          onClose={closeEditModal}
          zIndex={100}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__form">
                <div>
                  <label htmlFor="editUsername" className="retro-manager-modal__label">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    id="editUsername"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="retro-manager-modal__input"
                    placeholder="Ingrese el nombre del usuario"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="editPhoneNumber" className="retro-manager-modal__label">
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
                    className="retro-manager-modal__input"
                    placeholder="Ingrese el número de usuario"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label htmlFor="editPin" className="retro-manager-modal__label">
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
                    className="retro-manager-modal__input"
                    placeholder="Ingrese el PIN (4 dígitos)"
                    maxLength={4}
                  />
                </div>
              </div>

              <hr className="retro-manager-modal__divider" />
              <div className="retro-manager-modal__actions">
                  <button
                    onClick={closeEditModal}
                    className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmEditUser}
                    className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                  >
                    Guardar
                  </button>
              </div>
        </RetroModal>
      )}

      <RetroManagerProgressModal
        open={showProgressBar || searching}
        message={searching ? 'Buscando usuario...' : 'Procesando operación...'}
      />

      {showSmsConfirmationModal && smsConfirmationData && (
        <RetroModal
          open
          title="Comparte este mensaje con el cliente"
          onClose={() => setShowSmsConfirmationModal(false)}
          zIndex={110}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
              <RetroModalBanner variant="success" icon="communication/message_file">
                SMS {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'actualizados'} correctamente
              </RetroModalBanner>

              <RetroModalMessagePanel
                onCopy={() => {
                  const isSubtraction = smsConfirmationData.oldSms > smsConfirmationData.newSms;
                  const smsDifference = Math.abs(smsConfirmationData.newSms - smsConfirmationData.oldSms);
                  const message = `📱 SMS ${isSubtraction ? 'restados' : 'agregados'} correctamente!\n\n👤 Usuario: ${smsConfirmationData.username}\n${isSubtraction ? '➖' : '➕'} SMS ${isSubtraction ? 'restados' : 'agregados'}: ${smsDifference}\n📊 SMS anteriores: ${smsConfirmationData.oldSms}\n📱 Nuevos SMS: ${smsConfirmationData.newSms}\n✅ ¡Operación completada exitosamente!`;
                  navigator.clipboard.writeText(message);
                }}
              >
                <div className="retro-manager-modal__message-rich">
                  <div className="retro-manager-modal__message-emoji">📱</div>
                  <p className="retro-manager-modal__message-title">
                    ¡SMS {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'agregados'} correctamente!
                  </p>
                  <p>👤 Usuario: <strong>{smsConfirmationData.username}</strong></p>
                  <p>
                    {smsConfirmationData.oldSms > smsConfirmationData.newSms ? '➖' : '➕'} SMS{' '}
                    {smsConfirmationData.oldSms > smsConfirmationData.newSms ? 'restados' : 'agregados'}:{' '}
                    <strong>{Math.abs(smsConfirmationData.newSms - smsConfirmationData.oldSms)}</strong>
                  </p>
                  <p>📊 SMS anteriores: <strong>{smsConfirmationData.oldSms}</strong></p>
                  <p>📱 Nuevos SMS: <strong>{smsConfirmationData.newSms}</strong></p>
                  <p>✅ ¡Operación completada exitosamente!</p>
                </div>
              </RetroModalMessagePanel>

              <RetroModalAdminBalanceDeduction deduction={smsConfirmationData.adminBalanceDeduction} />

              <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
                <button
                  onClick={() => setShowSmsConfirmationModal(false)}
                  className="retro-manager-btn retro-manager-btn--primary"
                >
                  Cerrar
                </button>
              </div>
        </RetroModal>
      )}

      {/* Aviso al restar SMS: sin reembolso automático */}
      {showNoRefundDialog && (
        <RetroModal
          open
          title="Operación realizada correctamente"
          onClose={() => setShowNoRefundDialog(false)}
          zIndex={110}
          role="alertdialog"
          bodyClassName="retro-manager-modal__body"
        >
          <RetroModalAlertCenter
            actionLabel="Entendido"
            onAction={() => setShowNoRefundDialog(false)}
          >
            Comunícate con el creador para acordar la reposición del saldo.
          </RetroModalAlertCenter>
        </RetroModal>
      )}

      {/* Modal de confirmación al actualizar a VIP */}
      {showUpgradeVipConfirmModal && userData && (
        <RetroModal
          open
          title="Confirmar actualización a VIP"
          onClose={() => setShowUpgradeVipConfirmModal(false)}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__intro">
                <p className="retro-manager-modal__text">
                  ¿Seguro que deseas actualizar a VIP al usuario
                </p>
                <p className="retro-manager-modal__highlight">
                  {userData.username}
                </p>
                <p className="retro-manager-modal__text retro-manager-modal__text--muted">
                  Se descontará el costo VIP de tu saldo de administrador.
                </p>
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={() => setShowUpgradeVipConfirmModal(false)}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!userData) return;
                    setShowUpgradeVipConfirmModal(false);
                    handleUserAction('upgrade_vip', userData.numeroCel, userData.username);
                  }}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  Sí, actualizar
                </button>
              </div>
        </RetroModal>
      )}

      {/* Modal de confirmación al cancelar VIP */}
      {showCancelVipConfirmModal && userData && (
        <RetroModal
          open
          title="Confirmar cancelación de VIP"
          onClose={() => setShowCancelVipConfirmModal(false)}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__intro">
                <p className="retro-manager-modal__text">
                  ¿Seguro que deseas cancelar el VIP del usuario
                </p>
                <p className="retro-manager-modal__highlight">
                  {userData.username}
                </p>
                <p className="retro-manager-modal__text retro-manager-modal__text--muted">
                  El usuario perderá los beneficios VIP de inmediato.
                </p>
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={() => setShowCancelVipConfirmModal(false)}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!userData) return;
                    setShowCancelVipConfirmModal(false);
                    handleUserAction('cancel_vip', userData.numeroCel, userData.username);
                  }}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  Sí, cancelar VIP
                </button>
              </div>
        </RetroModal>
      )}

      {showConfirmationModal && (
        <RetroManagerConfirmModal
          open={showConfirmationModal}
          type={confirmationType}
          message={confirmationMessage}
          title={confirmationType === 'error' ? 'Error' : 'Éxito'}
          onClose={() => setShowConfirmationModal(false)}
        />
      )}

      {showBanModal && userData && (
        <RetroModal
          open
          title="Confirmar inhabilitación"
          onClose={closeBanModal}
          zIndex={130}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__intro">
                <p className="retro-manager-modal__text">
                  ¿Por qué deseas inhabilitar al usuario <strong>{userData.username}</strong>?
                </p>

                <div className="retro-manager-modal__form">
                  <div>
                    <span className="retro-manager-modal__label">Razones comunes:</span>
                    <div className="retro-manager-modal__reason-list">
                      {[
                        'Solicitud del usuario',
                        'Cuenta sospechosa de actividad maliciosa',
                        'Venta no autorizada de la APK'
                      ].map((reason, index) => (
                        <button
                          key={index}
                          onClick={() => setBanReason(reason)}
                          className="retro-manager-modal__reason-btn"
                          type="button"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="banReason" className="retro-manager-modal__label">
                      Razón de la inhabilitación:
                    </label>
                    <textarea
                      id="banReason"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ingresa la razón..."
                      className="retro-manager-modal__textarea"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="retro-manager-modal__text retro-manager-modal__text--muted">
                      {banReason.length}/500 caracteres
                    </p>
                  </div>

                  <hr className="retro-manager-modal__divider" />

                  <div className="retro-manager-modal__checkbox-row">
                    <RetroCheckbox
                      id="temporaryBan"
                      label="Suspensión temporal"
                      checked={isTemporaryBan}
                      onChange={(e) => setIsTemporaryBan(e.target.checked)}
                    />
                  </div>

                  {isTemporaryBan && (
                    <div>
                      <label htmlFor="banDays" className="retro-manager-modal__label">
                        Duración de la suspensión:
                      </label>
                      <RetroSelect
                        id="banDays"
                        value={banDays}
                        onChange={setBanDays}
                        options={[
                          { value: 1, label: '1 día' },
                          { value: 3, label: '3 días' },
                          { value: 7, label: '7 días' },
                          { value: 14, label: '14 días' },
                          { value: 30, label: '30 días' },
                          { value: 60, label: '60 días' },
                          { value: 90, label: '90 días' },
                        ]}
                      />
                      <p className="retro-manager-modal__text retro-manager-modal__text--muted">
                        La cuenta se habilitará automáticamente después de {banDays} día{banDays !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="retro-manager-modal__actions">
                <button
                  onClick={closeBanModal}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                  disabled={showProgressBar}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBan}
                  disabled={!banReason.trim() || showProgressBar}
                  className="retro-manager-btn retro-manager-btn--danger retro-manager-btn--block"
                >
                  {showProgressBar ? 'Procesando...' : 'Inhabilitar'}
                </button>
              </div>
        </RetroModal>
      )}

      {showVipModal && vipModalData && (
        <RetroModal
          open
          title="Comparte este mensaje con el cliente"
          onClose={closeVipModal}
          zIndex={130}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
              <RetroModalBanner variant="success">
                Usuario actualizado a VIP correctamente
              </RetroModalBanner>

              <RetroModalMessagePanel onCopy={copyVipMessage}>
                <div className="retro-manager-modal__message-rich">
                  <div className="retro-manager-modal__message-emoji">✨</div>
                  <p className="retro-manager-modal__message-title">¡FELICIDADES!</p>
                  <p>👤 El usuario <strong>{vipModalData.username}</strong> ahora es premium</p>
                  <p>🏆 Tendrá acceso VIP hasta el <strong>{vipModalData.expiryDate}</strong></p>
                  <p>⭐ ¡Disfruta de todos los beneficios premium! ⭐</p>
                </div>
              </RetroModalMessagePanel>

              <RetroModalAdminBalanceDeduction deduction={vipModalData.adminBalanceDeduction} />

              <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
                <button
                  onClick={closeVipModal}
                  className="retro-manager-btn retro-manager-btn--primary"
                >
                  Cerrar
                </button>
              </div>
        </RetroModal>
      )}

      {showBalanceConfirmationModal && balanceConfirmationData && (
        <RetroModal
          open
          title="Comparte este mensaje con el cliente"
          onClose={closeBalanceConfirmationModal}
          zIndex={110}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
              <RetroModalBanner variant="success">
                Saldo {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'} correctamente
              </RetroModalBanner>

              <RetroModalMessagePanel onCopy={copyBalanceMessage}>
                <div className="retro-manager-modal__message-rich">
                  <div className="retro-manager-modal__message-emoji">💰</div>
                  <p className="retro-manager-modal__message-title">
                    ¡Saldo {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'} correctamente!
                  </p>
                  <p>👤 Usuario: <strong>{balanceConfirmationData.username}</strong></p>
                  <p>
                    {balanceConfirmationData.type === 'add' ? '💚' : '❤️'} Monto{' '}
                    {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'}:{' '}
                    <strong>${formatCurrency(balanceConfirmationData.amount)}</strong>
                  </p>
                  <p>💵 Nuevo saldo: <strong>${formatCurrency(balanceConfirmationData.newBalance)}</strong></p>
                  <p>✅ ¡Operación completada exitosamente!</p>
                </div>
              </RetroModalMessagePanel>

              <RetroModalAdminBalanceDeduction deduction={balanceConfirmationData.adminBalanceDeduction} />

              <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
                <button
                  onClick={closeBalanceConfirmationModal}
                  className="retro-manager-btn retro-manager-btn--primary"
                >
                  Cerrar
                </button>
              </div>
        </RetroModal>
      )}

      {showCreateUserModal && (
        <RetroModal
          open
          title="Crear usuario nuevo"
          onClose={closeCreateUserModal}
          zIndex={130}
          bodyClassName="retro-manager-modal__body"
        >
              <div className="retro-manager-modal__form">
                {/* Campo Teléfono */}
                <div>
                  <label htmlFor="newUserPhone" className="retro-manager-modal__label">
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
                    className="retro-manager-modal__input"
                    placeholder="Ej: 3000000000"
                    maxLength={10}
                  />
                </div>

                {/* Campo PIN */}
                <div>
                  <label htmlFor="newUserPin" className="retro-manager-modal__label">
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
                    className="retro-manager-modal__input"
                    placeholder="Ej: 1234"
                    maxLength={4}
                  />
                </div>

                {/* Campo Saldo Inicial */}
                <div>
                  <label htmlFor="newUserInitialBalance" className="retro-manager-modal__label">
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
                    className="retro-manager-modal__input"
                    placeholder="Ej: 50000"
                  />
                </div>

                <div className="text-center mt-4 mb-3">
                  <h4 className="retro-manager-modal__section-title">Crear random</h4>
                </div>

                <div className="retro-manager-modal__amount-grid">
                  <button
                    type="button"
                    onClick={() => setQuickBalance('1200000', '25k')}
                    className={
                      selectedRandomOption === '25k'
                        ? 'retro-manager-modal__amount-chip retro-manager-modal__amount-chip--selected'
                        : 'retro-manager-modal__amount-chip'
                    }
                  >
                    <strong>25k</strong>
                    <small>1.200.000</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickBalance('2600000', '35k')}
                    className={
                      selectedRandomOption === '35k'
                        ? 'retro-manager-modal__amount-chip retro-manager-modal__amount-chip--selected'
                        : 'retro-manager-modal__amount-chip'
                    }
                  >
                    <strong>35k</strong>
                    <small>2.600.000</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickBalance('5000000', '45k')}
                    className={
                      selectedRandomOption === '45k'
                        ? 'retro-manager-modal__amount-chip retro-manager-modal__amount-chip--selected'
                        : 'retro-manager-modal__amount-chip'
                    }
                  >
                    <strong>45k</strong>
                    <small>5.000.000</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickBalance('10000000', '60k')}
                    className={
                      selectedRandomOption === '60k'
                        ? 'retro-manager-modal__amount-chip retro-manager-modal__amount-chip--selected'
                        : 'retro-manager-modal__amount-chip'
                    }
                  >
                    <strong>60k</strong>
                    <small>10.000.000</small>
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="retro-manager-modal__actions">
                <button
                  onClick={closeCreateUserModal}
                  className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                >
                  Cancelar
                </button>
                <button
                  onClick={createNewUser}
                  disabled={!newUserPhone.trim() || !newUserPin.trim() || !newUserInitialBalance.trim() || newUserPin.length !== 4 || showProgressBar}
                  className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                >
                  {showProgressBar ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
        </RetroModal>
      )}

      {showUserNotificationModal && userData && (
        <RetroModal
          open
          title="Enviar notificación"
          onClose={closeUserNotificationModal}
          zIndex={130}
          bodyClassName="retro-manager-modal__body"
        >
              <p className="retro-manager-modal__text retro-manager-modal__text--muted" style={{ textAlign: 'center' }}>
                A: <strong>{userData.username}</strong> ({userData.numeroCel})
              </p>

              <div className="retro-manager-modal__form">
                <div>
                  <label htmlFor="userNotificationTitle" className="retro-manager-modal__label">
                    Título de la notificación
                  </label>
                  <input
                    type="text"
                    id="userNotificationTitle"
                    value={userNotificationTitle}
                    onChange={(e) => setUserNotificationTitle(e.target.value)}
                    className="retro-manager-modal__input"
                    placeholder="Ej: ¡Mensaje importante!"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label htmlFor="userNotificationBody" className="retro-manager-modal__label">
                    Mensaje de la notificación
                  </label>
                  <textarea
                    id="userNotificationBody"
                    value={userNotificationBody}
                    onChange={(e) => setUserNotificationBody(e.target.value)}
                    className="retro-manager-modal__textarea"
                    placeholder="Escribe el mensaje que quieres enviar..."
                    rows={4}
                    maxLength={200}
                  />
                </div>
              </div>

              <hr className="retro-manager-modal__divider" />
              <div className="retro-manager-modal__actions">
                  <button
                    onClick={closeUserNotificationModal}
                    className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendUserNotification}
                    disabled={sendingUserNotification || !userNotificationTitle.trim() || !userNotificationBody.trim()}
                    className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
                  >
                    {sendingUserNotification ? 'Enviando...' : 'Enviar Notificación'}
                  </button>
              </div>
        </RetroModal>
      )}

      {showUserCreatedModal && (
        <RetroModal
          open
          title="Comparte este mensaje con el cliente"
          onClose={closeUserCreatedModal}
          zIndex={130}
          width="lg"
          bodyClassName="retro-manager-modal__body"
        >
              <RetroModalBanner variant="success">
                Usuario creado correctamente
              </RetroModalBanner>

              <RetroModalMessagePanel onCopy={copyUserCreatedMessage}>
                <pre>{userCreatedMessage}</pre>
              </RetroModalMessagePanel>

              <RetroModalAdminBalanceDeduction deduction={userCreatedAdminDeduction} />

              <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
                <button
                  onClick={closeUserCreatedModal}
                  className="retro-manager-btn retro-manager-btn--primary"
                >
                  Cerrar
                </button>
              </div>
        </RetroModal>
      )}

      {/* Drawer de Estadísticas */}
      {!embedded && isDrawerOpen && (
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
                  <p className="retro-manager-modal__text retro-manager-modal__text--muted">ID: {adminInfo?.id || 'N/A'}</p>
                  <p className="retro-manager-modal__text retro-manager-modal__text--muted">{adminInfo?.email || 'admin@admin.com'}</p>
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
                  <span className="retro-manager-modal__text retro-manager-modal__text--muted">Fondos Disponibles</span>
                  <span className="text-white font-bold text-lg">
                    {loading || !adminInfo ? (
                      <Shimmer className="h-6 w-24" />
                    ) : (
                      `$${adminInfo.balance?.toLocaleString('es-CO') || '0'}`
                    )}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
