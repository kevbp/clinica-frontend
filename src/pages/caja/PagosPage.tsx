import { useState, useEffect } from 'react';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  Tabs, Alert, Spin, Typography, Tag, Button, App,
  Table, Drawer, Form, InputNumber, Empty, Divider, Radio, Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined, EditOutlined, InfoCircleOutlined,
  CreditCardOutlined, WalletOutlined, ArrowRightOutlined, GiftOutlined,
  MedicineBoxOutlined, ExperimentOutlined, ShoppingCartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQueries } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import { useListaCitas } from '../../hooks/useCitas';
import { useEspecialidades, useMedicos } from '../../hooks/usePersonal';
import { useConsultorios } from '../../hooks/useHorarios';
import PasarelaPagoModal from '../../components/caja/PasarelaPagoModal';
import PasarelaProformaModal from '../../components/caja/PasarelaProformaModal';
import {
  useDisponibilidadCaja,
  usePagoPorCita,
  useCrearPagoConsulta,
  useTarifas,
  useGuardarTarifa,
  useNotasCredito,
  useProformasPorPaciente,
} from '../../hooks/useCaja';
import { useQueryClient } from '@tanstack/react-query';
import * as cajaApi from '../../api/caja';
import * as farmaciaApi from '../../api/farmacia';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { CitaMedicaResponseDTO } from '../../types/citas';
import type { EstadoPagoConsulta, NotaCreditoResponseDTO, ProformaResponseDTO } from '../../types/caja';

const ESTADO_PAGO_TAG: Record<EstadoPagoConsulta, { color: string; label: string }> = {
  PENDIENTE: { color: 'gold', label: 'Pendiente' },
  PAGADO: { color: 'green', label: 'Pagado' },
  PAGADO_SIN_CONFIRMAR: { color: 'red', label: 'Pagado sin confirmar' },
};

type Seleccion =
  | { tipo: 'cita'; item: CitaMedicaResponseDTO }
  | { tipo: 'proforma'; item: ProformaResponseDTO }
  | null;

type MetodoPago = 'efectivo' | 'tarjeta';

export default function PagosPage() {
  const { isError: isServiceDown, error: serviceError } = useDisponibilidadCaja();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PageHeader title="Pagos" />

      {isServiceDown && (
        <Alert
          type="error"
          showIcon
          message="ms-caja no disponible"
          description={serviceErrorMessage(serviceError, 'ms-caja', 8088)}
        />
      )}

      <Tabs
        items={[
          { key: 'pendientes', label: 'Pagos pendientes', children: <PagosPendientesTab /> },
          { key: 'tarifas', label: 'Tarifas de consulta', children: <TarifasTab /> },
        ]}
      />
    </div>
  );
}

// ── Tab principal: Pagos pendientes ─────────────────────────────────────────

