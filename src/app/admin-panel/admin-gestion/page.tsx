'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';

interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

interface BalanceOperation {
  amount: number;
  reason: string;
}

export default function AdminGestionPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [amount, setAmount] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'subtract'>('add');
  const [processing, setProcessing] = useState(false);

  // Estados para crear admin
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');

  // Estados para modales de notificación
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Estados para modal de operaciones
  const [showOperationsModal, setShowOperationsModal] = useState(false);
  const [adminOperations, setAdminOperations] = useState<any[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const router = useRouter();

  const fetchAdmins = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const adminsData = await response.json();
        setAdmins(adminsData);
      } else {
        console.error('Error obteniendo lista de administradores');
      }
    } catch (error) {
      console.error('Error obteniendo lista de administradores:', error);
    }
  };

  useEffect(() => {
    document.title = 'Gestión de Administradores - Admin Apps';

    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
      return;
    }

    // Verificar que el usuario sea owner
    const fetchCurrentAdmin = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const adminData = await response.json();
          if (adminData.role !== 'owner') {
            showError('No tienes permisos para acceder a esta página.');
            setTimeout(() => router.push('/admin-panel'), 2000);
            return;
          }
          setUser(adminData);
        } else {
          localStorage.removeItem('admin_token');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error obteniendo datos del admin:', error);
        localStorage.removeItem('admin_token');
        router.push('/');
        return;
      }
    };

    fetchCurrentAdmin().then(() => {
      fetchAdmins();
      setLoading(false);
    });
  }, [router]);

  const handleBack = () => {
    router.push('/admin-panel');
  };

  const handleHome = () => {
    router.push('/admin-panel');
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setAmount('');
    setOperationType('add');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedAdmin(null);
    setAmount('');
  };

  const handleOpenCreateModal = () => {
    setNewAdminEmail('');
    setNewAdminPassword('');
    setNewAdminName('');
    setNewAdminRole('admin');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewAdminEmail('');
    setNewAdminPassword('');
    setNewAdminName('');
    setNewAdminRole('admin');
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      showError('Por favor complete todos los campos');
      return;
    }

    if (newAdminPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
          name: newAdminName.trim(),
          role: newAdminRole
        })
      });

      if (response.ok) {
        showSuccess('Administrador creado exitosamente');
        handleCloseCreateModal();
        // Recargar la lista de administradores
        fetchAdmins();
      } else {
        const error = await response.json();
        showError(`Error: ${error.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error creando administrador:', error);
      showError('Error al crear el administrador');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewOperations = async (admin: Admin) => {
    setOperationsLoading(true);
    setShowOperationsModal(true);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/admin/${admin.email}/operations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminOperations(data.operations || []);
      } else {
        const error = await response.json();
        showError(`Error: ${error.detail || 'Error desconocido'}`);
        setShowOperationsModal(false);
      }
    } catch (error) {
      console.error('Error obteniendo operaciones:', error);
      showError('Error al obtener las operaciones del administrador');
      setShowOperationsModal(false);
    } finally {
      setOperationsLoading(false);
    }
  };

  const handleCloseOperationsModal = () => {
    setShowOperationsModal(false);
    setAdminOperations([]);
  };

  const handleBalanceOperation = async () => {
    if (!selectedAdmin || !amount) {
      showError('Por favor ingrese el monto');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('El monto debe ser un número positivo');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const endpoint = operationType === 'add'
        ? `${API_BASE_URL}/admin/admin/${selectedAdmin.id}/add-balance`
        : `${API_BASE_URL}/admin/admin/${selectedAdmin.id}/subtract-balance`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: numAmount,
          reason: `${operationType === 'add' ? 'Recarga' : 'Deducción'} manual por ${user?.name || 'Admin'}`
        })
      });

      if (response.ok) {
        showSuccess(`Saldo ${operationType === 'add' ? 'agregado' : 'restado'} exitosamente`);
        handleCloseModal();
        fetchAdmins();
      } else {
        const error = await response.json();
        showError(`Error: ${error.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error en operación de saldo:', error);
      showError('Error al procesar la operación de saldo');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              title="Volver al panel principal"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white truncate">Gestión de Administradores</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">Lista de Administradores</h2>

            {admins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No hay administradores para mostrar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-300 table-fixed">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left w-16">ID</th>
                      <th className="px-4 py-3 text-left w-32">Nombre</th>
                      <th className="px-4 py-3 text-left w-40">Email</th>
                      <th className="px-4 py-3 text-left w-20">Rol</th>
                      <th className="px-4 py-3 text-left w-20">Estado</th>
                      <th className="px-4 py-3 text-left w-28">Saldo</th>
                      <th className="px-4 py-3 text-left w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr
                        key={admin.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                        onClick={() => handleViewOperations(admin)}
                      >
                        <td className="px-4 py-4 text-center">{admin.id}</td>
                        <td className="px-4 py-4">
                          <span className="block truncate overflow-hidden text-ellipsis" title={admin.name}>
                            {admin.name}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="block truncate overflow-hidden text-ellipsis" title={admin.email}>
                            {admin.email}
                          </span>
                        </td>
                        <td className="px-4 py-4 capitalize">
                          <span className="block truncate overflow-hidden text-ellipsis" title={admin.role}>
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium block truncate overflow-hidden text-ellipsis ${
                            admin.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`} title={admin.active ? 'Activo' : 'Inactivo'}>
                            {admin.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="block truncate overflow-hidden text-ellipsis font-mono text-xs" title={`COP ${admin.balance?.toLocaleString('es-CO') || '0'}`}>
                            COP {admin.balance?.toLocaleString('es-CO') || '0'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex space-x-1 justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAdmin(admin);
                              }}
                              className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded hover:bg-blue-900/20 transition-colors"
                            >
                              💰 Saldo
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal para editar administrador */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Gestionar Saldo
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Información del admin */}
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <div className="text-sm text-gray-300 mb-1">Administrador</div>
                <div className="font-medium text-white truncate max-w-48" title={selectedAdmin.name}>{selectedAdmin.name}</div>
                <div className="text-xs text-gray-400 truncate max-w-48" title={selectedAdmin.email}>{selectedAdmin.email}</div>
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-sm text-gray-300">Saldo actual</div>
                  <div className="text-xl font-bold text-white truncate max-w-48 overflow-hidden text-ellipsis" title={`COP ${selectedAdmin.balance?.toLocaleString('es-CO') || '0'}`}>
                    COP {selectedAdmin.balance?.toLocaleString('es-CO') || '0'}
                  </div>
                </div>
              </div>

              {/* Tipo de operación */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Operación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOperationType('add')}
                    className={`p-3 rounded-lg font-medium transition-all duration-200 ${
                      operationType === 'add'
                        ? 'bg-green-600 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <div className="text-sm">Recargar</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setOperationType('subtract')}
                    className={`p-3 rounded-lg font-medium transition-all duration-200 ${
                      operationType === 'subtract'
                        ? 'bg-red-600 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      <div className="text-sm">Restar</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monto (COP)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-semibold"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleBalanceOperation}
                disabled={processing || !amount}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  operationType === 'add'
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {processing ? 'Procesando...' : (operationType === 'add' ? 'Recargar' : 'Restar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear administrador */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={handleCloseCreateModal}
          />

          {/* Modal */}
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Nuevo Administrador
              </h3>
              <button
                onClick={handleCloseCreateModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rol
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Administrador</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCloseCreateModal}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={processing || !newAdminEmail || !newAdminName || !newAdminPassword}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">¡Éxito!</h3>
              <p className="text-gray-300 mb-6 break-words">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowErrorModal(false)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
              <p className="text-gray-300 mb-6 break-words">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Operaciones del Admin */}
      {showOperationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleCloseOperationsModal} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b border-gray-700 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">Operaciones del Administrador</h3>
                <p className="text-gray-400 text-sm truncate" title={adminOperations.length > 0 ? adminOperations[0]?.admin_email : 'Cargando...'}>
                  {adminOperations.length > 0 ? adminOperations[0]?.admin_email : 'Cargando...'}
                </p>
              </div>
              <button
                onClick={handleCloseOperationsModal}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors self-end sm:self-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
              {operationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-blue-500"></div>
                  <span className="ml-3 text-gray-300 text-lg">Cargando operaciones...</span>
                </div>
              ) : adminOperations.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-20 h-20 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400 text-lg">No hay operaciones registradas para este administrador.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminOperations.map((operation, index) => (
                    <div key={operation.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      {/* Header con tipo, monto y fecha */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className={`px-3 py-1 rounded text-xs font-medium self-start whitespace-nowrap ${
                            operation.operation_type === 'ADD_BALANCE' ? 'bg-green-900 text-green-300' :
                            operation.operation_type === 'SUBTRACT_BALANCE' ? 'bg-red-900 text-red-300' :
                            operation.operation_type === 'CREATE_USER' ? 'bg-blue-900 text-blue-300' :
                            operation.operation_type === 'CREATE_ADMIN' ? 'bg-purple-900 text-purple-300' :
                            'bg-gray-900 text-gray-300'
                          }`}>
                            {operation.operation_type}
                          </span>
                          {operation.amount > 0 && (
                            <span className="text-sm text-gray-300 font-mono truncate" title={`COP ${operation.amount.toLocaleString('es-CO')}`}>
                              COP {operation.amount.toLocaleString('es-CO')}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded truncate max-w-full" title={operation.timestamp ? new Date(operation.timestamp).toLocaleString('es-CO') : 'Fecha desconocida'}>
                            {operation.timestamp ? new Date(operation.timestamp).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Fecha desconocida'}
                          </span>
                        </div>
                      </div>

                      {/* Razón */}
                      {operation.reason && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-300 leading-relaxed" title={operation.reason}>
                            {operation.reason}
                          </p>
                        </div>
                      )}

                      {/* Información adicional */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                        {operation.target_user && (
                          <div className="truncate" title={`Usuario afectado: ${operation.target_user}`}>
                            <span className="font-medium">Usuario:</span> {operation.target_user}
                          </div>
                        )}
                        {(operation.previous_balance !== 0 || operation.new_balance !== 0) && (
                          <div className="truncate font-mono" title={`Balance anterior: ${operation.previous_balance?.toLocaleString('es-CO')} → Balance nuevo: ${operation.new_balance?.toLocaleString('es-CO')}`}>
                            <span className="font-medium">Balance:</span> {operation.previous_balance?.toLocaleString('es-CO')} → {operation.new_balance?.toLocaleString('es-CO')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante para crear nuevo admin */}
      <button
        onClick={handleOpenCreateModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
        title="Crear nuevo administrador"
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}
