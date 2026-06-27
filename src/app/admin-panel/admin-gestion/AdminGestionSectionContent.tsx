'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import {
  RetroInteractiveTable,
  RetroLoadingOverlay,
  RetroSelect,
  type RetroTableColumn,
} from '../../../components/retro';
import {
  RetroModal,
  RetroManagerConfirmModal,
  RetroManagerProgressModal,
} from '../../../components/retro/admin';

interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  balance: number;
}

interface AdminOperation {
  id?: string;
  admin_email?: string;
  operation_type: string;
  target_user?: string;
  amount: number;
  reason?: string;
  previous_balance?: number;
  new_balance?: number;
  timestamp?: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'owner', label: 'Propietario' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOperationTypeLabel(operationType: string) {
  switch (operationType) {
    case 'ADD_BALANCE':
      return 'Recarga';
    case 'SUBTRACT_BALANCE':
      return 'Retiro';
    case 'ADD_ADMIN_BALANCE':
      return 'Recarga admin';
    case 'SUBTRACT_ADMIN_BALANCE':
      return 'Retiro admin';
    case 'CREATE_USER':
    case 'CREATE_USER_BANCOLOMBIA':
      return 'Crear usuario';
    case 'CREATE_ADMIN':
      return 'Crear admin';
    default:
      return operationType.replace(/_/g, ' ');
  }
}

function getOperationTypeClass(operationType: string) {
  if (operationType.includes('ADD')) return 'retro-admin-gestion__op-type--add';
  if (operationType.includes('SUBTRACT')) return 'retro-admin-gestion__op-type--subtract';
  return 'retro-admin-gestion__op-type--neutral';
}

export function AdminGestionSectionContent() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [amount, setAmount] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'subtract'>('add');
  const [processing, setProcessing] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [showOperationsModal, setShowOperationsModal] = useState(false);
  const [operationsAdmin, setOperationsAdmin] = useState<Admin | null>(null);
  const [adminOperations, setAdminOperations] = useState<AdminOperation[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);

