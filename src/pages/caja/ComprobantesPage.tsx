import React, { useState } from 'react';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import { Alert, Table, Tag, Button, Modal, Typography, Space, Spin, Empty, Tabs, Input, Form, App, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, PrinterOutlined, DownloadOutlined, CloseOutlined, MailOutlined, BankOutlined, CheckCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import { useDisponibilidadCaja, useComprobantesPorPaciente, usePagoConsultaPorId, useNotasCredito } from '../../hooks/useCaja';
import { useCitaPorId } from '../../hooks/useCitas';
import { useMedicos } from '../../hooks/usePersonal';
import * as cajaApi from '../../api/caja';
import { useQuery } from '@tanstack/react-query';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { ComprobanteResponseDTO, NotaCreditoResponseDTO, RetiroRequestDTO, TipoComprobante, EstadoNotaCredito, TipoNotaCredito } from '../../types/caja';

const NOMBRE_CENTRO = 'Centro Médico Esperanza Sur';
const SEDE = 'Sede Lima Sur';

const TIPO_TAG: Record<TipoComprobante, { color: string; label: string }> = {
  CONSULTA: { color: 'blue', label: 'Consulta' },
  PROFORMA: { color: 'purple', label: 'Proforma' },
};

const ESTADO_NC_TAG: Record<EstadoNotaCredito, { color: string; label: string }> = {
  DISPONIBLE: { color: 'blue', label: 'Disponible' },
  USADA: { color: 'default', label: 'Usada' },
};

const TIPO_NC_TAG: Record<TipoNotaCredito, { color: string; label: string }> = {
  CANCELACION_ANTICIPADA:  { color: 'green',   label: 'Cancelación anticipada'  },
  CANCELACION_TARDIA:      { color: 'orange',  label: 'Cancelación tardía'       },
  CANCELACION_POR_CLINICA: { color: 'blue',    label: 'Cancelación por clínica'  },
  NO_SHOW:                 { color: 'volcano', label: 'No presentación'          },
  ERROR_COBRO:             { color: 'purple',  label: 'Error de cobro'           },
};



export default function ComprobantesPage() {
  const { isError: isServiceDown, error: serviceError } = useDisponibilidadCaja();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PageHeader title="Comprobantes" />

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
          { key: 'comprobantes', label: 'Documentos emitidos', children: <ComprobantesTab /> },
          { key: 'notas-credito', label: 'Notas de crédito', children: <NotasCreditoTab /> },
        ]}
      />
    </div>
  );
}

// ── Tab: Comprobantes ───────────────────────────────────────────────────────

