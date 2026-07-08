'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroInteractiveTable, RetroLoadingOverlay } from '../../../components/retro';
import type { RetroTableColumn } from '../../../components/retro';

interface AdminOperation {
  id: string;
  admin_email: string;
  admin_name: string;
  operation_type: string;
  target_user: string;
  amount: number;
  reason: string;
  previous_balance: number;
  new_balance: number;
  timestamp: string;
}

type FilterType = 'ALL' | 'BALANCE' | 'ADMIN_BALANCE' | 'SMS' | 'USER_ACTIONS' | 'USER_CREATIONS';

function getOperationTypeLabel(operationType: string): string {
  switch (operationType) {
    case 'ADD_BALANCE':
      return 'Recarga';
    case 'ADD_BALANCE_BANCOLOMBIA':
    case 'ADD_BALANCE_BANCOLOMBIA_MANUAL':
    case 'ADD_BALANCE_DAVIPLATA':
    case 'ADD_BALANCE_DAVIPLATA_MANUAL':
      return 'Recarga';
    case 'SUBTRACT_BALANCE':
    case 'SUBTRACT_BALANCE_DAVIPLATA':
      return 'Retiro';
    case 'ADD_ADMIN_BALANCE':
      return 'Recarga admin';
    case 'ADD_ADMIN_BALANCE_WOMPI':
      return 'Recarga Wompi';
    case 'SUBTRACT_ADMIN_BALANCE':
      return 'Retiro admin';
    case 'UPDATE_USER':
      return 'Actualización';
    case 'BAN_USER':
      return 'Inhabilitar';
    case 'UNBAN_USER':
      return 'Habilitar';
    case 'UNLINK_DEVICE':
    case 'UNLINK_DEVICE_BANCOLOMBIA':
      return 'Desvincular';
    case 'UPGRADE_VIP':
      return 'Activar VIP';
    case 'CANCEL_VIP':
      return 'Cancelar VIP';
    case 'ADD_SMS':
      return 'Agregar SMS';
    case 'SUBTRACT_SMS':
      return 'Restar SMS';
    case 'CREATE_USER':
    case 'CREATE_USER_BANCOLOMBIA':
    case 'CREATE_USER_DAVIPLATA':
    case 'CREATE_TEST_USER':
    case 'CREATE_TEST_USER_BANCOLOMBIA':
    case 'CREATE_TEST_USER_DAVIPLATA':
      return 'Crear usuario';
    case 'ASSIGN_PROMO_NEQUI':
      return 'Asignar paquete Nequi';
    case 'ASSIGN_PROMO_BANCOLOMBIA':
      return 'Asignar paquete BC';
    case 'USER_NOTIFICATION_BANCOLOMBIA':
      return 'Notificación';
    default:
      return operationType.replace(/_/g, ' ');
  }
}

function getOperationTypeClass(operationType: string): string {
  if (operationType.includes('ADD')) return 'retro-registros__type-badge--add';
  if (operationType.includes('SUBTRACT') || operationType === 'BAN_USER') {
    return 'retro-registros__type-badge--subtract';
  }
  if (
    [
      'UPDATE_USER',
      'UNBAN_USER',
      'UNLINK_DEVICE',
      'UNLINK_DEVICE_BANCOLOMBIA',
      'UPGRADE_VIP',
      'CANCEL_VIP',
      'USER_NOTIFICATION_BANCOLOMBIA',
      'CREATE_USER',
      'CREATE_USER_BANCOLOMBIA',
      'CREATE_USER_DAVIPLATA',
      'CREATE_TEST_USER',
      'CREATE_TEST_USER_BANCOLOMBIA',
      'CREATE_TEST_USER_DAVIPLATA',
      'ASSIGN_PROMO_NEQUI',
      'ASSIGN_PROMO_BANCOLOMBIA',
    ].includes(operationType)
  ) {
    return 'retro-registros__type-badge--action';
  }
  return 'retro-registros__type-badge--neutral';
}

function getAmountClass(operationType: string): string {
  if (operationType.includes('ADD')) return 'retro-registros__amount--add';
  if (operationType.includes('SUBTRACT')) return 'retro-registros__amount--subtract';
  return '';
}

