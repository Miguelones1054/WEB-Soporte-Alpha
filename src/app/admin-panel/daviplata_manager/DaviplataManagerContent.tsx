'use client';

import { useEffect, useState } from 'react';
import type { AdminInfo } from '../../../hooks/useAdminSession';
import { useOptionalAdminSessionContext } from '../../../contexts/AdminSessionContext';
import { API_BASE_URL } from '../../../lib/constants';
import { copyTextToClipboard } from '../../../lib/copyToClipboard';
import {
  applyAdminBalanceDeduction,
  extractAdminBalanceDeduction,
  type AdminBalanceDeduction,
} from '../../../lib/adminBalanceDeduction';
import { humanizeNotificationError, parseApiErrorDetail } from '../../../lib/humanizeNotificationError';
import { playRetroSound } from '../../../lib/retroSounds';
import { RetroIcon, RetroSelect } from '../../../components/retro';
import {
  AppGlobalNotificationControl,
  RetroAdminBalanceModal,
  RetroManagerConfirmModal,
  RetroManagerProgressModal,
  RetroModal,
  RetroModalActions,
  RetroModalBanner,
  RetroModalBtn,
  RetroModalField,
  RetroModalForm,
  RetroModalInput,
  RetroModalMessagePanel,
  RetroModalTextarea,
  RetroUserDetailField,
} from '../../../components/retro/admin';

export interface DaviplataManagerContentProps {
  embedded?: boolean;
  adminInfo?: AdminInfo | null;
  onBackToHub?: () => void;
}

interface UserData {
  numeroCel: string;
  username: string;
  baneado: boolean;
  banned_reason?: string | null;
  saldo: number;
  pin: string;
  device_linked: boolean;
  device_status: string;
  app_version: string;
  manufacturer: string;
  model: string;
  package_name: string;
  has_fcm_token: boolean;
}

const QUICK_RECHARGE_OPTIONS = [
  { label: '$1.200.000', tag: '25k' },
  { label: '$2.600.000', tag: '35k' },
  { label: '$5.000.000', tag: '45k' },
  { label: '$10.000.000', tag: '60k' },
] as const;

const MAX_RECHARGE = 10_000_000;
const TEST_USER_BALANCE_OPTIONS = [
  { value: 0, label: '$0' },
  { value: 1000, label: '$1.000' },
  { value: 2000, label: '$2.000' },
  { value: 3000, label: '$3.000' },
  { value: 4000, label: '$4.000' },
  { value: 5000, label: '$5.000' },
] as const;