function ComprobantesTab() {
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<ComprobanteResponseDTO | null>(null);

  const { data: comprobantes = [], isLoading } = useComprobantesPorPaciente(pacienteSeleccionado?.id ?? null);

  const columns: ColumnsType<ComprobanteResponseDTO> = [
    { title: 'N° comprobante', dataIndex: 'numero', width: 180 },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 120,
      render: (v: TipoComprobante) => <Tag color={TIPO_TAG[v].color}>{TIPO_TAG[v].label}</Tag>,
    },
    {
      title: 'Fecha de emisión',
      dataIndex: 'fechaEmision',
      width: 170,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Monto',
      dataIndex: 'montoTotal',
      width: 120,
      render: (v: number) => `S/ ${v.toFixed(2)}`,
    },
    {
      title: '',
      key: 'acciones',
      width: 80,
      render: (_, r) => (
        <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => setComprobanteSeleccionado(r)} />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BuscadorPaciente
        pacienteSeleccionado={pacienteSeleccionado}
        onSeleccionar={setPacienteSeleccionado}
        placeholder="Buscar paciente para ver su historial de comprobantes"
      />

      {!pacienteSeleccionado ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
          <Empty description="Busque un paciente para ver sus comprobantes emitidos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={comprobantes}
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} comprobantes` }}
            locale={{ emptyText: 'Este paciente no tiene comprobantes emitidos' }}
          />
        </div>
      )}

      <DetalleComprobanteModal
        comprobante={comprobanteSeleccionado}
        paciente={pacienteSeleccionado}
        onClose={() => setComprobanteSeleccionado(null)}
      />
    </div>
  );
}

// ── Tab: Notas de crédito ───────────────────────────────────────────────────

function NotasCreditoTab() {
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);
  const [ncSeleccionada, setNcSeleccionada] = useState<NotaCreditoResponseDTO | null>(null);
  const { data: notas = [], isLoading } = useNotasCredito(pacienteSeleccionado?.id ?? null);

  const columns: ColumnsType<NotaCreditoResponseDTO> = [
    {
      title: 'N° NC',
      dataIndex: 'numero',
      width: 180,
      render: (v: string) => (
        <Typography.Text copyable style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {v ?? '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 175,
      render: (v: TipoNotaCredito) => {
        const tag = TIPO_NC_TAG[v];
        return <Tag color={tag?.color}>{tag?.label ?? v}</Tag>;
      },
    },
    {
      title: 'Monto devuelto',
      dataIndex: 'monto',
      width: 130,
      render: (v: number) => <Typography.Text strong style={{ color: '#389e0d' }}>S/ {v.toFixed(2)}</Typography.Text>,
    },
    {
      title: 'Penalidad',
      dataIndex: 'montoRetenido',
      width: 110,
      render: (v: number) =>
        v > 0 ? (
          <Typography.Text strong style={{ color: '#cf1322' }}>S/ {v.toFixed(2)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 110,
      render: (v: EstadoNotaCredito) => <Tag color={ESTADO_NC_TAG[v].color}>{ESTADO_NC_TAG[v].label}</Tag>,
    },
    {
      title: '',
      key: 'acciones',
      width: 60,
      render: (_, r) => (
        <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => setNcSeleccionada(r)} />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BuscadorPaciente pacienteSeleccionado={pacienteSeleccionado} onSeleccionar={setPacienteSeleccionado} />

      {!pacienteSeleccionado ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
          <Empty description="Busque un paciente para ver sus notas de crédito" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={notas}
            loading={isLoading}
            size="small"
            pagination={false}
            locale={{ emptyText: 'Este paciente no tiene notas de crédito' }}
          />
        </div>
      )}

      <DetalleNCModal
        nc={ncSeleccionada}
        paciente={pacienteSeleccionado}
        onClose={() => setNcSeleccionada(null)}
      />
    </div>
  );
}

// ── Modal de detalle de NC — estilo recibo ─────────────────────────────────

function DetalleNCModal({
  nc, paciente, onClose,
}: {
  nc: NotaCreditoResponseDTO | null;
  paciente: PacienteResponseDTO | null;
  onClose: () => void;
}) {
  const { notification } = App.useApp();
  const [retiroModalAbierto, setRetiroModalAbierto] = useState(false);

  if (!nc) return null;
  const tag = TIPO_NC_TAG[nc.tipo];
  const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : '—';

  const handleDescargar = () => {
    const html = construirHtmlNC(nc, nombrePaciente);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nc.numero ?? 'NC'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Modal
        open={nc !== null}
        onCancel={onClose}
        footer={null}
        width={420}
        centered
        destroyOnClose
      >
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #nc-imprimible, #nc-imprimible * { visibility: visible; }
            #nc-imprimible { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {/* Encabezado de éxito */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircleFilled style={{ fontSize: 26, color: '#389e0d' }} />
            <div>
              <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>Nota de Crédito</Typography.Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Typography.Text
                  copyable={{ text: nc.numero ?? '' }}
                  style={{ fontSize: 11, fontFamily: 'monospace', color: '#888' }}
                >
                  {nc.numero ?? '—'}
                </Typography.Text>
                <Tag color={ESTADO_NC_TAG[nc.estado].color} style={{ margin: 0 }}>
                  {ESTADO_NC_TAG[nc.estado].label}
                </Tag>
              </div>
            </div>
          </div>

          {/* Recibo */}
          <div
            id="nc-imprimible"
            style={{
              border: '1px dashed #d9d9d9', borderRadius: 8, padding: '16px 18px',
              background: '#FAFAFA', fontFamily: 'monospace', fontSize: 12.5,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>{NOMBRE_CENTRO}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{SEDE}</Typography.Text>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <Typography.Text strong style={{ fontSize: 12 }}>NOTA DE CRÉDITO</Typography.Text>
              <Typography.Text style={{ fontSize: 12, display: 'block' }}>{nc.numero ?? '—'}</Typography.Text>
            </div>

            <Linea label="Paciente" value={nombrePaciente} />
            <Linea label="Tipo" value={tag?.label ?? nc.tipo} />
            {nc.idComprobanteRelacionado && (
              <Linea label="Comprobante origen" value={`#${nc.idComprobanteRelacionado}`} />
            )}

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            <Linea label="Concepto" value={nc.motivo} />

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            {nc.montoRetenido > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#cf1322' }}>Penalidad retenida</span>
                <span style={{ color: '#cf1322' }}>S/ {nc.montoRetenido.toFixed(2)}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>MONTO A DEVOLVER</Typography.Text>
              <Typography.Text strong style={{ fontSize: 13, color: '#389e0d' }}>S/ {nc.monto.toFixed(2)}</Typography.Text>
            </div>
          </div>

          {/* Enviar por correo */}
          <EnviarCorreoSection
            label="Enviar NC por correo"
            onEnviar={async (correo) => {
              await cajaApi.enviarNotaCreditoPorCorreo(nc.id, correo);
            }}
            correoPredeterminado={paciente?.correo}
          />

          <Divider style={{ margin: '0' }} />

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button icon={<PrinterOutlined />} size="small" onClick={() => window.print()}>Imprimir</Button>
              <Button icon={<DownloadOutlined />} size="small" onClick={handleDescargar}>Descargar</Button>
            </Space>
            {nc.estado === 'DISPONIBLE' && (
              <Button
                icon={<BankOutlined />}
                onClick={() => setRetiroModalAbierto(true)}
                style={{ borderColor: '#1677ff', color: '#1677ff' }}
                size="small"
              >
                Solicitar retiro
              </Button>
            )}
          </div>

          <Button block onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>

      {paciente && (
        <RetiroModal
          open={retiroModalAbierto}
          nc={nc}
          paciente={paciente}
          onClose={() => setRetiroModalAbierto(false)}
          onRetiroSolicitado={() => {
            setRetiroModalAbierto(false);
            notification.success({
              message: 'Retiro solicitado',
              description: 'La transferencia será procesada en 3 a 5 días hábiles.',
            });
            onClose();
          }}
        />
      )}
    </>
  );
}

