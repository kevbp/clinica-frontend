import { useState } from 'react';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  Tabs, Alert, Spin, Typography, Tag, Button, App,
  Table, Drawer, Form, InputNumber, Empty, Divider, Radio, Modal, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined, EditOutlined, InfoCircleOutlined,
  CreditCardOutlined, WalletOutlined, ArrowRightOutlined, GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import { useListaCitas } from '../../hooks/useCitas';
import { useEspecialidades, useMedicos } from '../../hooks/usePersonal';
import { useConsultorios } from '../../hooks/useHorarios';
import PasarelaPagoModal from '../../components/caja/PasarelaPagoModal';
import {
  useDisponibilidadCaja,
  usePagoPorCita,
  useCrearPagoConsulta,
  useTarifas,
  useGuardarTarifa,
  useNotasCredito,
} from '../../hooks/useCaja';
import { useQueryClient } from '@tanstack/react-query';
import * as cajaApi from '../../api/caja';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { CitaMedicaResponseDTO } from '../../types/citas';
import type { EstadoPagoConsulta, NotaCreditoResponseDTO } from '../../types/caja';

const ESTADO_PAGO_TAG: Record<EstadoPagoConsulta, { color: string; label: string }> = {
  PENDIENTE: { color: 'gold', label: 'Pendiente' },
  PAGADO: { color: 'green', label: 'Pagado' },
  PAGADO_SIN_CONFIRMAR: { color: 'red', label: 'Pagado sin confirmar' },
};

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
          { key: 'pagar', label: 'Pagar consulta', children: <PagarConsultaTab /> },
          { key: 'tarifas', label: 'Tarifas de consulta', children: <TarifasTab /> },
        ]}
      />
    </div>
  );
}

// ── Tab: Pagar consulta — split panel ───────────────────────────────────────