function formatCurrency(amount: number) {
  return Number(amount || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function DaviplataManagerContent({
  embedded = false,
}: DaviplataManagerContentProps) {
  const [userIdInput, setUserIdInput] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [recargaData, setRecargaData] = useState<{ monto: string; valor: string } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'success' | 'error'>('success');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [adminBalanceModalData, setAdminBalanceModalData] = useState<AdminBalanceDeduction | null>(null);
  const [showBalanceConfirmationModal, setShowBalanceConfirmationModal] = useState(false);
  const [balanceConfirmationData, setBalanceConfirmationData] = useState<{
    type: 'add' | 'subtract';
    username: string;
    numeroCel: string;
    amount: number;
    newBalance: number;
  } | null>(null);

  const [showCustomBalanceModal, setShowCustomBalanceModal] = useState(false);
  const [customBalanceAmount, setCustomBalanceAmount] = useState('');
  const [customBalanceMode, setCustomBalanceMode] = useState<'add' | 'subtract'>('add');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');

  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');

  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isTemporaryBan, setIsTemporaryBan] = useState(false);
  const [banDays, setBanDays] = useState(1);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateTestUserModal, setShowCreateTestUserModal] = useState(false);
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserInitialBalance, setNewUserInitialBalance] = useState('');
  const [testUserInitialBalance, setTestUserInitialBalance] = useState(0);
  const [selectedRandomOption, setSelectedRandomOption] = useState<string | null>(null);
  const [showUserCreatedModal, setShowUserCreatedModal] = useState(false);
  const [userCreatedMessage, setUserCreatedMessage] = useState('');
  const [pendingShareModal, setPendingShareModal] = useState<'balance' | 'userCreated' | null>(null);

  const hubSession = useOptionalAdminSessionContext();
  const currentAdminBalance = Number(hubSession?.adminInfo?.balance ?? 0);

  useEffect(() => {
    if (!embedded) {
      document.title = 'Daviplata Admin';
    }
  }, [embedded]);

  const showResult = (message: string, type: 'success' | 'error' = 'success') => {
    setConfirmMessage(message);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const queueAdminBalanceModal = (deduction: AdminBalanceDeduction | null) => {
    applyAdminBalanceDeduction(deduction, {
      syncGlobalBalance: hubSession?.syncBalanceFromDeduction,
    });
    if (deduction) setAdminBalanceModalData(deduction);
  };

  const resolveAdminDeduction = (result: unknown): AdminBalanceDeduction | null => {
    const direct = extractAdminBalanceDeduction(result);
    if (direct) return direct;

    if (!result || typeof result !== 'object') return null;
    const payload = result as Record<string, unknown>;
    const adminCost = Number(payload.admin_cost ?? 0);
    if (!Number.isFinite(adminCost) || adminCost <= 0) return null;

    const previousBalance = currentAdminBalance;
    const newBalance = Math.max(0, previousBalance - adminCost);
    const fallback: AdminBalanceDeduction = {
      amount_deducted: adminCost,
      previous_balance: previousBalance,
      new_balance: newBalance,
    };

    console.warn('Daviplata: usando fallback para admin_balance_deduction', {
      adminCost,
      previousBalance,
      result,
    });

    return fallback;
  };

  const closeAdminBalanceModal = () => {
    setAdminBalanceModalData(null);
    if (pendingShareModal === 'balance') {
      setShowBalanceConfirmationModal(true);
      setPendingShareModal(null);
    } else if (pendingShareModal === 'userCreated') {
      setShowUserCreatedModal(true);
      setPendingShareModal(null);
    }
  };

  const scheduleShareModalAfterAdmin = (
    deduction: AdminBalanceDeduction | null,
    shareType: 'balance' | 'userCreated',
    openShare: () => void,
  ) => {
    if (deduction) {
      setPendingShareModal(shareType);
      return;
    }
    openShare();
  };

  const executeJsonRequest = async (url: string, options: RequestInit) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const raw = parseApiErrorDetail(result.detail, 'Error en la operación');
      throw new Error(humanizeNotificationError(raw));
    }
    return result;
  };

  const searchUser = async (overridePhone?: string) => {
    const phone = (overridePhone ?? userIdInput).trim();
    if (!phone) {
      setSearchError('Por favor ingrese un número de celular');
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

      const response = await fetch(`${API_BASE_URL}/daviplata/user/${encodeURIComponent(phone)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        const raw = json.data || {};
        const deviceDetails = raw.device_details || {};
        const hasDevice = Boolean(String(deviceDetails.device_id || '').trim());
        setUserData({
          numeroCel: String(raw.numeroCel ?? phone),
          username: String(raw.username ?? ''),
          baneado: raw.active === false,
          banned_reason: raw.banned_reason || null,
          saldo: Number(raw.saldo_disponible ?? json.saldo_total ?? 0) || 0,
          pin: String(raw.pin ?? ''),
          device_linked: hasDevice,
          device_status: hasDevice ? 'Vinculado' : 'Desvinculado',
          app_version: String(deviceDetails.app_version ?? ''),
          manufacturer: String(deviceDetails.manufacturer ?? ''),
          model: String(deviceDetails.model ?? ''),
          package_name: String(deviceDetails.package_name ?? ''),
          has_fcm_token: Boolean(String(deviceDetails.fcm_token || '').trim()),
        });
        setUserIdInput(String(raw.numeroCel ?? phone));
      } else if (response.status === 404) {
        setSearchError('Usuario no encontrado');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSearchError(errorData.detail || 'Error al consultar usuario');
      }
    } catch (error) {
      console.error('Error consultando usuario Daviplata:', error);
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

  const copyBalanceMessage = async () => {
    if (!balanceConfirmationData) return;

    const actionText = balanceConfirmationData.type === 'add' ? 'agregado' : 'restado';
    const message = `✨ ¡Saldo ${actionText} correctamente!

👤 Usuario: ${balanceConfirmationData.username}
📱 Numero: ${balanceConfirmationData.numeroCel}
💰 Monto ${actionText}: $${formatCurrency(balanceConfirmationData.amount)}
💵 Nuevo saldo: $${formatCurrency(balanceConfirmationData.newBalance)}

✅ Operación completada exitosamente`;

    await copyTextToClipboard(message);
  };

  const closeBalanceConfirmationModal = () => {
    setShowBalanceConfirmationModal(false);
    setBalanceConfirmationData(null);
  };

  const handleQuickRecharge = async () => {
    if (!userData || !recargaData) return;
    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/recarga-rapida`,
        { method: 'POST', body: JSON.stringify({ tier: recargaData.monto }) },
      );
      closeRecargaModal();
      const deduction = resolveAdminDeduction(result);
      queueAdminBalanceModal(deduction);
      setBalanceConfirmationData({
        type: 'add',
        username: userData.username,
        numeroCel: userData.numeroCel,
        amount: Number(result.amount_added ?? 0),
        newBalance: Number(result.saldo_total ?? 0),
      });
      playRetroSound('success');
      await searchUser(userData.numeroCel);
      scheduleShareModalAfterAdmin(deduction, 'balance', () => setShowBalanceConfirmationModal(true));
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const openBalanceModal = (mode: 'add' | 'subtract') => {
    setCustomBalanceMode(mode);
    setCustomBalanceAmount('');
    setShowCustomBalanceModal(true);
  };

  const submitBalanceModal = async () => {
    if (!userData) return;
    const amount = parseInt(customBalanceAmount.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      showResult('Ingresa un monto válido', 'error');
      return;
    }

    setShowProgressBar(true);
    try {
      const endpoint = customBalanceMode === 'add' ? 'add-balance' : 'subtract-balance';
      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/${endpoint}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount,
            reason:
              customBalanceMode === 'add'
                ? 'Recarga administrativa Daviplata'
                : 'Ajuste administrativo Daviplata',
          }),
        },
      );
      const deduction = resolveAdminDeduction(result);
      setShowCustomBalanceModal(false);
      if (customBalanceMode === 'add') {
        queueAdminBalanceModal(deduction);
        setBalanceConfirmationData({
          type: 'add',
          username: userData.username,
          numeroCel: userData.numeroCel,
          amount,
          newBalance: Number(result.new_balance ?? 0),
        });
        playRetroSound('success');
        await searchUser(userData.numeroCel);
        scheduleShareModalAfterAdmin(deduction, 'balance', () => setShowBalanceConfirmationModal(true));
      } else {
        playRetroSound('success');
        await searchUser(userData.numeroCel);
        showResult(result.message || 'Saldo actualizado', 'success');
      }
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const openEditModal = () => {
    if (!userData) return;
    setEditUsername(userData.username);
    setEditPhone(userData.numeroCel);
    setEditPin(userData.pin);
    setShowEditModal(true);
  };

  const submitEditModal = async () => {
    if (!userData) return;
    setShowProgressBar(true);
    try {
      const payload: Record<string, string> = {
        username: editUsername.trim(),
        numero_cel: editPhone.trim(),
      };
      if (editPin.trim()) payload.pin = editPin.trim();

      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}`,
        { method: 'PUT', body: JSON.stringify(payload) },
      );
      setShowEditModal(false);
      playRetroSound('success');
      const newPhone = String(result.numero_cel ?? editPhone).trim();
      await searchUser(newPhone);
      showResult(result.message || 'Usuario actualizado correctamente', 'success');
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const submitNotifyModal = async () => {
    if (!userData) return;
    if (!notifyTitle.trim() || !notifyBody.trim()) {
      showResult('Completa el título y la descripción', 'error');
      return;
    }

    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/notify`,
        {
          method: 'POST',
          body: JSON.stringify({ title: notifyTitle.trim(), body: notifyBody.trim() }),
        },
      );
      setShowNotifyModal(false);
      setNotifyTitle('');
      setNotifyBody('');
      playRetroSound('success');
      showResult(result.message || 'Notificación enviada correctamente', 'success');
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const toggleBanUser = async () => {
    if (!userData) return;
    if (userData.baneado) {
      setShowProgressBar(true);
      try {
        const result = await executeJsonRequest(
          `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/unban`,
          { method: 'POST' },
        );
        playRetroSound('success');
        await searchUser(userData.numeroCel);
        showResult(result.message || 'Usuario habilitado correctamente', 'success');
      } catch (error) {
        showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
      } finally {
        setShowProgressBar(false);
      }
      return;
    }

    setBanReason('');
    setIsTemporaryBan(false);
    setBanDays(1);
    setShowBanModal(true);
  };

  const submitBanModal = async () => {
    if (!userData) return;
    if (!banReason.trim()) {
      showResult('Debes indicar una razón', 'error');
      return;
    }

    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/ban`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: banReason.trim(),
            is_temporary: isTemporaryBan,
            ban_days: isTemporaryBan ? banDays : null,
          }),
        },
      );
      setShowBanModal(false);
      playRetroSound('success');
      await searchUser(userData.numeroCel);
      showResult(result.message || 'Usuario inhabilitado correctamente', 'success');
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const unlinkDevice = async () => {
    if (!userData) return;
    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(
        `${API_BASE_URL}/daviplata/user/${encodeURIComponent(userData.numeroCel)}/unlink`,
        { method: 'POST' },
      );
      playRetroSound('success');
      await searchUser(userData.numeroCel);
      showResult(result.message || 'Dispositivo desvinculado correctamente', 'success');
    } catch (error) {
      showResult(error instanceof Error ? error.message : 'Error de conexión', 'error');
    } finally {
      setShowProgressBar(false);
    }
  };

  const formatNumberWithDots = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const setQuickBalance = (balance: string, optionKey: string) => {
    const minPhone = 3000000000;
    const maxPhone = 3239999999;
    const randomPhone = Math.floor(Math.random() * (maxPhone - minPhone + 1)) + minPhone;
    const randomPin = Math.floor(Math.random() * 9000) + 1000;

    setNewUserPhone(randomPhone.toString());
    setNewUserPin(randomPin.toString());
    setNewUserInitialBalance(formatNumberWithDots(balance));
    setSelectedRandomOption(optionKey);
  };

  const fillRandomTestUserFields = () => {
    const minPhone = 3000000000;
    const maxPhone = 3239999999;
    const randomPhone = Math.floor(Math.random() * (maxPhone - minPhone + 1)) + minPhone;
    const randomPin = Math.floor(Math.random() * 9000) + 1000;

    setNewUserPhone(randomPhone.toString());
    setNewUserPin(randomPin.toString());
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setNewUserPhone('');
    setNewUserPin('');
    setNewUserInitialBalance('');
    setSelectedRandomOption(null);
  };

  const closeCreateTestUserModal = () => {
    setShowCreateTestUserModal(false);
    setNewUserPhone('');
    setNewUserPin('');
    setTestUserInitialBalance(0);
  };

  const closeUserCreatedModal = () => {
    setShowUserCreatedModal(false);
    setUserCreatedMessage('');
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

    const initialBalanceNumeric = parseFloat(newUserInitialBalance.replace(/\./g, ''));
    if (initialBalanceNumeric > MAX_RECHARGE) {
      alert('Límite máximo de saldo inicial: $10.000.000');
      return;
    }

    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(`${API_BASE_URL}/daviplata/user/create`, {
        method: 'POST',
        body: JSON.stringify({
          numero: newUserPhone.trim(),
          pin: newUserPin.trim(),
          balance: initialBalanceNumeric,
        }),
      });
      const deduction = resolveAdminDeduction(result);
      queueAdminBalanceModal(deduction);
      setUserCreatedMessage(result.client_message ?? '');
      playRetroSound('success');
      closeCreateUserModal();
      scheduleShareModalAfterAdmin(deduction, 'userCreated', () => setShowUserCreatedModal(true));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error de conexión. Intente nuevamente.');
    } finally {
      setShowProgressBar(false);
    }
  };

  const createTestUser = async () => {
    if (!newUserPhone.trim() || !newUserPin.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    if (newUserPin.length !== 4) {
      alert('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    setShowProgressBar(true);
    try {
      const result = await executeJsonRequest(`${API_BASE_URL}/daviplata/user/create-test`, {
        method: 'POST',
        body: JSON.stringify({
          numero: newUserPhone.trim(),
          pin: newUserPin.trim(),
          balance: testUserInitialBalance,
        }),
      });
      setUserCreatedMessage(result.client_message ?? '');
      playRetroSound('success');
      setShowUserCreatedModal(true);
      closeCreateTestUserModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error de conexión. Intente nuevamente.');
    } finally {
      setShowProgressBar(false);
    }
  };

  return (
    <div className="retro-app-manager">
      <main className="retro-app-manager__main">
        <AppGlobalNotificationControl app="daviplata" embedded={embedded} />
        <div className="max-w-6xl mx-auto space-y-4">
          {!userData && (
            <div className="retro-user-search-panel">
              <div className="text-center mb-8">
                <div className="flex justify-center items-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/20">
                    <img src="/davi_logo.webp" alt="Daviplata" className="h-full w-full object-cover" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Gestionar usuario</h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!searching) void searchUser();
                }}
                className="space-y-6"
              >
                <div className="retro-user-search-panel__field">
                  <label htmlFor="daviplataUserId" className="retro-user-search-panel__label">
                    Número de celular
                  </label>
                  <input
                    type="text"
                    id="daviplataUserId"
                    value={userIdInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 10) setUserIdInput(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    className="retro-user-search-panel__input"
                    placeholder="10 dígitos"
                  />
                </div>
                <button type="submit" disabled={searching} className="retro-user-search-panel__submit">
                  <div className="flex items-center justify-center space-x-2">
                    <RetroIcon name="misc/magnifying_glass" size={16} alt="" />
                    <span>{searching ? 'Buscando...' : 'Buscar Usuario'}</span>
                  </div>
                </button>
              </form>

              {searchError && (
                <div className="retro-user-search-panel__error">
                  <div className="retro-user-search-panel__error-inner">
                    <p className="retro-user-search-panel__error-text">{searchError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!userData && (
            <>
              <div className="text-center mt-6 mb-4">
                <h4 className="text-lg font-medium text-gray-300">Acciones rápidas</h4>
              </div>

              <div className="flex justify-center gap-4 mt-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  className="aspect-square w-32 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-red-400 hover:text-red-300 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                >
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs text-center leading-tight">Crear nuevo usuario</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTestUserModal(true)}
                  className="aspect-square w-32 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-amber-400 hover:text-amber-300 rounded-lg transition-colors font-medium flex flex-col items-center justify-center p-3"
                >
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs text-center leading-tight">Crear usuario de prueba</span>
                </button>
              </div>
            </>
          )}

          {userData && (
            <>
              <div className="retro-user-panel">
                <div className="retro-user-panel__toolbar">
                  <button type="button" className="retro-user-panel__link-btn" onClick={resetSearch}>
                    Nueva consulta
                  </button>
                </div>

                <div className="retro-user-panel__card">
                  <div className="retro-user-panel__header">
                    <div className="retro-user-panel__avatar">
                      <img src="/davi_logo.webp" alt="Daviplata" className="object-cover" />
                    </div>
                    <div className="retro-user-panel__identity">
                      <h4>{userData.username || 'Sin nombre'}</h4>
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
                      onAdd={() => openBalanceModal('add')}
                      onSubtract={() => openBalanceModal('subtract')}
                      addTitle="Recargar saldo"
                      subtractTitle="Restar saldo"
                    >
                      {`$${Number(userData.saldo || 0).toLocaleString('es-CO')}`}
                    </RetroUserDetailField>

                    <RetroUserDetailField
                      icon="security/key_win"
                      label="Clave"
                      valueVariant="warning"
                      onAction={openEditModal}
                      actionLabel="Cambiar"
                      actionTitle="Cambiar clave"
                    >
                      {userData.pin || 'No disponible'}
                    </RetroUserDetailField>

                    <RetroUserDetailField
                      icon="system/palm_computer"
                      label="Dispositivo"
                      valueVariant={userData.device_linked ? 'success' : 'danger'}
                      onAction={userData.device_linked ? unlinkDevice : undefined}
                      actionLabel="Desvincular"
                      actionTitle="Desvincular dispositivo"
                      actionVariant="danger"
                    >
                      {userData.device_status}
                    </RetroUserDetailField>

                    <RetroUserDetailField icon="office/document" label="Versión app" valueVariant="muted">
                      {userData.app_version || 'No disponible'}
                    </RetroUserDetailField>

                    <RetroUserDetailField icon="hardware/cell_phone" label="Modelo" valueVariant="muted">
                      {[userData.manufacturer, userData.model].filter(Boolean).join(' ') || 'No disponible'}
                    </RetroUserDetailField>

                    <RetroUserDetailField icon="files/file_windows" label="Paquete" valueVariant="muted">
                      {userData.package_name || 'No disponible'}
                    </RetroUserDetailField>
                  </div>
                </div>
              </div>

              <div className="retro-user-actions">
                <div className="retro-user-actions__titlebar">
                  <RetroIcon name="navigation/program_manager" size={14} alt="" />
                  Acciones rápidas
                </div>
                <div className="retro-user-actions__body">
                  <p className="retro-user-actions__section-title">Recargas</p>
                  <div className="retro-user-actions__grid">
                    {QUICK_RECHARGE_OPTIONS.map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => openRecargaModal(item.tag, item.label)}
                        className="retro-user-actions__chip"
                      >
                        <strong>{item.tag}</strong>
                        <small>{item.label.replace('$', '')}</small>
                      </button>
                    ))}
                  </div>

                  <hr className="retro-user-actions__divider" />
                  <p className="retro-user-actions__section-title">Gestionar usuario</p>
                  <div className="retro-user-actions__buttons">
                    <button
                      type="button"
                      onClick={toggleBanUser}
                      className={`retro-user-actions__btn ${
                        userData.baneado ? 'retro-user-actions__btn--success' : 'retro-user-actions__btn--danger'
                      }`}
                    >
                      {userData.baneado ? 'Habilitar usuario' : 'Inhabilitar usuario'}
                    </button>

                    <button type="button" onClick={openEditModal} className="retro-user-actions__btn">
                      Editar usuario
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowNotifyModal(true)}
                      className="retro-user-actions__btn"
                      disabled={!userData.has_fcm_token}
                    >
                      {userData.has_fcm_token ? 'Enviar notificación' : 'Sin FCM disponible'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showCustomBalanceModal && (
        <RetroModal
          open
          title={customBalanceMode === 'add' ? 'Recargar saldo' : 'Restar saldo'}
          onClose={() => setShowCustomBalanceModal(false)}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="office/calculator"
        >
          <RetroModalForm>
            <RetroModalField label="Monto" htmlFor="dvAmount">
              <RetroModalInput
                id="dvAmount"
                value={customBalanceAmount}
                onChange={(e) => setCustomBalanceAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 50000"
                autoFocus
              />
            </RetroModalField>
          </RetroModalForm>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowCustomBalanceModal(false)}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn onClick={() => void submitBalanceModal()}>
              {customBalanceMode === 'add' ? 'Recargar' : 'Restar'}
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {showRecargaModal && recargaData && userData && (
        <RetroModal
          open
          title="Confirmar recarga"
          onClose={closeRecargaModal}
          zIndex={110}
          bodyClassName="retro-manager-modal__body"
        >
          <div className="retro-manager-modal__intro">
            <p className="retro-manager-modal__text">¿Seguro que quieres recargar</p>
            <p className="retro-manager-modal__highlight">{recargaData.valor}</p>
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
              onClick={() => void handleQuickRecharge()}
              className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
            >
              Sí
            </button>
          </div>
        </RetroModal>
      )}

      {showEditModal && (
        <RetroModal
          open
          title="Editar usuario Daviplata"
          onClose={() => setShowEditModal(false)}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="users/computer_user_pencil"
        >
          <RetroModalBanner variant="info">
            Actualiza nombre, número de celular o clave del usuario.
          </RetroModalBanner>
          <RetroModalForm>
            <RetroModalField label="Nombre" htmlFor="dvUsername">
              <RetroModalInput id="dvUsername" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </RetroModalField>
            <RetroModalField label="Número de celular" htmlFor="dvPhone">
              <RetroModalInput
                id="dvPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </RetroModalField>
            <RetroModalField label="Clave" htmlFor="dvPin">
              <RetroModalInput
                id="dvPin"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </RetroModalField>
          </RetroModalForm>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn onClick={() => void submitEditModal()}>Guardar</RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {showNotifyModal && (
        <RetroModal
          open
          title="Enviar notificación"
          onClose={() => setShowNotifyModal(false)}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/envelope_closed"
        >
          <RetroModalForm>
            <RetroModalField label="Título" htmlFor="dvNotifyTitle">
              <RetroModalInput id="dvNotifyTitle" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            </RetroModalField>
            <RetroModalField label="Descripción" htmlFor="dvNotifyBody">
              <RetroModalTextarea id="dvNotifyBody" value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} rows={4} />
            </RetroModalField>
          </RetroModalForm>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowNotifyModal(false)}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn onClick={() => void submitNotifyModal()}>Enviar</RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      {showBanModal && (
        <RetroModal
          open
          title="Inhabilitar usuario"
          onClose={() => setShowBanModal(false)}
          width="md"
          bodyClassName="retro-manager-modal__body"
          icon="communication/msg_warning"
        >
          <RetroModalForm>
            <RetroModalField label="Razón" htmlFor="dvBanReason">
              <RetroModalTextarea id="dvBanReason" value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} />
            </RetroModalField>
            <label className="retro-manager-modal__checkbox">
              <input
                type="checkbox"
                checked={isTemporaryBan}
                onChange={(e) => setIsTemporaryBan(e.target.checked)}
              />
              <span>Suspensión temporal</span>
            </label>
            {isTemporaryBan ? (
              <RetroModalField label="Días" htmlFor="dvBanDays">
                <RetroModalInput
                  id="dvBanDays"
                  value={String(banDays)}
                  onChange={(e) => setBanDays(Math.max(1, Number(e.target.value.replace(/\D/g, '') || 1)))}
                />
              </RetroModalField>
            ) : null}
          </RetroModalForm>
          <RetroModalActions>
            <RetroModalBtn variant="secondary" onClick={() => setShowBanModal(false)}>
              Cancelar
            </RetroModalBtn>
            <RetroModalBtn variant="danger" onClick={() => void submitBanModal()}>
              Inhabilitar
            </RetroModalBtn>
          </RetroModalActions>
        </RetroModal>
      )}

      <RetroManagerProgressModal open={showProgressBar} message="Procesando solicitud..." />

      {showCreateUserModal && (
        <RetroModal
          open
          title="Crear usuario nuevo"
          onClose={closeCreateUserModal}
          zIndex={130}
          bodyClassName="retro-manager-modal__body"
        >
          <div className="retro-manager-modal__form">
            <div>
              <label htmlFor="dvNewUserPhone" className="retro-manager-modal__label">
                Número de usuario
              </label>
              <input
                type="text"
                id="dvNewUserPhone"
                value={newUserPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 10) setNewUserPhone(value);
                }}
                className="retro-manager-modal__input"
                placeholder="Ej: 3000000000"
                maxLength={10}
              />
            </div>

            <div>
              <label htmlFor="dvNewUserPin" className="retro-manager-modal__label">
                PIN de seguridad (4 dígitos)
              </label>
              <input
                type="text"
                id="dvNewUserPin"
                value={newUserPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 4) setNewUserPin(value);
                }}
                className="retro-manager-modal__input"
                placeholder="Ej: 1234"
                maxLength={4}
              />
            </div>

            <div>
              <label htmlFor="dvNewUserInitialBalance" className="retro-manager-modal__label">
                Saldo inicial ($)
              </label>
              <input
                type="text"
                id="dvNewUserInitialBalance"
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
              {QUICK_RECHARGE_OPTIONS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setQuickBalance(item.label.replace(/\$/g, '').replace(/\./g, ''), item.tag)}
                  className={
                    selectedRandomOption === item.tag
                      ? 'retro-manager-modal__amount-chip retro-manager-modal__amount-chip--selected'
                      : 'retro-manager-modal__amount-chip'
                  }
                >
                  <strong>{item.tag}</strong>
                  <small>{item.label.replace('$', '')}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="retro-manager-modal__actions">
            <button
              onClick={closeCreateUserModal}
              className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
            >
              Cancelar
            </button>
            <button
              onClick={() => void createNewUser()}
              disabled={
                !newUserPhone.trim() ||
                !newUserPin.trim() ||
                !newUserInitialBalance.trim() ||
                newUserPin.length !== 4 ||
                showProgressBar
              }
              className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
            >
              {showProgressBar ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </RetroModal>
      )}

      {showCreateTestUserModal && (
        <RetroModal
          open
          title="Crear usuario de prueba"
          onClose={closeCreateTestUserModal}
          zIndex={130}
          bodyClassName="retro-manager-modal__body"
        >
          <div className="retro-manager-modal__form">
            <div>
              <label htmlFor="dvTestUserPhone" className="retro-manager-modal__label">
                Número de usuario
              </label>
              <input
                type="text"
                id="dvTestUserPhone"
                value={newUserPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 10) setNewUserPhone(value);
                }}
                className="retro-manager-modal__input"
                placeholder="Ej: 3000000000"
                maxLength={10}
              />
            </div>

            <div>
              <label htmlFor="dvTestUserPin" className="retro-manager-modal__label">
                PIN de seguridad (4 dígitos)
              </label>
              <input
                type="text"
                id="dvTestUserPin"
                value={newUserPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 4) setNewUserPin(value);
                }}
                className="retro-manager-modal__input"
                placeholder="Ej: 1234"
                maxLength={4}
              />
            </div>

            <div>
              <label htmlFor="dvTestUserInitialBalance" className="retro-manager-modal__label">
                Saldo inicial
              </label>
              <RetroSelect
                id="dvTestUserInitialBalance"
                value={testUserInitialBalance}
                options={[...TEST_USER_BALANCE_OPTIONS]}
                onChange={setTestUserInitialBalance}
              />
            </div>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={fillRandomTestUserFields}
                className="retro-manager-btn retro-manager-btn--secondary"
              >
                Generar aleatorio
              </button>
            </div>

            <p className="retro-manager-modal__text retro-manager-modal__text--muted" style={{ textAlign: 'center' }}>
              Los usuarios de prueba no descuentan saldo del administrador.
            </p>
          </div>

          <div className="retro-manager-modal__actions">
            <button
              onClick={closeCreateTestUserModal}
              className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
            >
              Cancelar
            </button>
            <button
              onClick={() => void createTestUser()}
              disabled={!newUserPhone.trim() || !newUserPin.trim() || newUserPin.length !== 4 || showProgressBar}
              className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
            >
              {showProgressBar ? 'Creando...' : 'Crear usuario de prueba'}
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
          <RetroModalBanner variant="success">Usuario creado correctamente</RetroModalBanner>

          <RetroModalMessagePanel copyText={userCreatedMessage}>
            <pre>{userCreatedMessage}</pre>
          </RetroModalMessagePanel>

          <div className="retro-manager-modal__actions retro-manager-modal__actions--center">
            <button onClick={closeUserCreatedModal} className="retro-manager-btn retro-manager-btn--primary">
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
              <p>📱 Numero: <strong>{balanceConfirmationData.numeroCel}</strong></p>
              <p>
                {balanceConfirmationData.type === 'add' ? '💚' : '❤️'} Monto{' '}
                {balanceConfirmationData.type === 'add' ? 'agregado' : 'restado'}:{' '}
                <strong>${formatCurrency(balanceConfirmationData.amount)}</strong>
              </p>
              <p>💵 Nuevo saldo: <strong>${formatCurrency(balanceConfirmationData.newBalance)}</strong></p>
              <p>✅ ¡Operación completada exitosamente!</p>
            </div>
          </RetroModalMessagePanel>

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

      <RetroManagerConfirmModal
        open={confirmOpen}
        type={confirmType}
        title="Daviplata Alpha"
        message={confirmMessage}
        onClose={() => setConfirmOpen(false)}
      />

      <RetroAdminBalanceModal
        open={Boolean(adminBalanceModalData)}
        deduction={adminBalanceModalData}
        onClose={closeAdminBalanceModal}
        zIndex={220}
      />
    </div>
  );
}