  const fetchAdmins = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAdmins(await response.json());
      } else {
        console.error('Error obteniendo lista de administradores');
      }
    } catch (error) {
      console.error('Error obteniendo lista de administradores:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
      return;
    }

    let cancelled = false;

    const fetchCurrentAdmin = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const adminData = await response.json();
          if (adminData.role !== 'owner') {
            showError('No tienes permisos para acceder a esta página.');
            setTimeout(() => router.push('/admin-panel'), 2000);
            return false;
          }
          setUser(adminData);
          return true;
        }

        localStorage.removeItem('admin_token');
        router.push('/');
        return false;
      } catch (error) {
        console.error('Error obteniendo datos del admin:', error);
        localStorage.removeItem('admin_token');
        router.push('/');
        return false;
      }
    };

    void (async () => {
      try {
        const canLoadAdmins = await fetchCurrentAdmin();
        if (!cancelled && canLoadAdmins) {
          await fetchAdmins();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
          name: newAdminName.trim(),
          role: newAdminRole,
        }),
      });

      if (response.ok) {
        showSuccess('Administrador creado exitosamente');
        handleCloseCreateModal();
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
    setOperationsAdmin(admin);
    setOperationsLoading(true);
    setShowOperationsModal(true);
    setAdminOperations([]);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/admin/${admin.email}/operations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdminOperations(data.operations || []);
      } else {
        const error = await response.json();
        showError(`Error: ${error.detail || 'Error desconocido'}`);
        setShowOperationsModal(false);
        setOperationsAdmin(null);
      }
    } catch (error) {
      console.error('Error obteniendo operaciones:', error);
      showError('Error al obtener las operaciones del administrador');
      setShowOperationsModal(false);
      setOperationsAdmin(null);
    } finally {
      setOperationsLoading(false);
    }
  };

  const handleCloseOperationsModal = () => {
    setShowOperationsModal(false);
    setAdminOperations([]);
    setOperationsAdmin(null);
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
      const endpoint =
        operationType === 'add'
          ? `${API_BASE_URL}/admin/admin/${selectedAdmin.id}/add-balance`
          : `${API_BASE_URL}/admin/admin/${selectedAdmin.id}/subtract-balance`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          reason: `${operationType === 'add' ? 'Recarga' : 'Deducción'} manual por ${user?.name || 'Admin'}`,
        }),
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

  const adminColumns = useMemo<RetroTableColumn<Admin>[]>(
    () => [
      { key: 'id', header: 'ID', render: (admin) => admin.id },
      {
        key: 'name',
        header: 'Nombre',
        render: (admin) => admin.name,
      },
      {
        key: 'email',
        header: 'Email',
        render: (admin) => admin.email,
      },
      {
        key: 'role',
        header: 'Rol',
        render: (admin) => admin.role,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (admin) => (
          <span
            className={`retro-admin-gestion__badge ${
              admin.active ? 'retro-admin-gestion__badge--active' : 'retro-admin-gestion__badge--inactive'
            }`}
          >
            {admin.active ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Saldo',
        render: (admin) => formatCurrency(admin.balance ?? 0),
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (admin) => (
          <button
            type="button"
            className="retro-admin-gestion__action-btn"
            onClick={(event) => {
              event.stopPropagation();
              handleEditAdmin(admin);
            }}
          >
            Saldo
          </button>
        ),
      },
    ],
    [],
  );

  const operationColumns = useMemo<RetroTableColumn<AdminOperation>[]>(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        render: (op) => formatDate(op.timestamp),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        render: (op) => (
          <span className={`retro-admin-gestion__op-type ${getOperationTypeClass(op.operation_type)}`}>
            {getOperationTypeLabel(op.operation_type)}
          </span>
        ),
      },
      {
        key: 'monto',
        header: 'Monto',
        render: (op) => (op.amount > 0 ? formatCurrency(op.amount) : '—'),
      },
      {
        key: 'usuario',
        header: 'Usuario',
        render: (op) => op.target_user || '—',
      },
      {
        key: 'saldo',
        header: 'Balance',
        render: (op) =>
          op.previous_balance != null && op.new_balance != null
            ? `${formatCurrency(op.previous_balance)} → ${formatCurrency(op.new_balance)}`
            : '—',
      },
      {
        key: 'detalle',
        header: 'Detalle',
        cellClassName: 'retro-tableview-cell--wrap',
        render: (op) => op.reason || '—',
      },
    ],
    [],
  );

  if (loading) {
    return <RetroLoadingOverlay message="Cargando administradores..." />;
  }

  return (
    <>
      <div className="retro-admin-gestion">
        <div className="retro-admin-gestion__toolbar">
          <p className="retro-admin-gestion__hint">
            {admins.length} administrador{admins.length !== 1 ? 'es' : ''} · Clic en fila para ver operaciones
          </p>
          <button
            type="button"
            className="retro-manager-btn retro-manager-btn--primary"
            onClick={handleOpenCreateModal}
          >
            + Nuevo administrador
          </button>
        </div>

        <RetroInteractiveTable
          columns={adminColumns}
          rows={admins}
          getRowKey={(admin) => String(admin.id)}
          emptyMessage="No hay administradores para mostrar."
          onRowClick={handleViewOperations}
        />
      </div>

      {showEditModal && selectedAdmin && (
        <RetroModal
          open
          title="Gestionar saldo"
          onClose={handleCloseModal}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="users/address_book_user"
        >
          <div className="retro-manager-modal__form">
            <div className="retro-admin-gestion__info-box">
              <p className="retro-admin-gestion__info-box-label">Administrador</p>
              <p className="retro-admin-gestion__info-box-value">{selectedAdmin.name}</p>
              <p className="retro-admin-gestion__info-box-meta">{selectedAdmin.email}</p>
              <hr className="retro-admin-gestion__info-box-divider" />
              <p className="retro-admin-gestion__info-box-label">Saldo actual</p>
              <p className="retro-admin-gestion__info-box-value retro-admin-gestion__info-box-value--balance">
                {formatCurrency(selectedAdmin.balance ?? 0)}
              </p>
            </div>

            <div>
              <span className="retro-manager-modal__label">Operación</span>
              <div className="retro-admin-gestion__op-toggle">
                <button
                  type="button"
                  className={`retro-admin-gestion__op-toggle-btn retro-admin-gestion__op-toggle-btn--add ${
                    operationType === 'add' ? 'retro-admin-gestion__op-toggle-btn--active' : ''
                  }`}
                  onClick={() => setOperationType('add')}
                >
                  + Recargar
                </button>
                <button
                  type="button"
                  className={`retro-admin-gestion__op-toggle-btn retro-admin-gestion__op-toggle-btn--subtract ${
                    operationType === 'subtract' ? 'retro-admin-gestion__op-toggle-btn--active' : ''
                  }`}
                  onClick={() => setOperationType('subtract')}
                >
                  − Restar
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="balanceAmount" className="retro-manager-modal__label">
                Monto (COP)
              </label>
              <input
                id="balanceAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="retro-manager-modal__input"
                min={0}
              />
            </div>
          </div>

          <hr className="retro-manager-modal__divider" />
          <div className="retro-manager-modal__actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBalanceOperation}
              disabled={processing || !amount}
              className={`retro-manager-btn retro-manager-btn--block ${
                operationType === 'add' ? 'retro-manager-btn--primary' : 'retro-manager-btn--danger'
              }`}
            >
              {operationType === 'add' ? 'Recargar' : 'Restar'}
            </button>
          </div>
        </RetroModal>
      )}

      {showCreateModal && (
        <RetroModal
          open
          title="Nuevo administrador"
          onClose={handleCloseCreateModal}
          zIndex={120}
          width="sm"
          bodyClassName="retro-manager-modal__body"
          icon="users/address_book_users"
        >
          <div className="retro-manager-modal__form">
            <div>
              <label htmlFor="newAdminEmail" className="retro-manager-modal__label">
                Email
              </label>
              <input
                id="newAdminEmail"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                className="retro-manager-modal__input"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="newAdminName" className="retro-manager-modal__label">
                Nombre
              </label>
              <input
                id="newAdminName"
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Nombre completo"
                className="retro-manager-modal__input"
              />
            </div>

            <div>
              <label htmlFor="newAdminPassword" className="retro-manager-modal__label">
                Contraseña
              </label>
              <input
                id="newAdminPassword"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="retro-manager-modal__input"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="newAdminRole" className="retro-manager-modal__label">
                Rol
              </label>
              <RetroSelect
                id="newAdminRole"
                value={newAdminRole}
                onChange={setNewAdminRole}
                options={ROLE_OPTIONS}
              />
            </div>
          </div>

          <hr className="retro-manager-modal__divider" />
          <div className="retro-manager-modal__actions">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateAdmin}
              disabled={processing || !newAdminEmail || !newAdminName || !newAdminPassword}
              className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"
            >
              Crear
            </button>
          </div>
        </RetroModal>
      )}

      {showOperationsModal && (
        <RetroModal
          open
          title="Operaciones del administrador"
          onClose={handleCloseOperationsModal}
          zIndex={120}
          width="lg"
          bodyClassName="retro-manager-modal__body"
          icon="files/document"
        >
          <p className="retro-manager-modal__text retro-manager-modal__text--muted">
            {operationsAdmin?.name} · {operationsAdmin?.email}
          </p>

          {operationsLoading ? (
            <p className="retro-manager-modal__text">Cargando operaciones...</p>
          ) : (
            <RetroInteractiveTable
              columns={operationColumns}
              rows={adminOperations}
              getRowKey={(op) =>
                op.id || `${op.operation_type}-${op.timestamp || 'unknown'}-${op.target_user || ''}`
              }
              emptyMessage="No hay operaciones registradas para este administrador."
              panelClassName="retro-admin-gestion__ops-table"
            />
          )}
        </RetroModal>
      )}

      <RetroManagerConfirmModal
        open={showSuccessModal}
        type="success"
        title="Éxito"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
        zIndex={140}
      />

      <RetroManagerConfirmModal
        open={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        zIndex={140}
      />

      <RetroManagerProgressModal open={processing} message="Procesando operación..." zIndex={150} />
    </>
  );
}