export function RegistrosSectionContent() {
  const router = useRouter();
  const [operations, setOperations] = useState<AdminOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/operations?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al cargar operaciones');
      }
    } catch (err) {
      console.error('Error fetching operations:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getFilteredOperations = () => {
    if (activeFilter === 'ALL') return operations;

    const balanceTypes = [
      'ADD_BALANCE',
      'SUBTRACT_BALANCE',
      'ADD_BALANCE_BANCOLOMBIA',
      'ADD_BALANCE_BANCOLOMBIA_MANUAL',
      'SUBTRACT_BALANCE_BANCOLOMBIA',
      'ADD_BALANCE_DAVIPLATA',
      'ADD_BALANCE_DAVIPLATA_MANUAL',
      'SUBTRACT_BALANCE_DAVIPLATA',
    ];
    const adminBalanceTypes = ['ADD_ADMIN_BALANCE', 'ADD_ADMIN_BALANCE_WOMPI', 'SUBTRACT_ADMIN_BALANCE'];
    const smsTypes = ['ADD_SMS', 'SUBTRACT_SMS'];
    const userActionTypes = [
      'UPDATE_USER',
      'BAN_USER',
      'UNBAN_USER',
      'UNLINK_DEVICE',
      'UNLINK_DEVICE_BANCOLOMBIA',
      'UPGRADE_VIP',
      'CANCEL_VIP',
      'USER_NOTIFICATION_BANCOLOMBIA',
      'ASSIGN_PROMO_NEQUI',
      'ASSIGN_PROMO_BANCOLOMBIA',
    ];
    const userCreationTypes = [
      'CREATE_USER',
      'CREATE_USER_BANCOLOMBIA',
      'CREATE_USER_DAVIPLATA',
      'CREATE_TEST_USER',
      'CREATE_TEST_USER_BANCOLOMBIA',
      'CREATE_TEST_USER_DAVIPLATA',
    ];

    switch (activeFilter) {
      case 'BALANCE':
        return operations.filter((op) => balanceTypes.includes(op.operation_type));
      case 'ADMIN_BALANCE':
        return operations.filter((op) => adminBalanceTypes.includes(op.operation_type));
      case 'SMS':
        return operations.filter((op) => smsTypes.includes(op.operation_type));
      case 'USER_ACTIONS':
        return operations.filter((op) => userActionTypes.includes(op.operation_type));
      case 'USER_CREATIONS':
        return operations.filter((op) => userCreationTypes.includes(op.operation_type));
      default:
        return operations;
    }
  };

  const filteredRows = useMemo(
    () =>
      [...getFilteredOperations()].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [operations, activeFilter],
  );

  const columns = useMemo<RetroTableColumn<AdminOperation>[]>(
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
          <span className={`retro-registros__type-badge ${getOperationTypeClass(op.operation_type)}`}>
            {getOperationTypeLabel(op.operation_type)}
          </span>
        ),
      },
      {
        key: 'admin',
        header: 'Administrador',
        render: (op) => op.admin_name || op.admin_email,
      },
      {
        key: 'usuario',
        header: 'Usuario',
        render: (op) => op.target_user || '—',
      },
      {
        key: 'monto',
        header: 'Monto',
        render: (op) =>
          op.amount != null && op.amount !== 0 ? (
            <span className={getAmountClass(op.operation_type)}>
              ${formatCurrency(op.amount)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'saldo',
        header: 'Saldo',
        render: (op) =>
          op.previous_balance != null && op.new_balance != null
            ? `$${formatCurrency(op.previous_balance)} → $${formatCurrency(op.new_balance)}`
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

  const filterLabel =
    activeFilter === 'BALANCE'
      ? 'Recargas/Retiros'
      : activeFilter === 'ADMIN_BALANCE'
        ? 'Balance Admin'
        : activeFilter === 'SMS'
          ? 'SMS'
          : activeFilter === 'USER_ACTIONS'
            ? 'Gestión de Usuarios'
            : activeFilter === 'USER_CREATIONS'
              ? 'Usuarios Creados'
              : 'Todas';

  if (loading) {
    return <RetroLoadingOverlay message="Cargando registros..." />;
  }

  return (
    <div className="retro-registros">
      <fieldset className="retro-registros__filters">
        <legend>Filtrar operaciones</legend>
        <div className="retro-registros__filter-row">
          {(
            [
              ['ALL', `Todas (${operations.length})`],
              [
                'BALANCE',
                `Recargas/Retiros (${operations.filter((op) => ['ADD_BALANCE', 'SUBTRACT_BALANCE'].includes(op.operation_type)).length})`,
              ],
              [
                'ADMIN_BALANCE',
                `Balance Admin (${operations.filter((op) => ['ADD_ADMIN_BALANCE', 'ADD_ADMIN_BALANCE_WOMPI', 'SUBTRACT_ADMIN_BALANCE'].includes(op.operation_type)).length})`,
              ],
              [
                'SMS',
                `SMS (${operations.filter((op) => ['ADD_SMS', 'SUBTRACT_SMS'].includes(op.operation_type)).length})`,
              ],
              [
                'USER_ACTIONS',
                `Gestión (${operations.filter((op) => ['UPDATE_USER', 'BAN_USER', 'UNBAN_USER', 'UNLINK_DEVICE', 'UNLINK_DEVICE_BANCOLOMBIA', 'UPGRADE_VIP', 'CANCEL_VIP', 'USER_NOTIFICATION_BANCOLOMBIA'].includes(op.operation_type)).length})`,
              ],
              [
                'USER_CREATIONS',
                `Creados (${operations.filter((op) => ['CREATE_USER', 'CREATE_USER_BANCOLOMBIA', 'CREATE_USER_DAVIPLATA', 'CREATE_TEST_USER', 'CREATE_TEST_USER_BANCOLOMBIA', 'CREATE_TEST_USER_DAVIPLATA'].includes(op.operation_type)).length})`,
              ],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`retro-registros__filter-btn${activeFilter === key ? ' retro-registros__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="retro-registros__header">
        <h2 className="retro-registros__title">Historial de operaciones</h2>
        <p className="retro-registros__subtitle">
          {activeFilter === 'ALL'
            ? 'Registro detallado de todas tus acciones administrativas'
            : `${filterLabel} — ${filteredRows.length} registro${filteredRows.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && <p className="retro-registros__error">{error}</p>}

      <RetroInteractiveTable
        columns={columns}
        rows={filteredRows}
        getRowKey={(op) => op.id}
        panelClassName="retro-registros__table"
        emptyMessage={
          activeFilter === 'ALL'
            ? 'No hay operaciones registradas'
            : `No hay operaciones de ${filterLabel.toLowerCase()}`
        }
      />
    </div>
  );
}