// ── Modal de retiro bancario ────────────────────────────────────────────────

function RetiroModal({
  open, nc, paciente, onClose, onRetiroSolicitado,
}: {
  open: boolean;
  nc: NotaCreditoResponseDTO;
  paciente: PacienteResponseDTO;
  onClose: () => void;
  onRetiroSolicitado: () => void;
}) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (values: RetiroRequestDTO) => {
    setCargando(true);
    try {
      await cajaApi.solicitarRetiro(paciente.id, { ...values, idNotaCredito: nc.id });
      onRetiroSolicitado();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al solicitar el retiro', description: msg });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Solicitar retiro bancario"
      footer={null}
      width={440}
      centered
      destroyOnClose
    >
      <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
        <Typography.Text>Monto a transferir: <strong>S/ {nc.monto.toFixed(2)}</strong></Typography.Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{
        nombreTitular: `${paciente.nombres} ${paciente.apellidos}`,
        nombreBanco: paciente.nombreBanco ?? '',
        numeroCuenta: paciente.numeroCuenta ?? '',
        correoConfirmacion: paciente.correo ?? '',
      }}>
        <Form.Item name="nombreTitular" label="Nombre del titular" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="nombreBanco" label="Banco" rules={[{ required: true }]}>
          <Input placeholder="Ej. BCP, BBVA, Interbank..." />
        </Form.Item>
        <Form.Item name="numeroCuenta" label="Número de cuenta" rules={[{ required: true }]}>
          <Input placeholder="Ej. 191-12345678-0-62" />
        </Form.Item>
        <Form.Item name="correoConfirmacion" label="Correo para confirmación">
          <Input type="email" placeholder="Recibirá un email cuando se procese el retiro" />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={cargando} icon={<BankOutlined />}>
            Solicitar retiro
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Modal de detalle / impresión ────────────────────────────────────────────

function DetalleComprobanteModal({
  comprobante,
  paciente,
  onClose,
}: {
  comprobante: ComprobanteResponseDTO | null;
  paciente: PacienteResponseDTO | null;
  onClose: () => void;
}) {
  const esConsulta = comprobante?.tipo === 'CONSULTA';

  const { data: pago, isLoading: isLoadingPago } = usePagoConsultaPorId(esConsulta ? comprobante!.idOrigen : null);
  const { data: cita, isLoading: isLoadingCita } = useCitaPorId(pago?.idCita ?? null);
  const { data: medicos = [] } = useMedicos();

  const { data: proforma, isLoading: isLoadingProforma } = useQuery({
    queryKey: ['caja', 'proforma', comprobante?.tipo === 'PROFORMA' ? comprobante.idOrigen : null],
    queryFn: () => cajaApi.obtenerProforma(comprobante!.idOrigen),
    enabled: comprobante?.tipo === 'PROFORMA',
  });

  const nombreMedico = cita ? (medicos.find(m => m.idPersonal === cita.idPersonal)
    ? `${medicos.find(m => m.idPersonal === cita.idPersonal)!.nombres} ${medicos.find(m => m.idPersonal === cita.idPersonal)!.apellidos}`
    : `#${cita.idPersonal}`) : null;

  const cargando = esConsulta ? (isLoadingPago || isLoadingCita) : isLoadingProforma;

  const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : '';

  const handleImprimir = () => window.print();

  const handleDescargar = () => {
    if (!comprobante) return;
    const html = construirHtml(comprobante, nombrePaciente, esConsulta, nombreMedico, cita?.fechaHora, proforma);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${comprobante.numero}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={comprobante !== null} onCancel={onClose} footer={null} width={420} centered destroyOnClose>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #boleta-historial, #boleta-historial * { visibility: visible; }
          #boleta-historial { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      {!comprobante ? null : cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {/* Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircleFilled style={{ fontSize: 26, color: '#389e0d' }} />
            <div>
              <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>
                {esConsulta ? 'Boleta de Venta' : 'Boleta de Venta — Proforma'}
              </Typography.Text>
              <Typography.Text
                copyable={{ text: comprobante.numero }}
                style={{ fontSize: 11, fontFamily: 'monospace', color: '#888' }}
              >
                {comprobante.numero}
              </Typography.Text>
            </div>
          </div>

          <div
            id="boleta-historial"
            style={{
              border: '1px dashed var(--border)', borderRadius: 8, padding: 18,
              background: '#FAFAFA', fontFamily: 'monospace', fontSize: 12.5,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>{NOMBRE_CENTRO}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{SEDE}</Typography.Text>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <Typography.Text strong style={{ fontSize: 12 }}>
                {esConsulta ? 'BOLETA DE VENTA' : 'BOLETA DE VENTA — PROFORMA'}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 12, display: 'block' }}>{comprobante.numero}</Typography.Text>
            </div>
            <Linea label="Fecha de emisión" value={dayjs(comprobante.fechaEmision).format('DD/MM/YYYY HH:mm')} />
            <Linea label="Paciente" value={nombrePaciente} />
            {esConsulta ? (
              <>
                <Linea label="Médico" value={nombreMedico ?? '—'} />
                <Linea label="Fecha de cita" value={cita ? dayjs(cita.fechaHora).format('DD/MM/YYYY HH:mm') : '—'} />
              </>
            ) : null}
            <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            {esConsulta ? (
              <Linea
                label="Consulta médica"
                value={`S/ ${(comprobante.montoTotal + (comprobante.descuento ?? 0)).toFixed(2)}`}
              />
            ) : (
              proforma?.items.filter(i => i.estado === 'PAGADO').map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: '#666' }}>{i.descripcion}{i.cantidad ? ` x${i.cantidad}` : ''}</span>
                  <span>S/ {i.precioCongelado.toFixed(2)}</span>
                </div>
              ))
            )}
            {comprobante.descuento != null && comprobante.descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#389e0d' }}>
                  Descuento ({comprobante.conceptoDescuento ?? 'Descuento aplicado'})
                </span>
                <span style={{ color: '#389e0d' }}>-S/ {comprobante.descuento.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />
            <Linea label="Subtotal (sin IGV)" value={`S/ ${comprobante.subtotal.toFixed(2)}`} />
            <Linea label="IGV (18%)" value={`S/ ${comprobante.igv.toFixed(2)}`} />
            <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>TOTAL</Typography.Text>
              <Typography.Text strong style={{ fontSize: 13 }}>S/ {comprobante.montoTotal.toFixed(2)}</Typography.Text>
            </div>
          </div>

          <EnviarCorreoSection
            label="Enviar boleta por correo"
            onEnviar={async (correo) => {
              await cajaApi.enviarComprobantePorCorreo(comprobante!.id, correo);
            }}
            correoPredeterminado={paciente?.correo}
          />

          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button icon={<PrinterOutlined />} size="small" onClick={handleImprimir}>Imprimir</Button>
              <Button icon={<DownloadOutlined />} size="small" onClick={handleDescargar}>Descargar</Button>
            </Space>
            <Button icon={<CloseOutlined />} onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Sección reutilizable: envío por correo ────────────────────────────────

function EnviarCorreoSection({
  label, onEnviar, correoPredeterminado,
}: {
  label: string;
  onEnviar: (correo: string) => Promise<void>;
  correoPredeterminado?: string;
}) {
  const { notification } = App.useApp();
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!correo.trim()) return;
    setEnviando(true);
    try {
      await onEnviar(correo.trim());
      notification.success({ message: 'Enviado', description: `Correo enviado a ${correo}` });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al enviar', description: msg });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        {label}
      </Typography.Text>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          type="email"
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          placeholder="correo@ejemplo.com"
          prefix={<MailOutlined style={{ color: '#bbb' }} />}
        />
        <Button
          type="primary"
          loading={enviando}
          disabled={!correo.trim()}
          onClick={handleEnviar}
          style={{ background: '#0F6E56', borderColor: '#0F6E56' }}
        >
          Enviar
        </Button>
      </Space.Compact>
      {correoPredeterminado && (
        <Button type="link" size="small" style={{ padding: 0, height: 'auto', marginTop: 2 }}
          onClick={() => setCorreo(correoPredeterminado)}>
          Usar correo del paciente ({correoPredeterminado})
        </Button>
      )}
    </div>
  );
}

function Linea({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function construirHtml(
  c: ComprobanteResponseDTO,
  paciente: string,
  esConsulta: boolean,
  nombreMedico: string | null,
  fechaHoraCita: string | undefined,
  proforma: { items: { descripcion: string; cantidad?: number; precioCongelado: number; estado: string }[] } | undefined,
): string {
  const precioOriginal = (c.montoTotal + (c.descuento ?? 0)).toFixed(2);
  const filasMeta = esConsulta
    ? `<div class="row"><span>Médico</span><span>${nombreMedico ?? '—'}</span></div>
       <div class="row"><span>Fecha de cita</span><span>${fechaHoraCita ? dayjs(fechaHoraCita).format('DD/MM/YYYY HH:mm') : '—'}</span></div>`
    : '';
  const filasDetalle = esConsulta
    ? `<div class="row"><span>Consulta médica</span><span>S/ ${precioOriginal}</span></div>${c.descuento && c.descuento > 0 ? `<div class="row" style="color:#389e0d"><span>Descuento (${c.conceptoDescuento ?? 'Descuento'})</span><span>-S/ ${c.descuento.toFixed(2)}</span></div>` : ''}`
    : (proforma?.items.filter(i => i.estado === 'PAGADO').map(i =>
        `<div class="row"><span>${i.descripcion}${i.cantidad ? ` x${i.cantidad}` : ''}</span><span>S/ ${i.precioCongelado.toFixed(2)}</span></div>`
      ).join('') ?? '');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${c.numero}</title>
<style>body{font-family:monospace;font-size:13px;max-width:360px;margin:24px auto;}
.center{text-align:center}.line{border-top:1px dashed #ccc;margin:10px 0}
.row{display:flex;justify-content:space-between;gap:8px}</style></head>
<body>
<div class="center"><strong>${NOMBRE_CENTRO}</strong><br/><span>${SEDE}</span></div>
<div class="line"></div>
<div class="center"><strong>${esConsulta ? 'BOLETA DE VENTA' : 'BOLETA DE VENTA — PROFORMA'}</strong><br/>${c.numero}</div>
<div class="line"></div>
<div class="row"><span>Fecha de emisión</span><span>${dayjs(c.fechaEmision).format('DD/MM/YYYY HH:mm')}</span></div>
<div class="row"><span>Paciente</span><span>${paciente}</span></div>
${filasMeta}
<div class="line"></div>
${filasDetalle}
<div class="line"></div>
<div class="row"><span>Subtotal (sin IGV)</span><span>S/ ${c.subtotal.toFixed(2)}</span></div>
<div class="row"><span>IGV (18%)</span><span>S/ ${c.igv.toFixed(2)}</span></div>
<div class="line"></div>
<div class="row"><strong>TOTAL</strong><strong>S/ ${c.montoTotal.toFixed(2)}</strong></div>
</body></html>`;
}

function construirHtmlNC(nc: NotaCreditoResponseDTO, paciente: string): string {
  const tag = TIPO_NC_TAG[nc.tipo];
  const retencion = nc.montoRetenido > 0
    ? `<div class="row" style="color:#cf1322"><span>Penalidad retenida</span><span>S/ ${nc.montoRetenido.toFixed(2)}</span></div>`
    : '';
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${nc.numero ?? 'NC'}</title>
<style>body{font-family:monospace;font-size:13px;max-width:360px;margin:24px auto;}
.center{text-align:center}.line{border-top:1px dashed #ccc;margin:10px 0}
.row{display:flex;justify-content:space-between;gap:8px}</style></head>
<body>
<div class="center"><strong>${NOMBRE_CENTRO}</strong><br/><span>${SEDE}</span></div>
<div class="line"></div>
<div class="center"><strong>NOTA DE CRÉDITO</strong><br/>${nc.numero ?? '—'}</div>
<div class="line"></div>
<div class="row"><span>Paciente</span><span>${paciente}</span></div>
<div class="row"><span>Tipo</span><span>${tag?.label ?? nc.tipo}</span></div>
${nc.idComprobanteRelacionado ? `<div class="row"><span>Comprobante origen</span><span>#${nc.idComprobanteRelacionado}</span></div>` : ''}
<div class="line"></div>
<div class="row"><span>Concepto</span><span>${nc.motivo}</span></div>
<div class="line"></div>
${retencion}
<div class="row"><strong>MONTO A DEVOLVER</strong><strong>S/ ${nc.monto.toFixed(2)}</strong></div>
</body></html>`;
}
