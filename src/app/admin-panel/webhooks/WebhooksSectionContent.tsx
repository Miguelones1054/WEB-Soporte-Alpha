'use client';

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/constants';
import { getAdminToken } from '../../../lib/sessionStorage';
import { copyTextToClipboard } from '../../../lib/copyToClipboard';
import { RetroButton, RetroIcon, RetroModal, RetroAlert } from '../../../components/retro';

// ---------------------------------------------------------------------------
// Tipos e Interfaces
// ---------------------------------------------------------------------------

export type HttpMethod = 'POST' | 'GET' | 'PUT';

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface WebhookParam {
  key: string;
  value_type: 'static' | 'dynamic' | 'by_operation';
  value: string;
  operation_values?: {
    recargas?: string;
    vips?: string;
    sms?: string;
    paquetes?: string;
    crear_usuario?: string;
    otras?: string;
    [key: string]: string | undefined;
  };
}

export const DEFAULT_OP_TEXTS: Record<string, string> = {
  recargas: 'Recarga de saldo',
  vips: 'Actualización VIP',
  sms: 'Créditos SMS',
  paquetes: 'Paquetes y promociones',
  crear_usuario: 'Creación de usuario',
  otras: 'Operación administrativa',
};

export interface WebhookOperations {
  recargas: boolean;
  vips: boolean;
  sms: boolean;
  paquetes: boolean;
  crear_usuario: boolean;
  otras: boolean;
}

export interface WebhookItem {
  id: string;
  admin_email: string;
  name: string;
  url: string;
  method: HttpMethod;
  enabled: boolean;
  app: 'all' | 'nequi' | 'bancolombia' | 'daviplata';
  operations: WebhookOperations;
  headers: WebhookHeader[];
  parameters: WebhookParam[];
  created_at: string;
  updated_at: string;
  last_trigger_at?: string | null;
  last_status_code?: number | null;
  last_error?: string | null;
  last_latency_ms?: number | null;
}

export interface DynamicVarMeta {
  key: string;
  label: string;
  description: string;
  example: string | number;
  category: string;
}

export interface WebhookLogItem {
  id: string;
  webhook_id: string;
  webhook_name: string;
  url: string;
  method: string;
  app: string;
  category: string;
  operation_type?: string;
  target_user?: string;
  status_code: number | null;
  success: boolean;
  latency_ms: number;
  request_headers: Record<string, string>;
  request_payload: Record<string, any>;
  response_body?: string;
  error_message?: string | null;
  timestamp: string;
}

const DEFAULT_OPERATIONS: WebhookOperations = {
  recargas: true,
  vips: true,
  sms: true,
  paquetes: true,
  crear_usuario: true,
  otras: false,
};

const DEFAULT_DYNAMIC_VARS: DynamicVarMeta[] = [
  { key: 'ganancia', label: 'Ganancia de la operación', description: 'Ganancia neta calculada para el admin en COP (ej. 19500)', example: 19500, category: 'financiero' },
  { key: 'monto_operacion', label: 'Monto de la operación', description: 'Monto de saldo acreditado o solicitado (ej. 50000)', example: 50000, category: 'financiero' },
  { key: 'valor_cliente', label: 'Valor cobrado al cliente', description: 'Precio total cobrado al cliente final', example: 50000, category: 'financiero' },
  { key: 'costo_admin', label: 'Costo descontado al admin', description: 'Costo debitado del saldo del administrador', example: 30500, category: 'financiero' },
  { key: 'target_user', label: 'Usuario o Teléfono', description: 'Número de celular o identificador del cliente', example: '3001234567', category: 'cliente' },
  { key: 'app', label: 'Nombre de la aplicación', description: 'nequi, bancolombia o daviplata', example: 'nequi', category: 'operacion' },
  { key: 'operation_type', label: 'Código técnico de operación', description: 'Identificador (ADD_BALANCE, UPGRADE_VIP, etc.)', example: 'ADD_BALANCE', category: 'operacion' },
  { key: 'operation_label', label: 'Nombre de operación legible', description: 'Descripción legible (ej. Recarga Nequi)', example: 'Recarga Nequi', category: 'operacion' },
  { key: 'admin_email', label: 'Email del administrador', description: 'Correo del administrador que ejecutó la acción', example: 'admin@alpha.com', category: 'admin' },
  { key: 'admin_name', label: 'Nombre del administrador', description: 'Nombre del admin responsable', example: 'Admin Alpha', category: 'admin' },
  { key: 'previous_balance', label: 'Saldo previo del usuario', description: 'Saldo que tenía antes de la operación', example: 10000, category: 'cliente' },
  { key: 'new_balance', label: 'Nuevo saldo del usuario', description: 'Saldo final resultante tras la operación', example: 60000, category: 'cliente' },
  { key: 'reason', label: 'Motivo / Detalle', description: 'Concepto o razón registrada', example: 'Recarga rápida', category: 'operacion' },
  { key: 'operation_id', label: 'ID de la operación', description: 'ID único del registro en base de datos', example: 'op_98124', category: 'operacion' },
  { key: 'timestamp', label: 'Fecha y hora (ISO 8601)', description: 'Marca de tiempo en formato ISO UTC', example: '2026-10-01T20:00:00Z', category: 'tiempo' },
  { key: 'timestamp_ms', label: 'Timestamp Epoch en ms', description: 'Milisegundos Unix de la operación', example: 1790884800000, category: 'tiempo' },
];