function PagosPendientesTab() {
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const { data: medicos = [] } = useMedicos();

  const { data: citasPendientes = [], isLoading: cargandoCitas } = useListaCitas({
    idPaciente: pacienteSeleccionado?.id,
    estado: 'PENDIENTE_PAGO',
  });

  const { data: proformas = [], isLoading: cargandoProformas } = useProformasPorPaciente(
    pacienteSeleccionado?.id ?? null
  );

  const proformasPendientes = proformas.filter(
    p => p.estadoProforma === 'VIGENTE' && p.items.some(i => i.estado === 'PENDIENTE')
  );

  const nombreMedico = (idPersonal: number) => {
    const m = medicos.find(med => med.idPersonal === idPersonal);
    return m ? `${m.nombres} ${m.apellidos}` : `Médico #${idPersonal}`;
  };

  const especialidadMedico = (idPersonal: number) => {
    const m = medicos.find(med => med.idPersonal === idPersonal);
    return m?.especialidad.nombre ?? undefined;
  };

  const handleSeleccionarPaciente = (p: PacienteResponseDTO | null) => {
    setPacienteSeleccionado(p);
    setSeleccion(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BuscadorPaciente
        pacienteSeleccionado={pacienteSeleccionado}
        onSeleccionar={handleSeleccionarPaciente}
      />

      <div style={{ display: 'flex', gap: 12, minHeight: 400, alignItems: 'stretch' }}>
        {/* ── Panel izquierdo ─── */}
        <div style={{
          width: 340, flexShrink: 0,
          background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#f8f9fa' }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Cobros pendientes</Typography.Text>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {!pacienteSeleccionado ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description={<span style={{ fontSize: 12, color: '#888' }}>Busque un paciente para ver sus pagos pendientes</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (cargandoCitas || cargandoProformas) ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spin /></div>
            ) : citasPendientes.length === 0 && proformasPendientes.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description={<span style={{ fontSize: 12, color: '#888' }}>No hay cobros pendientes</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Sección citas */}
                {citasPendientes.length > 0 && (
                  <>
                    <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 }}>
                      Consultas
                    </Typography.Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {citasPendientes.map(cita => (
                        <CitaListItem
                          key={cita.id}
                          cita={cita}
                          nombreMedico={nombreMedico(cita.idPersonal)}
                          especialidad={especialidadMedico(cita.idPersonal)}
                          seleccionada={seleccion?.tipo === 'cita' && seleccion.item.id === cita.id}
                          onClick={() => setSeleccion({ tipo: 'cita', item: cita })}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Sección proformas */}
                {proformasPendientes.length > 0 && (
                  <>
                    {citasPendientes.length > 0 && <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />}
                    <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 }}>
                      Proformas
                    </Typography.Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {proformasPendientes.map(p => (
                        <ProformaListItem
                          key={p.id}
                          proforma={p}
                          seleccionada={seleccion?.tipo === 'proforma' && seleccion.item.id === p.id}
                          onClick={() => setSeleccion({ tipo: 'proforma', item: p })}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho ─── */}
        <div style={{
          flex: 1,
          background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {!seleccion ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty
                description={
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {pacienteSeleccionado ? 'Seleccione un cobro para ver el detalle' : 'Primero busque un paciente'}
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : seleccion.tipo === 'cita' ? (
            <PanelDetallePago
              cita={seleccion.item}
              paciente={pacienteSeleccionado!}
              nombreMedico={nombreMedico(seleccion.item.idPersonal)}
              especialidad={especialidadMedico(seleccion.item.idPersonal)}
              onPagoConfirmado={() => setSeleccion(null)}
            />
          ) : (
            <PanelDetalleProforma
              proforma={seleccion.item}
              paciente={pacienteSeleccionado!}
              onPagoConfirmado={() => setSeleccion(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ítem lista: Cita ─────────────────────────────────────────────────────────

function CitaListItem({
  cita, nombreMedico, especialidad, seleccionada, onClick,
}: {
  cita: CitaMedicaResponseDTO;
  nombreMedico: string;
  especialidad?: string;
  seleccionada: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        border: `1.5px solid ${seleccionada ? '#0F6E56' : 'var(--border)'}`,
        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
        background: seleccionada ? '#f0f7f4' : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Tag color="orange" style={{ fontSize: 10, padding: '0 5px', lineHeight: '18px' }}>Consulta</Tag>
            <Typography.Text strong style={{ fontSize: 12.5 }}>{nombreMedico}</Typography.Text>
          </div>
          {especialidad && (
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{especialidad}</Typography.Text>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
            {dayjs(cita.fechaHora).format('DD/MM/YYYY · HH:mm')} · Cita #{cita.id}
          </Typography.Text>
        </div>
        <ArrowRightOutlined style={{ color: seleccionada ? '#0F6E56' : '#ccc', fontSize: 12, marginLeft: 6, marginTop: 2 }} />
      </div>
    </button>
  );
}

// ── Ítem lista: Proforma ─────────────────────────────────────────────────────

function ProformaListItem({
  proforma, seleccionada, onClick,
}: {
  proforma: ProformaResponseDTO;
  seleccionada: boolean;
  onClick: () => void;
}) {
  const pendientes = proforma.items.filter(i => i.estado === 'PENDIENTE');
  const total = pendientes.reduce((s, i) => s + i.precioCongelado, 0);
  const esMed = proforma.tipo === 'MEDICAMENTOS';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        border: `1.5px solid ${seleccionada ? '#0F6E56' : 'var(--border)'}`,
        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
        background: seleccionada ? '#f0f7f4' : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Tag color={esMed ? 'blue' : 'purple'} style={{ fontSize: 10, padding: '0 5px', lineHeight: '18px' }}>
              {esMed ? 'Medicamentos' : 'Exámenes'}
            </Tag>
            {esMed
              ? <MedicineBoxOutlined style={{ fontSize: 11, color: '#1677ff' }} />
              : <ExperimentOutlined style={{ fontSize: 11, color: '#722ed1' }} />}
            <Typography.Text strong style={{ fontSize: 12.5 }}>Proforma #{proforma.id}</Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {pendientes.length} ítem{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''} · S/ {total.toFixed(2)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            Vence {dayjs(proforma.fechaVigencia).format('DD/MM/YYYY')}
          </Typography.Text>
        </div>
        <ArrowRightOutlined style={{ color: seleccionada ? '#0F6E56' : '#ccc', fontSize: 12, marginLeft: 6, marginTop: 2 }} />
      </div>
    </button>
  );
}

// ── Panel derecho: detalle de cita ───────────────────────────────────────────

function PanelDetallePago({
  cita, paciente, nombreMedico, especialidad, onPagoConfirmado,
}: {
  cita: CitaMedicaResponseDTO;
  paciente: PacienteResponseDTO;
  nombreMedico: string;
  especialidad?: string;
  onPagoConfirmado: () => void;
}) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const { data: pago, isLoading, isError, error } = usePagoPorCita(cita.id);
  const crearMut = useCrearPagoConsulta();
  const { data: consultorios = [] } = useConsultorios();
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [pasarelaAbierta, setPasarelaAbierta] = useState(false);
  const [saldoModalAbierto, setSaldoModalAbierto] = useState(false);

  const { data: notasCredito = [] } = useNotasCredito(pago ? paciente.id : null);
  const ncsDisponibles = notasCredito.filter(nc => nc.estado === 'DISPONIBLE');

  const noExistePago = isError && (error as { response?: { status?: number } })?.response?.status === 404;

  const handleGenerarCobro = async () => {
    try {
      await crearMut.mutateAsync({
        idCita: cita.id,
        idPaciente: paciente.id,
        idPersonalMedico: cita.idPersonal,
        correoPaciente: paciente.correo ?? undefined,
        nombrePaciente: `${paciente.nombres} ${paciente.apellidos}`,
      });
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 404) {
        notification.error({
          message: 'Falta configurar la tarifa',
          description: msg ?? 'No hay tarifa para la especialidad de este médico. Configúrela en "Tarifas de consulta".',
        });
      } else {
        notification.error({ message: 'Error al generar el cobro', description: msg });
      }
    }
  };

  return (
    <>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#f8f9fa' }}>
        <Typography.Text strong style={{ fontSize: 13 }}>Detalle del cobro — Consulta médica</Typography.Text>
      </div>

      <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          background: '#f8f9fa', borderRadius: 10, padding: '14px 18px',
          border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <FilaDetalle label="Paciente" value={`${paciente.nombres} ${paciente.apellidos}`} />
          <FilaDetalle label="Documento" value={paciente.documentoIdentidad} />
          <FilaDetalle label="Médico" value={nombreMedico} />
          {especialidad && <FilaDetalle label="Especialidad" value={especialidad} />}
          <FilaDetalle label="Fecha y hora" value={dayjs(cita.fechaHora).format('DD/MM/YYYY · HH:mm')} />
          <FilaDetalle label="N° de cita" value={`#${cita.id}`} />
          <FilaDetalle label="Consultorio" value={`N° ${consultorios.find(c => c.id === cita.idConsultorio)?.numero ?? cita.idConsultorio}`} />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spin /></div>
        ) : noExistePago ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: '16px', background: '#fffbe6', borderRadius: 10, border: '1px solid #ffe58f',
          }}>
            <InfoCircleOutlined style={{ fontSize: 20, color: '#faad14' }} />
            <Typography.Text style={{ fontSize: 13, textAlign: 'center' }}>
              Aún no se ha generado el cobro para esta cita.
            </Typography.Text>
            <Button type="primary" icon={<DollarOutlined />} loading={crearMut.isPending} onClick={handleGenerarCobro}>
              Generar cobro
            </Button>
          </div>
        ) : pago ? (
          <>
            <div style={{ padding: '14px 18px', background: '#f0f7f4', borderRadius: 10, border: '1px solid #b7e3d4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tarifa de consulta</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 22, display: 'block', color: '#0F6E56' }}>
                    S/ {pago.monto.toFixed(2)}
                  </Typography.Text>
                </div>
                <Tag color={ESTADO_PAGO_TAG[pago.estado].color} style={{ fontSize: 12 }}>
                  {ESTADO_PAGO_TAG[pago.estado].label}
                </Tag>
              </div>
              {pago.montoCreditoAplicado > 0 && (
                <div style={{ borderTop: '1px solid #b7e3d4', paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Crédito aplicado</Typography.Text>
                    <Typography.Text style={{ fontSize: 12, color: '#cf1322' }}>− S/ {pago.montoCreditoAplicado.toFixed(2)}</Typography.Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>Total a cobrar</Typography.Text>
                    <Typography.Text strong style={{ fontSize: 16, color: '#0F6E56' }}>S/ {pago.montoACobrar.toFixed(2)}</Typography.Text>
                  </div>
                </div>
              )}
            </div>

            {pago.estado === 'PENDIENTE' && ncsDisponibles.length > 0 && pago.montoACobrar > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GiftOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <div>
                    <Typography.Text style={{ fontSize: 12 }}>Saldo disponible en notas de crédito</Typography.Text>
                    <Typography.Text strong style={{ fontSize: 13, display: 'block', color: '#389e0d' }}>
                      S/ {ncsDisponibles.reduce((sum, nc) => sum + nc.monto, 0).toFixed(2)}
                    </Typography.Text>
                  </div>
                </div>
                <Button size="small" style={{ borderColor: '#52c41a', color: '#389e0d' }} onClick={() => setSaldoModalAbierto(true)}>
                  Aplicar saldo
                </Button>
              </div>
            )}

            {pago.estado === 'PENDIENTE' && (
              <>
                <Divider style={{ margin: '0' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Método de pago</Typography.Text>
                </Divider>
                <Radio.Group value={metodo} onChange={e => setMetodo(e.target.value)} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <MetodoCard metodo="efectivo" label="Efectivo" descripcion="La transacción se realiza en ventanilla" icon={<WalletOutlined style={{ fontSize: 22 }} />} seleccionado={metodo === 'efectivo'} onClick={() => setMetodo('efectivo')} />
                    <MetodoCard metodo="tarjeta" label="Tarjeta" descripcion="Débito o crédito mediante pasarela de pagos" icon={<CreditCardOutlined style={{ fontSize: 22 }} />} seleccionado={metodo === 'tarjeta'} onClick={() => setMetodo('tarjeta')} />
                  </div>
                </Radio.Group>
                {pago.montoACobrar === 0 ? (
                  <Button type="primary" size="large" block icon={<GiftOutlined />} onClick={() => setPasarelaAbierta(true)} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                    Confirmar (cubierto con saldo)
                  </Button>
                ) : metodo === 'efectivo' ? (
                  <Button type="primary" size="large" block icon={<WalletOutlined />} onClick={() => setPasarelaAbierta(true)} style={{ background: '#0F6E56', borderColor: '#0F6E56' }}>
                    Confirmar pago en efectivo
                  </Button>
                ) : (
                  <Button type="primary" size="large" block icon={<CreditCardOutlined />} onClick={() => setPasarelaAbierta(true)} style={{ background: '#1677ff', borderColor: '#1677ff' }}>
                    Pagar con tarjeta
                  </Button>
                )}
              </>
            )}

            {(pago.estado === 'PAGADO' || pago.estado === 'PAGADO_SIN_CONFIRMAR') && (
              <Alert
                type={pago.estado === 'PAGADO' ? 'success' : 'warning'}
                showIcon
                message={pago.estado === 'PAGADO' ? 'Pago confirmado' : 'Pago registrado sin confirmar'}
                description={pago.estado === 'PAGADO'
                  ? 'El cobro fue procesado. Puede ver la boleta en el módulo de Comprobantes.'
                  : 'Este cobro requiere revisión manual por el área administrativa.'}
              />
            )}
          </>
        ) : (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>Error al consultar el cobro</Typography.Text>
        )}
      </div>

      {pago && (
        <PasarelaPagoModal
          open={pasarelaAbierta}
          pagoId={pago.id}
          paciente={`${paciente.nombres} ${paciente.apellidos}`}
          medico={nombreMedico}
          especialidad={especialidad}
          fechaHoraCita={cita.fechaHora}
          correoPaciente={paciente.correo ?? undefined}
          metodo={metodo}
          onClose={() => { setPasarelaAbierta(false); onPagoConfirmado(); }}
          onFinalizado={() => {}}
        />
      )}

      {pago && (
        <AplicarSaldoModal
          open={saldoModalAbierto}
          ncs={ncsDisponibles}
          pagoId={pago.id}
          onClose={() => setSaldoModalAbierto(false)}
          onAplicado={() => {
            setSaldoModalAbierto(false);
            queryClient.invalidateQueries({ queryKey: ['pago-por-cita', cita.id] });
          }}
        />
      )}
    </>
  );
}

// ── Panel derecho: detalle de proforma ───────────────────────────────────────

function PanelDetalleProforma({
  proforma, paciente, onPagoConfirmado,
}: {
  proforma: ProformaResponseDTO;
  paciente: PacienteResponseDTO;
  onPagoConfirmado: () => void;
}) {
  const itemsPendientes = proforma.items.filter(i => i.estado === 'PENDIENTE');
  const itemsMedicamento = itemsPendientes.filter(i => i.tipo === 'MEDICAMENTO');

  // Cargar stock de medicamentos
  const stockQueries = useQueries({
    queries: itemsMedicamento.map(item => ({
      queryKey: ['farmacia', 'disponibilidad', item.idItem],
      queryFn: () => farmaciaApi.obtenerDisponibilidadMedicamento(item.idItem).then(d => d.cantidadTotal),
    })),
  });

  const stockMap: Record<number, number> = {};
  itemsMedicamento.forEach((item, i) => {
    const q = stockQueries[i];
    if (q.data !== undefined) stockMap[item.idItem] = q.data;
  });

  // Cantidades elegidas por idItem de ItemProforma
  const [cantidades, setCantidades] = useState<Record<number, number>>(() =>
    Object.fromEntries(itemsPendientes.map(i => [i.id, i.cantidad ?? 1]))
  );

  // Resetear cantidades si cambia la proforma
  useEffect(() => {
    setCantidades(Object.fromEntries(itemsPendientes.map(i => [i.id, i.cantidad ?? 1])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proforma.id]);

  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [pasarelaAbierta, setPasarelaAbierta] = useState(false);

  const setCantidad = (itemId: number, qty: number) => {
    setCantidades(prev => ({ ...prev, [itemId]: qty }));
  };

  // Calcular totales según cantidades elegidas
  const calcTotal = () => {
    return itemsPendientes.reduce((s, item) => {
      const qty = cantidades[item.id] ?? item.cantidad ?? 1;
      return s + item.precioUnitario * qty;
    }, 0);
  };

  const total = calcTotal();
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - subtotal) * 100) / 100;

  // El botón de pagar se habilita cuando:
  // - hay al menos 1 ítem con cantidad > 0
  // - todos los medicamentos tienen qty <= stock disponible (si el stock ya cargó)
  const stockListo = stockQueries.every(q => q.status !== 'pending');
  const hayItemsAPagar = itemsPendientes.some(i => (cantidades[i.id] ?? 1) > 0);
  const stockValido = itemsMedicamento.every(item => {
    const qty = cantidades[item.id] ?? item.cantidad ?? 1;
    const stock = stockMap[item.idItem];
    return stock === undefined || qty <= stock;
  });
  const puedesPagar = hayItemsAPagar && stockValido;

  const idsItemsAPagar = itemsPendientes
    .filter(i => (cantidades[i.id] ?? 1) > 0)
    .map(i => i.id);

  const esMed = proforma.tipo === 'MEDICAMENTOS';

  return (
    <>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {esMed
            ? <MedicineBoxOutlined style={{ color: '#1677ff' }} />
            : <ExperimentOutlined style={{ color: '#722ed1' }} />}
          <Typography.Text strong style={{ fontSize: 13 }}>
            Detalle del cobro — {esMed ? 'Medicamentos' : 'Exámenes de laboratorio'}
          </Typography.Text>
        </div>
      </div>

      <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Info */}
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FilaDetalle label="Paciente" value={`${paciente.nombres} ${paciente.apellidos}`} />
          <FilaDetalle label="Documento" value={paciente.documentoIdentidad} />
          <FilaDetalle label="Proforma N°" value={`#${proforma.id}`} />
          <FilaDetalle label="Generada" value={dayjs(proforma.fechaGeneracion).format('DD/MM/YYYY HH:mm')} />
          <FilaDetalle label="Vigente hasta" value={dayjs(proforma.fechaVigencia).format('DD/MM/YYYY')} />
          {proforma.idReceta && <FilaDetalle label="Receta" value={`…${proforma.idReceta.slice(-8)}`} />}
          {proforma.idOrden && <FilaDetalle label="Orden lab." value={`…${proforma.idOrden.slice(-8)}`} />}
        </div>

        {/* Ítems con selección de cantidad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itemsPendientes.map((item) => {
            const stockItem = item.tipo === 'MEDICAMENTO' ? stockMap[item.idItem] : undefined;
            const qty = cantidades[item.id] ?? (item.cantidad ?? 1);
            const sinStock = stockItem !== undefined && qty > stockItem;
            const maxQty = item.cantidad ?? 1;

            return (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${sinStock ? '#ff7875' : '#f0f0f0'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  background: sinStock ? '#fff2f0' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong>{item.nombreItem}</Typography.Text>
                    {item.tipo === 'MEDICAMENTO' && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        {[item.dosis, item.frecuencia, item.duracion].filter(Boolean).join(' · ')}
                        {item.principioActivo && ` — ${item.principioActivo}`}
                      </div>
                    )}
                    {item.tipo === 'EXAMEN' && item.categoria && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.categoria}</div>
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      S/ {item.precioUnitario.toFixed(2)} c/u
                    </Typography.Text>
                    {stockItem !== undefined && (
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {sinStock ? (
                          <Typography.Text type="danger">
                            <WarningOutlined style={{ marginRight: 4 }} />
                            Solo hay {stockItem} unidad{stockItem !== 1 ? 'es' : ''} en stock
                          </Typography.Text>
                        ) : (
                          <Typography.Text type="secondary">{stockItem} en stock</Typography.Text>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Cant.:</Typography.Text>
                      <InputNumber
                        size="small"
                        min={0}
                        max={maxQty}
                        value={qty}
                        onChange={v => setCantidad(item.id, v ?? 0)}
                        style={{ width: 70 }}
                      />
                    </div>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      S/ {(item.precioUnitario * qty).toFixed(2)}
                    </Typography.Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* IGV breakdown */}
        <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 16px', fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text type="secondary">Subtotal</Typography.Text>
            <Typography.Text>S/ {subtotal.toFixed(2)}</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text type="secondary">IGV (18%)</Typography.Text>
            <Typography.Text>S/ {igv.toFixed(2)}</Typography.Text>
          </div>
          <Divider style={{ margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text strong>Total a cobrar</Typography.Text>
            <Typography.Text strong style={{ fontSize: 18, color: '#0F6E56' }}>S/ {total.toFixed(2)}</Typography.Text>
          </div>
        </div>

        {/* Método de pago */}
        <Divider style={{ margin: '0' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Método de pago</Typography.Text>
        </Divider>
        <Radio.Group value={metodo} onChange={e => setMetodo(e.target.value)} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <MetodoCard metodo="efectivo" label="Efectivo" descripcion="La transacción se realiza en ventanilla" icon={<WalletOutlined style={{ fontSize: 22 }} />} seleccionado={metodo === 'efectivo'} onClick={() => setMetodo('efectivo')} />
            <MetodoCard metodo="tarjeta" label="Tarjeta" descripcion="Débito o crédito mediante pasarela de pagos" icon={<CreditCardOutlined style={{ fontSize: 22 }} />} seleccionado={metodo === 'tarjeta'} onClick={() => setMetodo('tarjeta')} />
          </div>
        </Radio.Group>

        {!stockListo && <Spin size="small" tip="Verificando stock…" />}

        {!puedesPagar && stockListo && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Ajuste las cantidades para que no superen el stock disponible antes de proceder al pago."
            style={{ fontSize: 12, padding: '4px 12px' }}
          />
        )}

        {metodo === 'efectivo' ? (
          <Button
            type="primary"
            size="large"
            block
            icon={<ShoppingCartOutlined />}
            disabled={!puedesPagar}
            onClick={() => setPasarelaAbierta(true)}
            style={{ background: '#0F6E56', borderColor: '#0F6E56' }}
          >
            Confirmar pago en efectivo
          </Button>
        ) : (
          <Button
            type="primary"
            size="large"
            block
            icon={<CreditCardOutlined />}
            disabled={!puedesPagar}
            onClick={() => setPasarelaAbierta(true)}
            style={{ background: '#1677ff', borderColor: '#1677ff' }}
          >
            Pagar con tarjeta
          </Button>
        )}
      </div>

      <PasarelaProformaModal
        open={pasarelaAbierta}
        proforma={proforma}
        idsItems={idsItemsAPagar}
        paciente={`${paciente.nombres} ${paciente.apellidos}`}
        correoPaciente={paciente.correo ?? undefined}
        metodo={metodo}
        onClose={() => { setPasarelaAbierta(false); onPagoConfirmado(); }}
      />
    </>
  );
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function AplicarSaldoModal({
  open, ncs, pagoId, onClose, onAplicado,
}: {
  open: boolean;
  ncs: NotaCreditoResponseDTO[];
  pagoId: number;
  onClose: () => void;
  onAplicado: () => void;
}) {
  const { notification } = App.useApp();
  const [aplicando, setAplicando] = useState<number | null>(null);

  const handleAplicar = async (nc: NotaCreditoResponseDTO) => {
    setAplicando(nc.id);
    try {
      await cajaApi.aplicarCredito(pagoId, nc.id);
      notification.success({ message: 'Saldo aplicado', description: `S/ ${nc.monto.toFixed(2)} descontados del cobro.` });
      onAplicado();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al aplicar saldo', description: msg });
    } finally {
      setAplicando(null);
    }
  };

  return (
    <Modal
      open={open}
      title="Aplicar saldo de nota de crédito"
      onCancel={onClose}
      footer={<Button onClick={onClose}>Cerrar</Button>}
      width={480}
    >
      {ncs.length === 0 ? (
        <Empty description="No hay notas de crédito disponibles" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ncs.map(nc => (
            <div key={nc.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f',
            }}>
              <div>
                <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
                  S/ {nc.monto.toFixed(2)}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {nc.numero} · {nc.motivo}
                </Typography.Text>
              </div>
              <Button size="small" type="primary" loading={aplicando === nc.id} onClick={() => handleAplicar(nc)} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                Aplicar
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function FilaDetalle({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
      <Typography.Text style={{ fontSize: 12 }}>{value}</Typography.Text>
    </div>
  );
}

function MetodoCard({
  label, descripcion, icon, seleccionado, onClick,
}: {
  metodo: MetodoPago;
  label: string;
  descripcion: string;
  icon: React.ReactNode;
  seleccionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: `2px solid ${seleccionado ? '#0F6E56' : 'var(--border)'}`,
        borderRadius: 10, padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
        background: seleccionado ? '#f0f7f4' : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ color: seleccionado ? '#0F6E56' : '#888', marginBottom: 6 }}>{icon}</div>
      <Typography.Text strong style={{ fontSize: 13, display: 'block', color: seleccionado ? '#0F6E56' : undefined }}>{label}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>{descripcion}</Typography.Text>
    </button>
  );
}

// ── Tab: Tarifas de consulta ─────────────────────────────────────────────────

interface FilaTarifa {
  idEspecialidad: number;
  especialidad: string;
  monto: number | null;
}

function TarifasTab() {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState<FilaTarifa | null>(null);

  const { data: especialidades = [], isLoading: isLoadingEsp } = useEspecialidades();
  const { data: tarifas = [], isLoading: isLoadingTarifas } = useTarifas();
  const guardarMut = useGuardarTarifa();

  const filas: FilaTarifa[] = especialidades.map(e => ({
    idEspecialidad: e.id,
    especialidad: e.nombre,
    monto: tarifas.find(t => t.idEspecialidad === e.id)?.monto ?? null,
  }));

  const openEditar = (fila: FilaTarifa) => {
    setEditando(fila);
    form.setFieldsValue({ monto: fila.monto ?? undefined });
  };
  const closeDrawer = () => {
    setEditando(null);
    form.resetFields();
  };

  const handleSubmit = async (values: { monto: number }) => {
    if (!editando) return;
    try {
      await guardarMut.mutateAsync({ idEspecialidad: editando.idEspecialidad, monto: values.monto });
      notification.success({ message: 'Tarifa guardada' });
      closeDrawer();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al guardar la tarifa', description: msg });
    }
  };

  const columns: ColumnsType<FilaTarifa> = [
    { title: 'Especialidad', dataIndex: 'especialidad' },
    {
      title: 'Tarifa',
      dataIndex: 'monto',
      width: 160,
      render: (v: number | null) => v !== null ? `S/ ${v.toFixed(2)}` : <Tag>No configurada</Tag>,
    },
    {
      title: '',
      key: 'acciones',
      width: 90,
      render: (_, r) => (
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditar(r)} />
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
      <Table
        rowKey="idEspecialidad"
        columns={columns}
        dataSource={filas}
        loading={isLoadingEsp || isLoadingTarifas}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Sin especialidades registradas' }}
      />

      <Drawer
        title={editando ? `Tarifa — ${editando.especialidad}` : 'Tarifa'}
        open={editando !== null}
        onClose={closeDrawer}
        width={380}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={guardarMut.isPending} onClick={() => form.submit()}>Guardar</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="monto"
            label="Monto de la consulta (S/)"
            rules={[{ required: true, message: 'Ingrese el monto' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0.01} step={0.5} precision={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
