'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/constants';
import { RetroInteractiveTable, RetroLoadingOverlay, type RetroTableColumn } from '../../../components/retro';
import { RetroManagerConfirmModal, RetroManagerProgressModal } from '../../../components/retro/admin';

interface TarifaData {
  definicion: string;
  valor: string;
  valorClienteFinal?: string;
  ganancia?: string;
}

const FALLBACK_TARIFAS: TarifaData[] = [];

export function TarifasSectionContent() {
  const [tarifas, setTarifas] = useState<TarifaData[]>([]);
  const [porcentaje, setPorcentaje] = useState<number | null>(null);
  const [tarifasLoading, setTarifasLoading] = useState(true);
  const [simuladorValor, setSimuladorValor] = useState('');
  const [simulando, setSimulando] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [resultadoSimulacion, setResultadoSimulacion] = useState<{
    valorAdmin: string;
    valorCliente: string;
    ganancia: string;
    tipoRecarga: string;
  } | null>(null);
  const router = useRouter();

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  useEffect(() => {
    const loadTarifas = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          router.push('/');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/admin/tarifas`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const tarifasFormateadas = data.tarifas.map((tarifa: TarifaData) => ({
            definicion: tarifa.definicion,
            valor: tarifa.valor,
            valorClienteFinal: tarifa.valorClienteFinal,
            ganancia: tarifa.ganancia,
          }));
          setTarifas(tarifasFormateadas);
          setPorcentaje(typeof data.porcentaje === 'number' ? data.porcentaje : null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error obteniendo tarifas del backend', errorData.detail);
          setTarifas(FALLBACK_TARIFAS);
        }
      } catch (error) {
        console.error('Error cargando tarifas:', error);
        setTarifas(FALLBACK_TARIFAS);
      } finally {
        setTarifasLoading(false);
      }
    };

    void loadTarifas();
  }, [router]);

  const simularRecarga = async () => {
    const valor = parseFloat(simuladorValor.replace(/\./g, '').replace(/\$/g, ''));
    if (isNaN(valor) || valor <= 0) {
      showError('Por favor ingrese un valor válido');
      return;
    }

    if (valor > 10000000) {
      showError('Límite máximo de recarga para simulación: $10.000.000');
      return;
    }

    setSimulando(true);
    setResultadoSimulacion(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        showError('Sesión expirada. Por favor inicie sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/simular-recarga`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monto: valor }),
      });

      if (response.ok) {
        const resultado = await response.json();
        setResultadoSimulacion({
          valorAdmin: resultado.valor_admin_str,
          valorCliente: resultado.valor_cliente_str,
          ganancia: resultado.ganancia_str,
          tipoRecarga: resultado.descripcion,
        });
      } else {
        const errorData = await response.json();
        showError(`Error en la simulación: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error en simulación:', error);
      showError('Error de conexión. No se pudo realizar la simulación.');
    } finally {
      setSimulando(false);
    }
  };

  const columns = useMemo<RetroTableColumn<TarifaData>[]>(
    () => [
      {
        key: 'definicion',
        header: 'Definición',
        cellClassName: 'retro-tableview-cell--wrap',
        render: (tarifa) => <span className="retro-tarifas__cell-strong">{tarifa.definicion}</span>,
      },
      {
        key: 'valor',
        header: 'Valor',
        render: (tarifa) => tarifa.valor,
      },
      {
        key: 'valorClienteFinal',
        header: 'Valor cliente final',
        render: (tarifa) => tarifa.valorClienteFinal || tarifa.valor,
      },
      {
        key: 'ganancia',
        header: 'Ganancia',
        render: (tarifa) => (
          <span className="retro-tarifas__cell-gain">{tarifa.ganancia || 'N/A'}</span>
        ),
      },
    ],
    [],
  );

  if (tarifasLoading) {
    return <RetroLoadingOverlay message="Cargando tarifas..." />;
  }

  return (
    <>
      <div className="retro-tarifas">
        <p className="retro-tarifas__intro">
          {porcentaje != null
            ? `Tarifas calculadas con tu porcentaje de costo (${porcentaje}%). Valor = lo que pagas; ganancia = margen sobre el cliente.`
            : 'Pagos que no estén definidos en la tabla usarán el algoritmo de cálculo de saldo automático.'}
        </p>

        <RetroInteractiveTable
          columns={columns}
          rows={tarifas}
          getRowKey={(tarifa) => tarifa.definicion}
          emptyMessage="No hay tarifas disponibles."
        />

        <fieldset className="retro-tarifas__simulator">
          <legend>Simulador de recarga</legend>

          <div className="retro-tarifas__simulator-row">
            <div className="retro-tarifas__simulator-field">
              <label htmlFor="simuladorValor">Valor de recarga ($)</label>
              <input
                type="text"
                id="simuladorValor"
                value={simuladorValor}
                disabled={simulando}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 12) {
                    setSimuladorValor(value ? `$${parseInt(value, 10).toLocaleString('es-CO')}` : '');
                  }
                }}
                className="retro-manager-modal__input"
                placeholder="Ej: $5.000.000"
              />
            </div>

            <button
              type="button"
              onClick={simularRecarga}
              disabled={simulando || !simuladorValor.trim()}
              className="retro-manager-btn retro-manager-btn--primary"
            >
              Simular valor
            </button>
          </div>

          {resultadoSimulacion && (
            <div className="retro-tarifas__result">
              <h4 className="retro-tarifas__result-title">Resultado de la simulación</h4>
              <div className="retro-tarifas__result-grid">
                <div>
                  <span className="retro-tarifas__result-item-label">Tipo de recarga</span>
                  <span className="retro-tarifas__result-item-value">{resultadoSimulacion.tipoRecarga}</span>
                </div>
                <div>
                  <span className="retro-tarifas__result-item-label">Valor administrador</span>
                  <span className="retro-tarifas__result-item-value retro-tarifas__result-item-value--admin">
                    {resultadoSimulacion.valorAdmin}
                  </span>
                </div>
                <div>
                  <span className="retro-tarifas__result-item-label">Valor cliente final</span>
                  <span className="retro-tarifas__result-item-value retro-tarifas__result-item-value--client">
                    {resultadoSimulacion.valorCliente}
                  </span>
                </div>
                <div>
                  <span className="retro-tarifas__result-item-label">Ganancia</span>
                  <span className="retro-tarifas__result-item-value retro-tarifas__result-item-value--gain">
                    {resultadoSimulacion.ganancia}
                  </span>
                </div>
              </div>
            </div>
          )}
        </fieldset>
      </div>

      <RetroManagerConfirmModal
        open={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        zIndex={120}
      />

      <RetroManagerProgressModal open={simulando} message="Simulando recarga..." zIndex={130} />
    </>
  );
}