export function WebhooksSectionContent() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [dynamicVars, setDynamicVars] = useState<DynamicVarMeta[]>(DEFAULT_DYNAMIC_VARS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Crear/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState<HttpMethod>('POST');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formApp, setFormApp] = useState<'all' | 'nequi' | 'bancolombia' | 'daviplata'>('all');
  const [formOperations, setFormOperations] = useState<WebhookOperations>({ ...DEFAULT_OPERATIONS });
  const [formHeaders, setFormHeaders] = useState<WebhookHeader[]>([]);
  const [formParameters, setFormParameters] = useState<WebhookParam[]>([
    { key: 'monto', value_type: 'dynamic', value: 'ganancia' },
    { key: 'telefono', value_type: 'dynamic', value: 'target_user' },
    { key: 'app', value_type: 'dynamic', value: 'app' },
    { key: 'operacion', value_type: 'dynamic', value: 'operation_label' },
  ]);
  const [saving, setSaving] = useState(false);

  // Modal de Prueba (Test)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testWebhookTarget, setTestWebhookTarget] = useState<WebhookItem | null>(null);
  const [testSimulatedCategory, setTestSimulatedCategory] = useState<string>('recargas');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Drawer / Modal de Logs
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeLogsWebhook, setActiveLogsWebhook] = useState<WebhookItem | null>(null);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Cargar lista de webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      if (!token) {
        setError('No hay sesión activa.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/admin/webhooks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${res.status} al consultar webhooks.`);
      }

      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar metadatos de variables dinámicas
  const fetchMeta = useCallback(async () => {
    try {
      const token = getAdminToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/admin/webhooks/meta/dynamic-variables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.variables && Array.isArray(data.variables)) {
          setDynamicVars(data.variables);
        }
      }
    } catch {
      // Ignorar, ya tenemos DEFAULT_DYNAMIC_VARS
    }
  }, []);

  useEffect(() => {
    void fetchWebhooks();
    void fetchMeta();
  }, [fetchWebhooks, fetchMeta]);

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormUrl('');
    setFormMethod('POST');
    setFormEnabled(true);
    setFormApp('all');
    setFormOperations({ ...DEFAULT_OPERATIONS });
    setFormHeaders([{ key: 'Content-Type', value: 'application/json' }]);
    setFormParameters([
      { key: 'monto', value_type: 'dynamic', value: 'ganancia' },
      { key: 'telefono', value_type: 'dynamic', value: 'target_user' },
      { key: 'app', value_type: 'dynamic', value: 'app' },
      {
        key: 'description',
        value_type: 'by_operation',
        value: '',
        operation_values: { ...DEFAULT_OP_TEXTS },
      },
    ]);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (wh: WebhookItem) => {
    setEditingId(wh.id);
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormMethod(wh.method || 'POST');
    setFormEnabled(wh.enabled);
    setFormApp(wh.app || 'all');
    setFormOperations({
      recargas: wh.operations?.recargas ?? true,
      vips: wh.operations?.vips ?? true,
      sms: wh.operations?.sms ?? true,
      paquetes: wh.operations?.paquetes ?? true,
      crear_usuario: wh.operations?.crear_usuario ?? true,
      otras: wh.operations?.otras ?? false,
    });
    setFormHeaders(wh.headers && wh.headers.length > 0 ? [...wh.headers] : []);
    setFormParameters(
      (wh.parameters || []).map((p) => ({
        key: p.key,
        value_type: (p.value_type || 'static') as any,
        value: p.value || '',
        operation_values: p.operation_values || { ...DEFAULT_OP_TEXTS },
      }))
    );
    setIsModalOpen(true);
  };

  // Guardar webhook (crear o actualizar)
  const handleSaveWebhook = async () => {
    if (!formName.trim()) {
      alert('Ingresa un nombre para el webhook.');
      return;
    }
    if (!formUrl.trim() || !formUrl.startsWith('http')) {
      alert('Ingresa una URL válida que comience con http:// o https://');
      return;
    }

    try {
      setSaving(true);
      const token = getAdminToken();
      if (!token) throw new Error('No hay sesión.');

      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        method: formMethod,
        enabled: formEnabled,
        app: formApp,
        operations: formOperations,
        headers: formHeaders.filter((h) => h.key.trim() !== ''),
        parameters: formParameters
          .filter((p) => p.key.trim() !== '')
          .map((p) => ({
            key: p.key.trim(),
            value_type: p.value_type,
            value: p.value,
            operation_values: p.operation_values || {},
          })),
      };

      const url = editingId
        ? `${API_BASE_URL}/admin/webhooks/${editingId}`
        : `${API_BASE_URL}/admin/webhooks`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error guardando webhook.');
      }

      setIsModalOpen(false);
      setSuccessMsg(editingId ? 'Webhook actualizado correctamente.' : 'Webhook creado exitosamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
      void fetchWebhooks();
    } catch (err: any) {
      alert(err.message || 'Error guardando webhook.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle rápido On/Off para el webhook completo
  const handleToggleWebhook = async (wh: WebhookItem, newEnabled: boolean) => {
    try {
      const token = getAdminToken();
      if (!token) return;

      // Optimistic update
      setWebhooks((prev) =>
        prev.map((item) => (item.id === wh.id ? { ...item, enabled: newEnabled } : item))
      );

      const res = await fetch(`${API_BASE_URL}/admin/webhooks/${wh.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      if (!res.ok) {
        void fetchWebhooks();
      }
    } catch {
      void fetchWebhooks();
    }
  };

  // Toggle rápido para una operación específica
  const handleToggleOperation = async (wh: WebhookItem, opKey: keyof WebhookOperations, newVal: boolean) => {
    try {
      const token = getAdminToken();
      if (!token) return;

      // Optimistic update
      setWebhooks((prev) =>
        prev.map((item) =>
          item.id === wh.id
            ? { ...item, operations: { ...item.operations, [opKey]: newVal } }
            : item
        )
      );

      const res = await fetch(`${API_BASE_URL}/admin/webhooks/${wh.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation_key: opKey,
          operation_value: newVal,
        }),
      });

      if (!res.ok) {
        void fetchWebhooks();
      }
    } catch {
      void fetchWebhooks();
    }
  };

  // Eliminar webhook
  const handleDeleteWebhook = async (wh: WebhookItem) => {
    if (!confirm(`¿Estás seguro de eliminar el webhook "${wh.name}"?`)) return;

    try {
      const token = getAdminToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/admin/webhooks/${wh.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setWebhooks((prev) => prev.filter((item) => item.id !== wh.id));
        setSuccessMsg('Webhook eliminado.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.detail || 'Error al eliminar');
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  // Abrir modal de prueba
  const handleOpenTest = (wh?: WebhookItem) => {
    setTestWebhookTarget(wh || null);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  // Ejecutar prueba en vivo
  const handleRunTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const token = getAdminToken();
      if (!token) throw new Error('No hay sesión.');

      const sample_context: Record<string, any> = {
        category: testSimulatedCategory,
      };
      if (testSimulatedCategory === 'vips') {
        sample_context.operation_type = 'UPGRADE_VIP';
        sample_context.operation_label = 'Actualización VIP';
        sample_context.monto_operacion = 25000;
        sample_context.ganancia = 12000;
      } else if (testSimulatedCategory === 'sms') {
        sample_context.operation_type = 'ADD_SMS';
        sample_context.operation_label = 'Créditos SMS';
        sample_context.monto_operacion = 15000;
        sample_context.ganancia = 8000;
      } else if (testSimulatedCategory === 'paquetes') {
        sample_context.operation_type = 'ASSIGN_PROMO';
        sample_context.operation_label = 'Paquetes y promociones';
        sample_context.monto_operacion = 30000;
        sample_context.ganancia = 15000;
      } else if (testSimulatedCategory === 'crear_usuario') {
        sample_context.operation_type = 'CREATE_USER';
        sample_context.operation_label = 'Creación de usuario';
        sample_context.monto_operacion = 50000;
        sample_context.ganancia = 20000;
      } else if (testSimulatedCategory === 'otras') {
        sample_context.operation_type = 'BLOQUEO_USUARIO';
        sample_context.operation_label = 'Bloqueo de usuario';
        sample_context.monto_operacion = 0;
        sample_context.ganancia = 0;
      } else {
        sample_context.operation_type = 'ADD_BALANCE';
        sample_context.operation_label = 'Recarga Nequi';
        sample_context.monto_operacion = 50000;
        sample_context.ganancia = 19500;
      }

      let body: any = {};
      if (testWebhookTarget) {
        body = {
          webhook_id: testWebhookTarget.id,
          sample_context,
        };
      } else {
        body = {
          url: formUrl,
          method: formMethod,
          headers: formHeaders.filter((h) => h.key.trim() !== ''),
          parameters: formParameters
            .filter((p) => p.key.trim() !== '')
            .map((p) => ({
              key: p.key.trim(),
              value_type: p.value_type,
              value: p.value,
              operation_values: p.operation_values || {},
            })),
          sample_context,
        };
      }

      const res = await fetch(`${API_BASE_URL}/admin/webhooks/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Error de conexión durante el test.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Abrir historial de logs
  const handleOpenLogs = async (wh: WebhookItem) => {
    setActiveLogsWebhook(wh);
    setLogs([]);
    setIsLogsModalOpen(true);
    setLoadingLogs(true);

    try {
      const token = getAdminToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/admin/webhooks/${wh.id}/logs?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      //
    } finally {
      setLoadingLogs(false);
    }
  };

  // Plantilla recomendada de parámetros
  const handleLoadPresetParams = () => {
    setFormParameters([
      { key: 'monto', value_type: 'dynamic', value: 'ganancia' },
      { key: 'saldo_recargado', value_type: 'dynamic', value: 'monto_operacion' },
      { key: 'telefono_cliente', value_type: 'dynamic', value: 'target_user' },
      { key: 'app', value_type: 'dynamic', value: 'app' },
      {
        key: 'description',
        value_type: 'by_operation',
        value: '',
        operation_values: { ...DEFAULT_OP_TEXTS },
      },
      { key: 'admin', value_type: 'dynamic', value: 'admin_email' },
      { key: 'id_operacion', value_type: 'dynamic', value: 'operation_id' },
      { key: 'fecha', value_type: 'dynamic', value: 'timestamp' },
    ]);
  };

  const activeWebhooksCount = webhooks.filter((w) => w.enabled).length;

  return (
    <div className="retro-webhooks">
      <p className="retro-webhooks__intro">
        Configura llamadas a tus propias APIs o servicios externos (bots de Telegram, CRM, sistemas contables, Discord, etc.)
        en cada operación que realices. Puedes personalizar headers, parámetros estáticos y <strong>valores dinámicos</strong> (como la <strong>ganancia</strong> neta generada, monto, usuario, app, etc.) y activar o desactivar llamadas por cada tipo de operación.
      </p>

      {error && (
        <RetroAlert variant="error" onClose={() => setError(null)}>
          {error}
        </RetroAlert>
      )}

      {successMsg && (
        <RetroAlert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </RetroAlert>
      )}

      {/* Toolbar superior */}
      <div className="retro-webhooks__toolbar">
        <div className="retro-webhooks__stats">
          <span className="retro-webhooks__stat-pill">
            <RetroIcon name="network/frame_web" size={16} alt="" />
            Total Webhooks: <strong>{webhooks.length}</strong>
          </span>
          <span className="retro-webhooks__stat-pill">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: activeWebhooksCount > 0 ? '#22c55e' : '#9ca3af',
                display: 'inline-block',
              }}
            />
            Activos: <strong>{activeWebhooksCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <RetroButton variant="secondary" onClick={() => void fetchWebhooks()} disabled={loading}>
            <RetroIcon name="navigation/history" size={14} alt="" />
            Refrescar
          </RetroButton>
          <RetroButton variant="primary" onClick={handleOpenCreate}>
            <RetroIcon name="files/file_set" size={14} alt="" />
            Nuevo Webhook
          </RetroButton>
        </div>
      </div>

      {/* Lista de Webhooks */}
      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: 'var(--retro-muted)' }}>
          Cargando configuración de webhooks...
        </div>
      ) : webhooks.length === 0 ? (
        <div className="retro-webhooks__card text-center p-8">
          <div className="flex justify-center mb-3">
            <RetroIcon name="network/conn_cloud" size={42} alt="" />
          </div>
          <h3 className="text-sm font-bold m-0 mb-1">No tienes webhooks configurados</h3>
          <p className="retro-api__muted mb-4">
            Crea tu primer webhook para recibir notificaciones HTTP instantáneas cada vez que realices recargas, VIPs, SMS o paquetes.
          </p>
          <div>
            <RetroButton variant="primary" onClick={handleOpenCreate}>
              <RetroIcon name="files/file_set" size={14} alt="" />
              Crear mi primer webhook
            </RetroButton>
          </div>
        </div>
      ) : (
        <div className="retro-webhooks__list">
          {webhooks.map((wh) => {
            const isAllOps =
              wh.operations?.recargas &&
              wh.operations?.vips &&
              wh.operations?.sms &&
              wh.operations?.paquetes &&
              wh.operations?.crear_usuario;

            return (
              <div
                key={wh.id}
                className={`retro-webhooks__card ${!wh.enabled ? 'retro-webhooks__card--disabled' : ''}`}
              >
                {/* Header de la tarjeta */}
                <div className="retro-webhooks__card-header">
                  <div className="retro-webhooks__card-title-group">
                    <span
                      className={`retro-webhooks__badge ${
                        wh.enabled ? 'retro-webhooks__badge--active' : 'retro-webhooks__badge--inactive'
                      }`}
                    >
                      {wh.enabled ? 'ACTIVO' : 'INACTIVO'}
                    </span>

                    <span
                      className={`retro-webhooks__badge retro-webhooks__badge--${wh.method?.toLowerCase() || 'post'}`}
                    >
                      {wh.method || 'POST'}
                    </span>

                    <span className="retro-webhooks__badge retro-webhooks__badge--app">
                      APP:{' '}
                      {wh.app === 'all'
                        ? 'Todas'
                        : wh.app === 'nequi'
                        ? 'Nequi'
                        : wh.app === 'bancolombia'
                        ? 'Bancolombia'
                        : 'Daviplata'}
                    </span>

                    <h4 className="retro-webhooks__card-title">{wh.name}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                      <span>Switch Global:</span>
                      <input
                        type="checkbox"
                        checked={wh.enabled}
                        onChange={(e) => handleToggleWebhook(wh, e.target.checked)}
                        className="cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* URL del webhook */}
                <div className="retro-webhooks__url-row">
                  <span className="text-[#888] select-none">URL:</span>
                  <span className="flex-1 font-mono">{wh.url}</span>
                  <button
                    type="button"
                    className="retro-btn text-[10px] py-0 px-1.5"
                    onClick={() => {
                      copyTextToClipboard(wh.url);
                      alert('URL copiada al portapapeles');
                    }}
                    title="Copiar URL"
                  >
                    Copiar
                  </button>
                </div>

                {/* Switches On/Off por tipo de operación */}
                <div className="retro-webhooks__ops-section">
                  <div className="flex items-center justify-between">
                    <span className="retro-webhooks__ops-label">
                      Operaciones Habilitadas (On / Off por operación):
                    </span>
                    {isAllOps && (
                      <span className="text-[10px] text-green-700 font-bold">
                        (Todas las operaciones activas)
                      </span>
                    )}
                  </div>

                  <div className="retro-webhooks__ops-grid">
                    {[
                      { key: 'recargas' as const, label: 'Recargas' },
                      { key: 'vips' as const, label: 'VIPs' },
                      { key: 'sms' as const, label: 'SMS' },
                      { key: 'paquetes' as const, label: 'Paquetes' },
                      { key: 'crear_usuario' as const, label: 'Crear Usuario' },
                      { key: 'otras' as const, label: 'Otras' },
                    ].map((op) => {
                      const isActive = Boolean(wh.operations?.[op.key]);
                      return (
                        <div
                          key={op.key}
                          onClick={() => handleToggleOperation(wh, op.key, !isActive)}
                          className={`retro-webhooks__op-chip ${
                            isActive
                              ? 'retro-webhooks__op-chip--active'
                              : 'retro-webhooks__op-chip--inactive'
                          }`}
                          title={`Clic para ${isActive ? 'desactivar' : 'activar'} en ${op.label}`}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {}} // controlado por onClick del chip
                            className="cursor-pointer pointer-events-none"
                          />
                          <span>{op.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Parámetros configurados con valores dinámicos */}
                <div className="retro-webhooks__card-details">
                  <div className="retro-webhooks__detail-block">
                    <span className="retro-webhooks__detail-title">
                      Parámetros configurados ({wh.parameters?.length || 0}):
                    </span>
                    <div className="retro-webhooks__pills-wrap">
                      {wh.parameters && wh.parameters.length > 0 ? (
                        wh.parameters.map((p, idx) => (
                          <span
                            key={idx}
                            className={`retro-webhooks__param-pill ${
                              p.value_type === 'dynamic'
                                ? 'retro-webhooks__param-pill--dynamic'
                                : p.value_type === 'by_operation'
                                ? 'retro-webhooks__param-pill--by-op'
                                : ''
                            }`}
                            title={
                              p.value_type === 'dynamic'
                                ? `Parámetro dinámico asignado a variable "${p.value}"`
                                : p.value_type === 'by_operation'
                                ? 'Parámetro con texto personalizado según la operación (Recargas, VIP, SMS, etc.)'
                                : `Parámetro con valor fijo "${p.value}"`
                            }
                          >
                            <strong>{p.key}</strong>
                            <span className="text-[#666]">
                              : {p.value_type === 'dynamic'
                                  ? `{${p.value}}`
                                  : p.value_type === 'by_operation'
                                  ? '{por operación}'
                                  : `"${p.value}"`}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#777] italic">Sin parámetros adicionales</span>
                      )}
                    </div>
                  </div>

                  <div className="retro-webhooks__detail-block">
                    <span className="retro-webhooks__detail-title">
                      Headers personalizados ({wh.headers?.length || 0}):
                    </span>
                    <div className="retro-webhooks__pills-wrap">
                      {wh.headers && wh.headers.length > 0 ? (
                        wh.headers.map((h, idx) => (
                          <span key={idx} className="retro-webhooks__param-pill">
                            <strong>{h.key}</strong>
                            <span className="text-[#666]">: {h.value ? '••••' : ''}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#777] italic">Headers por defecto</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer de la tarjeta con status del último disparo y botones de acción */}
                <div className="retro-webhooks__card-footer">
                  <div className="retro-webhooks__card-status">
                    {wh.last_trigger_at ? (
                      <>
                        <span>Último envío:</span>
                        <strong>{new Date(wh.last_trigger_at).toLocaleTimeString()}</strong>
                        {wh.last_status_code != null && (
                          <span
                            className={`retro-webhooks__badge ${
                              wh.last_status_code >= 200 && wh.last_status_code < 300
                                ? 'retro-webhooks__badge--post'
                                : 'retro-webhooks__badge--inactive'
                            }`}
                          >
                            HTTP {wh.last_status_code}
                          </span>
                        )}
                        {wh.last_latency_ms != null && (
                          <span className="text-[10px]">({wh.last_latency_ms} ms)</span>
                        )}
                        {wh.last_error && (
                          <span className="text-red-700 font-bold" title={wh.last_error}>
                            ⚠️ Error
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] italic">Aún no se ha disparado ninguna operación</span>
                    )}
                  </div>

                  <div className="retro-webhooks__card-actions">
                    <RetroButton variant="secondary" onClick={() => handleOpenTest(wh)}>
                      <RetroIcon name="system/gears" size={14} alt="" />
                      Probar
                    </RetroButton>
                    <RetroButton variant="secondary" onClick={() => void handleOpenLogs(wh)}>
                      <RetroIcon name="office/appwizard_list" size={14} alt="" />
                      Historial
                    </RetroButton>
                    <RetroButton variant="secondary" onClick={() => handleOpenEdit(wh)}>
                      <RetroIcon name="files/file_set" size={14} alt="" />
                      Editar
                    </RetroButton>
                    <RetroButton variant="danger" onClick={() => void handleDeleteWebhook(wh)}>
                      <RetroIcon name="files/recycle_bin_empty" size={14} alt="" />
                      Eliminar
                    </RetroButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREAR / EDITAR WEBHOOK                                              */}
      {/* ========================================================================= */}
      <RetroModal
        open={isModalOpen}
        title={editingId ? 'Editar Webhook' : 'Nuevo Webhook'}
        icon="network/frame_web"
        onClose={() => setIsModalOpen(false)}
        maxWidth="760px"
        footer={
          <div className="flex items-center justify-between w-full">
            <RetroButton
              variant="secondary"
              onClick={() => {
                handleOpenTest();
              }}
              disabled={!formUrl.trim()}
            >
              <RetroIcon name="system/gears" size={14} alt="" />
              Probar llamada ahora
            </RetroButton>

            <div className="flex items-center gap-2">
              <RetroButton variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancelar
              </RetroButton>
              <RetroButton variant="primary" onClick={handleSaveWebhook} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar Webhook' : 'Crear Webhook'}
              </RetroButton>
            </div>
          </div>
        }
      >
        <div className="retro-webhooks-form">
          {/* Datos básicos */}
          <div className="retro-webhooks-form__section">
            <h5 className="retro-webhooks-form__section-title">
              <RetroIcon name="network/frame_web" size={16} alt="" />
              1. Destino del Webhook
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold mb-1">Nombre Descriptivo:</label>
                <input
                  type="text"
                  className="retro-input w-full"
                  placeholder="Ej: Notificar a mi bot de Telegram / CRM"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">Método HTTP:</label>
                <select
                  className="retro-input w-full"
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as HttpMethod)}
                >
                  <option value="POST">POST (Recomendado - JSON)</option>
                  <option value="GET">GET (Query String)</option>
                  <option value="PUT">PUT (JSON)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">URL del Endpoint API:</label>
              <input
                type="text"
                className="retro-input w-full font-mono text-[12px]"
                placeholder="https://api.tu-servidor.com/webhook/ventas"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
              <span className="text-[10px] text-[#666]">
                Alpha Admin enviará una petición {formMethod} hacia esta dirección URL en cada operación.
              </span>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-[12px] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                />
                <span>Habilitar webhook globalmente (On/Off)</span>
              </label>
            </div>
          </div>

          {/* Categorización por App y Operación */}
          <div className="retro-webhooks-form__section">
            <h5 className="retro-webhooks-form__section-title">
              <RetroIcon name="navigation/program_manager" size={16} alt="" />
              2. Categorización por Aplicación y Operaciones (Switches On / Off)
            </h5>

            <div className="mb-2">
              <label className="block text-[11px] font-bold mb-1">Filtrar por Aplicación Bancaria:</label>
              <select
                className="retro-input w-full max-w-xs"
                value={formApp}
                onChange={(e) => setFormApp(e.target.value as any)}
              >
                <option value="all">Todas las aplicaciones (Nequi, Bancolombia, Daviplata)</option>
                <option value="nequi">Solo Nequi</option>
                <option value="bancolombia">Solo Bancolombia</option>
                <option value="daviplata">Solo Daviplata</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1.5">
                Activar o desactivar llamadas según la operación realizada:
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  {
                    key: 'recargas' as const,
                    label: 'Recargas de Saldo',
                    desc: 'Recargas rápidas y add-balance',
                  },
                  {
                    key: 'vips' as const,
                    label: 'Actualizaciones VIP',
                    desc: 'Subida de cuentas a VIP',
                  },
                  {
                    key: 'sms' as const,
                    label: 'Créditos SMS',
                    desc: 'Ventas de créditos SMS',
                  },
                  {
                    key: 'paquetes' as const,
                    label: 'Paquetes / Promos',
                    desc: 'Paquetes de promociones',
                  },
                  {
                    key: 'crear_usuario' as const,
                    label: 'Creación de Usuario',
                    desc: 'Nuevos usuarios creados',
                  },
                  {
                    key: 'otras' as const,
                    label: 'Otras Operaciones',
                    desc: 'Bloqueos, ajustes, etc.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-2 p-2 border border-gray-300 bg-white cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={formOperations[item.key]}
                      onChange={(e) =>
                        setFormOperations((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-[11px] font-bold leading-tight">{item.label}</div>
                      <div className="text-[9px] text-[#666] leading-tight mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Parámetros Dinámicos y Estáticos */}
          <div className="retro-webhooks-form__section">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="retro-webhooks-form__section-title">
                <RetroIcon name="system/gears" size={16} alt="" />
                3. Parámetros del Payload (Valores Dinámicos y Estáticos)
              </h5>

              <RetroButton variant="secondary" onClick={handleLoadPresetParams}>
                <RetroIcon name="files/file_set" size={12} alt="" />
                Cargar plantilla recomendada
              </RetroButton>
            </div>

            <p className="text-[11px] text-[#555] m-0 mb-2">
              Configura las claves que recibirá tu API. Puedes elegir entre un <strong>Valor Dinámico</strong> (variables como ganancia o monto), un <strong>Texto Fijo</strong>, o <strong>Personalizado por Operación</strong> (para definir un texto específico según si es recarga, VIP, SMS, etc.).
            </p>

            <table className="retro-webhooks-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Nombre Parámetro</th>
                  <th style={{ width: '28%' }}>Tipo de Valor</th>
                  <th>Valor / Variable Asignada</th>
                  <th style={{ width: '36px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {formParameters.map((p, idx) => (
                  <Fragment key={idx}>
                    <tr>
                      <td>
                        <input
                          type="text"
                          className="retro-input w-full font-mono text-[11px]"
                          placeholder="Ej: description, monto, id"
                          value={p.key}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormParameters((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, key: val } : item))
                            );
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="retro-input w-full text-[11px]"
                          value={p.value_type}
                          onChange={(e) => {
                            const newType = e.target.value as 'static' | 'dynamic' | 'by_operation';
                            setFormParameters((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      value_type: newType,
                                      value: newType === 'dynamic' ? 'ganancia' : '',
                                      operation_values: item.operation_values || { ...DEFAULT_OP_TEXTS },
                                    }
                                  : item
                              )
                            );
                          }}
                        >
                          <option value="dynamic">⚡ Valor Dinámico</option>
                          <option value="static">🔤 Texto Fijo</option>
                          <option value="by_operation">🎯 Personalizado por Operación</option>
                        </select>
                      </td>
                      <td>
                        {p.value_type === 'dynamic' ? (
                          <select
                            className="retro-input w-full text-[11px] font-semibold text-blue-900"
                            value={p.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormParameters((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                              );
                            }}
                          >
                            {dynamicVars.map((v) => (
                              <option key={v.key} value={v.key}>
                                {v.label} (ej: {String(v.example)})
                              </option>
                            ))}
                          </select>
                        ) : p.value_type === 'by_operation' ? (
                          <div className="text-[11px] text-[#581c87] font-semibold flex items-center gap-1 py-1">
                            <span>🎯 Textos configurados por cada operación abajo ↓</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="retro-input w-full text-[11px]"
                            placeholder="Texto fijo (ej: ingreso, token_123, etc.)"
                            value={p.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormParameters((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                              );
                            }}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="retro-btn text-[11px] py-0 px-1.5 text-red-700"
                          onClick={() =>
                            setFormParameters((prev) => prev.filter((_, i) => i !== idx))
                          }
                          title="Eliminar parámetro"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>

                    {p.value_type === 'by_operation' && (
                      <tr>
                        <td colSpan={4} className="p-0 border-0">
                          <div className="retro-webhooks__by-op-box mb-2">
                            <div className="retro-webhooks__by-op-title">
                              <span>
                                🎯 Texto personalizado para <strong>"{p.key || 'este parámetro'}"</strong> según la operación:
                              </span>
                              <span className="text-[9px] text-[#555] font-normal">
                                (Escribe lo que quieras o usa etiquetas como <code>&#123;target_user&#125;</code>, <code>&#123;monto_operacion&#125;</code>, <code>&#123;ganancia&#125;</code>)
                              </span>
                            </div>

                            <div className="retro-webhooks__by-op-grid">
                              {[
                                { key: 'recargas', label: '💳 Recargas de Saldo', defaultText: 'Recarga de saldo' },
                                { key: 'vips', label: '⭐ Actualizaciones VIP', defaultText: 'Actualización VIP' },
                                { key: 'sms', label: '💬 Créditos SMS', defaultText: 'Créditos SMS' },
                                { key: 'paquetes', label: '📦 Paquetes / Promos', defaultText: 'Paquetes y promociones' },
                                { key: 'crear_usuario', label: '👤 Creación de Usuario', defaultText: 'Creación de usuario' },
                                { key: 'otras', label: '⚙️ Otras Operaciones', defaultText: 'Operación administrativa' },
                              ].map((op) => {
                                const currentVal = p.operation_values?.[op.key] ?? op.defaultText;
                                return (
                                  <div key={op.key} className="retro-webhooks__by-op-item">
                                    <label className="retro-webhooks__by-op-label">{op.label}:</label>
                                    <input
                                      type="text"
                                      className="retro-input w-full text-[11px]"
                                      placeholder={op.defaultText}
                                      value={currentVal}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        setFormParameters((prev) =>
                                          prev.map((item, i) =>
                                            i === idx
                                              ? {
                                                  ...item,
                                                  operation_values: {
                                                    ...(item.operation_values || {}),
                                                    [op.key]: newVal,
                                                  },
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            <div className="pt-1">
              <RetroButton
                variant="secondary"
                onClick={() =>
                  setFormParameters((prev) => [
                    ...prev,
                    { key: '', value_type: 'dynamic', value: 'ganancia' },
                  ])
                }
              >
                + Agregar Parámetro
              </RetroButton>
            </div>
          </div>

          {/* Headers Personalizados */}
          <div className="retro-webhooks-form__section">
            <h5 className="retro-webhooks-form__section-title">
              <RetroIcon name="security/key_world" size={16} alt="" />
              4. Headers HTTP Personalizados (Opcional)
            </h5>

            <table className="retro-webhooks-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Header (Clave)</th>
                  <th>Valor</th>
                  <th style={{ width: '36px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {formHeaders.map((h, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="retro-input w-full font-mono text-[11px]"
                        placeholder="Ej: Authorization, X-Api-Key"
                        value={h.key}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormHeaders((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, key: val } : item))
                          );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="retro-input w-full font-mono text-[11px]"
                        placeholder="Ej: Bearer mi_secreto_123"
                        value={h.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormHeaders((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                          );
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="retro-btn text-[11px] py-0 px-1.5 text-red-700"
                        onClick={() => setFormHeaders((prev) => prev.filter((_, i) => i !== idx))}
                        title="Eliminar header"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-1 flex items-center gap-2">
              <RetroButton
                variant="secondary"
                onClick={() =>
                  setFormHeaders((prev) => [...prev, { key: '', value: '' }])
                }
              >
                + Agregar Header
              </RetroButton>

              <button
                type="button"
                className="retro-btn text-[11px]"
                onClick={() =>
                  setFormHeaders((prev) => [
                    ...prev,
                    { key: 'Authorization', value: 'Bearer ' },
                  ])
                }
              >
                + Preset Bearer Token
              </button>
            </div>
          </div>
        </div>
      </RetroModal>

      {/* ========================================================================= */}
      {/* MODAL DE PRUEBA EN VIVO                                                   */}
      {/* ========================================================================= */}
      <RetroModal
        open={isTestModalOpen}
        title={`Probar Webhook en Vivo: ${testWebhookTarget ? testWebhookTarget.name : formName || 'Prueba'}`}
        icon="system/gears"
        onClose={() => setIsTestModalOpen(false)}
        maxWidth="680px"
        footer={
          <div className="flex items-center justify-between w-full">
            <RetroButton variant="secondary" onClick={() => setIsTestModalOpen(false)}>
              Cerrar
            </RetroButton>
            <RetroButton variant="primary" onClick={handleRunTest} disabled={testing}>
              {testing ? 'Enviando petición...' : 'Ejecutar Prueba Ahora'}
            </RetroButton>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="retro-webhooks__intro">
            Se enviará una llamada HTTP real hacia la URL configurada con valores simulados de una operación (ej. ganancia: $19.500, monto: $50.000, target_user: 3001234567, etc.) para comprobar que tu servidor responda correctamente.
          </p>

          <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-400 bg-[#f8f9fa] text-[11px]">
            <span className="font-bold">Simular Operación:</span>
            <select
              className="retro-input text-[11px] font-semibold"
              value={testSimulatedCategory}
              onChange={(e) => setTestSimulatedCategory(e.target.value)}
            >
              <option value="recargas">💳 Recargas de Saldo (recargas)</option>
              <option value="vips">⭐ Actualización VIP (vips)</option>
              <option value="sms">💬 Créditos SMS (sms)</option>
              <option value="paquetes">📦 Paquetes / Promos (paquetes)</option>
              <option value="crear_usuario">👤 Creación de Usuario (crear_usuario)</option>
              <option value="otras">⚙️ Otras Operaciones (otras)</option>
            </select>
            <span className="text-[10px] text-[#666]">
              (Permite probar cómo se resuelve el texto personalizado de esa operación)
            </span>
          </div>

          <div className="p-2 border border-gray-400 bg-white">
            <div className="text-[11px] font-bold mb-1">Petición a enviar:</div>
            <div className="font-mono text-[11px] text-gray-800">
              <strong>{testWebhookTarget ? testWebhookTarget.method : formMethod}</strong>{' '}
              {testWebhookTarget ? testWebhookTarget.url : formUrl || '(URL no definida)'}
            </div>
          </div>

          {testing && (
            <div className="p-4 text-center text-sm font-bold animate-pulse text-blue-900">
              Conectando con la API externa...
            </div>
          )}

          {testResult && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2 border border-gray-400 bg-gray-100">
                <div className="flex items-center gap-2">
                  <span>Resultado:</span>
                  {testResult.status_code ? (
                    <span
                      className={`retro-webhooks__badge ${
                        testResult.status_code >= 200 && testResult.status_code < 300
                          ? 'retro-webhooks__badge--post'
                          : 'retro-webhooks__badge--inactive'
                      }`}
                    >
                      HTTP {testResult.status_code}
                    </span>
                  ) : (
                    <span className="retro-webhooks__badge retro-webhooks__badge--inactive">
                      FALLO DE CONEXIÓN
                    </span>
                  )}
                </div>

                {testResult.latency_ms != null && (
                  <span className="text-[11px] font-mono">
                    Latencia: <strong>{testResult.latency_ms} ms</strong>
                  </span>
                )}
              </div>

              {testResult.error && (
                <div className="p-2 bg-red-100 border border-red-500 text-red-900 text-[11px] font-mono">
                  <strong>Error detectado:</strong> {testResult.error}
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold">Payload enviado (valores dinámicos resueltos):</span>
                <pre className="retro-webhooks-codebox">
                  {JSON.stringify(testResult.sent_payload, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-[11px] font-bold">Respuesta del Servidor Externo:</span>
                <pre className="retro-webhooks-codebox">
                  {testResult.response_body || '(Cuerpo de respuesta vacío)'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </RetroModal>

      {/* ========================================================================= */}
      {/* MODAL DE HISTORIAL DE LOGS                                                */}
      {/* ========================================================================= */}
      <RetroModal
        open={isLogsModalOpen}
        title={`Historial de Disparos: ${activeLogsWebhook?.name || ''}`}
        icon="office/appwizard_list"
        onClose={() => setIsLogsModalOpen(false)}
        maxWidth="750px"
        footer={
          <div className="flex items-center justify-between w-full">
            <RetroButton
              variant="secondary"
              onClick={() => {
                if (activeLogsWebhook) void handleOpenLogs(activeLogsWebhook);
              }}
              disabled={loadingLogs}
            >
              Actualizar Logs
            </RetroButton>
            <RetroButton variant="primary" onClick={() => setIsLogsModalOpen(false)}>
              Cerrar
            </RetroButton>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="retro-webhooks__intro">
            Registro de las llamadas recientes disparadas por este webhook cuando se ejecutaron operaciones en el sistema.
          </p>

          {loadingLogs ? (
            <div className="p-6 text-center text-sm">Consultando registros de ejecución...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-sm border border-gray-400 bg-white">
              No hay ejecuciones registradas todavía para este webhook.
            </div>
          ) : (
            <div className="retro-webhooks__logs-list">
              {logs.map((log) => (
                <div key={log.id} className="retro-webhooks__log-item">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`retro-webhooks__badge ${
                          log.status_code && log.status_code >= 200 && log.status_code < 300
                            ? 'retro-webhooks__badge--post'
                            : 'retro-webhooks__badge--inactive'
                        }`}
                      >
                        {log.status_code ? `HTTP ${log.status_code}` : 'ERROR'}
                      </span>
                      <span className="font-bold text-[11px]">
                        {log.category?.toUpperCase()} ({log.app})
                      </span>
                      {log.target_user && (
                        <span className="text-[10px] text-gray-700">Usuario: {log.target_user}</span>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-600">
                      {new Date(log.timestamp).toLocaleString()} ({log.latency_ms} ms)
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="text-[11px] text-red-700 font-mono">
                      Error: {log.error_message}
                    </div>
                  )}

                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-blue-800 font-semibold select-none">
                      Ver Payload enviado y respuesta
                    </summary>
                    <div className="mt-1 flex flex-col gap-1.5">
                      <div>
                        <span className="text-[10px] font-bold text-gray-600">Enviado:</span>
                        <pre className="retro-webhooks-codebox text-[10px]">
                          {JSON.stringify(log.request_payload, null, 2)}
                        </pre>
                      </div>
                      {log.response_body && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-600">Respuesta:</span>
                          <pre className="retro-webhooks-codebox text-[10px]">
                            {log.response_body}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </RetroModal>
    </div>
  );
}