function PagarConsultaTab() {
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaMedicaResponseDTO | null>(null);
  const { data: medicos = [] } = useMedicos();

  const { data: citasPendientes = [], isLoading } = useListaCitas({
    idPaciente: pacienteSeleccionado?.id,
    estado: 'PENDIENTE_PAGO',
  });

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
    setCitaSeleccionada(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BuscadorPaciente
        pacienteSeleccionado={pacienteSeleccionado}
        onSeleccionar={handleSeleccionarPaciente}
      />

      {/* Split panel */}
      <div style={{
        display: 'flex', gap: 12, minHeight: 400, alignItems: 'stretch',
      }}>
        {/* ── Panel izquierdo: lista de citas pendientes ─── */}
        <div style={{
          width: 340, flexShrink: 0,
          background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: '#f8f9fa',
          }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              Citas pendientes de pago
            </Typography.Text>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {!pacienteSeleccionado ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description={<span style={{ fontSize: 12, color: '#888' }}>Busque un paciente para ver sus citas</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spin /></div>
            ) : citasPendientes.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description={<span style={{ fontSize: 12, color: '#888' }}>No hay citas pendientes de pago</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {citasPendientes.map(cita => (
                  <CitaListItem
                    key={cita.id}
                    cita={cita}
                    nombreMedico={nombreMedico(cita.idPersonal)}
                    especialidad={especialidadMedico(cita.idPersonal)}
                    seleccionada={citaSeleccionada?.id === cita.id}
                    onClick={() => setCitaSeleccionada(cita)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: detalle y métodos de pago ─── */}
        <div style={{
          flex: 1,
          background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {!citaSeleccionada ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty
                description={
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {pacienteSeleccionado
                      ? 'Seleccione una cita para ver el detalle de pago'
                      : 'Primero busque un paciente'}
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <PanelDetallePago
              cita={citaSeleccionada}
              paciente={pacienteSeleccionado!}
              nombreMedico={nombreMedico(citaSeleccionada.idPersonal)}
              especialidad={especialidadMedico(citaSeleccionada.idPersonal)}
              onPagoConfirmado={() => setCitaSeleccionada(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ítem de la lista izquierda ───────────────────────────────────────────────

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
          <Typography.Text strong style={{ fontSize: 12.5, display: 'block', marginBottom: 2 }}>
            {nombreMedico}
          </Typography.Text>
          {especialidad && (
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {especialidad}
            </Typography.Text>
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

// ── Panel derecho: detalle + métodos de pago ─────────────────────────────────

type MetodoPago = 'efectivo' | 'tarjeta';

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

  const handleConfirmarEfectivo = () => {
    setPasarelaAbierta(true);
  };

  const handleConfirmarTarjeta = () => {
    setPasarelaAbierta(true);
  };

  return (
    <>
      {/* Encabezado del panel */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#f8f9fa' }}>
        <Typography.Text strong style={{ fontSize: 13 }}>Detalle del cobro</Typography.Text>
      </div>

      <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Info de la cita */}
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

        {/* Monto */}
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
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={crearMut.isPending}
              onClick={handleGenerarCobro}
            >
              Generar cobro
            </Button>
          </div>
        ) : pago ? (
          <>
            {/* Monto + estado */}
            <div style={{
              padding: '14px 18px', background: '#f0f7f4', borderRadius: 10,
              border: '1px solid #b7e3d4',
            }}>
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
                    <Typography.Text style={{ fontSize: 12, color: '#cf1322' }}>
                      − S/ {pago.montoCreditoAplicado.toFixed(2)}
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>Total a cobrar</Typography.Text>
                    <Typography.Text strong style={{ fontSize: 16, color: '#0F6E56' }}>
                      S/ {pago.montoACobrar.toFixed(2)}
                    </Typography.Text>
                  </div>
                </div>
              )}
            </div>

            {/* Saldo disponible */}
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
                <Button size="small" type="default" style={{ borderColor: '#52c41a', color: '#389e0d' }}
                  onClick={() => setSaldoModalAbierto(true)}>
                  Aplicar saldo
                </Button>
              </div>
            )}

            {pago.estado === 'PENDIENTE' && (
              <>
                <Divider style={{ margin: '0' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Método de pago</Typography.Text>
                </Divider>

                {/* Selector de método */}
                <Radio.Group
                  value={metodo}
                  onChange={e => setMetodo(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    <MetodoCard
                      metodo="efectivo"
                      label="Efectivo"
                      descripcion="La transacción se realiza en ventanilla"
                      icon={<WalletOutlined style={{ fontSize: 22 }} />}
                      seleccionado={metodo === 'efectivo'}
                      onClick={() => setMetodo('efectivo')}
                    />
                    <MetodoCard
                      metodo="tarjeta"
                      label="Tarjeta"
                      descripcion="Débito o crédito mediante pasarela de pagos"
                      icon={<CreditCardOutlined style={{ fontSize: 22 }} />}
                      seleccionado={metodo === 'tarjeta'}
                      onClick={() => setMetodo('tarjeta')}
                    />
                  </div>
                </Radio.Group>

                {/* Caso especial: saldo cubre el total */}
                {pago.montoACobrar === 0 ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<GiftOutlined />}
                    onClick={handleConfirmarEfectivo}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Confirmar (cubierto con saldo)
                  </Button>
                ) : metodo === 'efectivo' ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<WalletOutlined />}
                    onClick={handleConfirmarEfectivo}
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
                    onClick={handleConfirmarTarjeta}
                    style={{ background: '#1677ff', borderColor: '#1677ff' }}
                  >
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

      {/* Pasarela */}
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
          onClose={() => {
            setPasarelaAbierta(false);
            onPagoConfirmado();
          }}
          onFinalizado={() => {}}
        />
      )}

      {/* Modal: seleccionar NC para aplicar saldo */}
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

// ── Modal: aplicar saldo de NC ───────────────────────────────────────────────

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
              <Button
                size="small"
                type="primary"
                loading={aplicando === nc.id}
                onClick={() => handleAplicar(nc)}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
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
      <Typography.Text strong style={{ fontSize: 13, display: 'block', color: seleccionado ? '#0F6E56' : undefined }}>
        {label}
      </Typography.Text>
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
