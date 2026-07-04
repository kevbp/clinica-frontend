import { useEffect, useState } from 'react';
import { Modal, Button, Typography, Space, Result, Input, App } from 'antd';
import {
  LoadingOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  DownloadOutlined,
  CloseOutlined,
  MailOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as cajaApi from '../../api/caja';
import { useConfirmarPagoConsulta } from '../../hooks/useCaja';
import { extractApiError } from '../../utils/errorUtils';
import type { ComprobanteResponseDTO, PagoConsultaResponseDTO } from '../../types/caja';

const NOMBRE_CENTRO = 'Centro Médico Esperanza Sur';
const SEDE = 'Sede Lima Sur';

type Fase = 'procesando' | 'sin_confirmar' | 'error' | 'boleta' | 'boleta_no_disponible';
type MetodoPago = 'efectivo' | 'tarjeta';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PasarelaPagoModalProps {
  open: boolean;
  pagoId: number | null;
  paciente: string;
  medico: string;
  especialidad?: string;
  fechaHoraCita: string;
  correoPaciente?: string;
  metodo: MetodoPago;
  onClose: () => void;
  onFinalizado: (resultado: PagoConsultaResponseDTO) => void;
}

export default function PasarelaPagoModal({
  open, pagoId, paciente, medico, especialidad, fechaHoraCita, correoPaciente,
  metodo, onClose, onFinalizado,
}: PasarelaPagoModalProps) {
  const { notification } = App.useApp();
  const [fase, setFase] = useState<Fase>('procesando');
  const [mensaje, setMensaje] = useState('Conectando con el sistema de pagos…');
  const [comprobante, setComprobante] = useState<ComprobanteResponseDTO | null>(null);
  const [correoEnvio, setCorreoEnvio] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const confirmarMut = useConfirmarPagoConsulta();

  useEffect(() => {
    if (!open || pagoId === null) return;
    setCorreoEnvio('');
    let cancelado = false;

    async function procesar() {
      setFase('procesando');
      setComprobante(null);

      if (metodo === 'tarjeta') {
        setMensaje('Conectando con el sistema de pagos…');
        await delay(700);
        if (cancelado) return;
        setMensaje('Verificando disponibilidad del cupo…');
        await delay(700);
        if (cancelado) return;
        setMensaje('Procesando transacción con tarjeta…');
        await delay(800);
        if (cancelado) return;
        setMensaje('Registrando el pago…');
        await delay(500);
        if (cancelado) return;
      } else {
        setMensaje('Registrando pago en efectivo…');
        await delay(600);
        if (cancelado) return;
      }

      let resultado: PagoConsultaResponseDTO;
      try {
        resultado = await confirmarMut.mutateAsync(pagoId!);
      } catch {
        if (!cancelado) setFase('error');
        return;
      }
      if (cancelado) return;
      onFinalizado(resultado);

      if (resultado.estado === 'PAGADO_SIN_CONFIRMAR') {
        setFase('sin_confirmar');
        return;
      }

      await cargarBoleta();
    }

    async function cargarBoleta() {
      setMensaje('Generando boleta…');
      try {
        const boleta = await cajaApi.obtenerComprobantePagoConsulta(pagoId!);
        if (cancelado) return;
        setComprobante(boleta);
        setFase('boleta');
      } catch {
        if (!cancelado) setFase('boleta_no_disponible');
      }
    }

    procesar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pagoId]);

  const reintentarBoleta = async () => {
    setFase('procesando');
    setMensaje('Generando boleta…');
    try {
      const boleta = await cajaApi.obtenerComprobantePagoConsulta(pagoId!);
      setComprobante(boleta);
      setFase('boleta');
    } catch {
      setFase('boleta_no_disponible');
    }
  };

  const handleDescargar = () => {
    if (!comprobante) return;
    const html = construirHtmlBoleta(comprobante, paciente, medico, fechaHoraCita, especialidad);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${comprobante.numero}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEnviarCorreo = async () => {
    if (!comprobante || !correoEnvio.trim()) return;
    setEnviandoCorreo(true);
    try {
      await cajaApi.enviarComprobantePorCorreo(comprobante.id, correoEnvio.trim());
      notification.success({ message: 'Correo enviado', description: `Comprobante enviado a ${correoEnvio.trim()}` });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al enviar el correo', description: msg });
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const tituloModal = metodo === 'tarjeta' ? 'Pasarela de pago' : 'Confirmar pago en efectivo';

  return (
    <Modal
      open={open}
      onCancel={fase === 'procesando' ? undefined : onClose}
      closable={fase !== 'procesando'}
      maskClosable={false}
      footer={null}
      width={460}
      centered
      title={fase === 'procesando' ? tituloModal : undefined}
    >
      <style>{`
        @keyframes pasarela-spin { to { transform: rotate(360deg); } }
        @keyframes pasarela-pop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pasarela-card-slide {
          0%   { transform: translateY(8px) rotateX(4deg); opacity: 0; }
          100% { transform: translateY(0) rotateX(0); opacity: 1; }
        }
        .pasarela-icono-procesando { animation: pasarela-spin 1.1s linear infinite; }
        .pasarela-icono-resultado  { animation: pasarela-pop 0.35s ease-out; }
        .pasarela-tarjeta-animada  { animation: pasarela-card-slide 0.4s ease-out; }
        @media print {
          body * { visibility: hidden; }
          #boleta-imprimible, #boleta-imprimible * { visibility: visible; }
          #boleta-imprimible { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {fase === 'procesando' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 8px', gap: 18 }}>
          {metodo === 'tarjeta' ? (
            <TarjetaAnimacion mensaje={mensaje} />
          ) : (
            <>
              <LoadingOutlined className="pasarela-icono-procesando" style={{ fontSize: 36, color: '#0F6E56' }} />
              <Typography.Text strong style={{ fontSize: 14 }}>{mensaje}</Typography.Text>
            </>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>No cierre esta ventana.</Typography.Text>
        </div>
      )}

      {fase === 'sin_confirmar' && (
        <Result
          icon={<ExclamationCircleFilled className="pasarela-icono-resultado" style={{ color: '#faad14' }} />}
          status="warning"
          title="Pago registrado, pero la cita no pudo confirmarse"
          subTitle="Esto requiere revisión manual del área administrativa. El monto ya quedó registrado en el sistema."
          extra={<Button type="primary" onClick={onClose}>Entendido</Button>}
        />
      )}

      {fase === 'error' && (
        <Result
          status="error"
          title="No se pudo procesar el pago"
          subTitle="Intente nuevamente. Si el problema persiste, contacte al área de soporte."
          extra={<Button type="primary" onClick={onClose}>Cerrar</Button>}
        />
      )}

      {fase === 'boleta_no_disponible' && (
        <Result
          icon={<CheckCircleFilled className="pasarela-icono-resultado" style={{ color: '#0F6E56' }} />}
          status="success"
          title="Pago confirmado"
          subTitle="El pago se registró correctamente, pero no se pudo cargar la boleta para previsualizarla. Puede consultarla en Comprobantes."
          extra={
            <Space>
              <Button onClick={reintentarBoleta}>Reintentar</Button>
              <Button type="primary" onClick={onClose}>Salir</Button>
            </Space>
          }
        />
      )}

      {fase === 'boleta' && comprobante && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Encabezado de éxito */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 2px' }}>
            <CheckCircleFilled className="pasarela-icono-resultado" style={{ fontSize: 28, color: '#0F6E56' }} />
            <div>
              <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>Pago confirmado exitosamente</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(comprobante.fechaEmision).format('DD/MM/YYYY HH:mm')} · {comprobante.numero}
              </Typography.Text>
            </div>
          </div>

          {/* Vista rápida de la boleta */}
          <div
            id="boleta-imprimible"
            style={{
              border: '1px dashed #d9d9d9', borderRadius: 8, padding: '16px 18px',
              background: '#FAFAFA', fontFamily: 'monospace', fontSize: 12.5,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>{NOMBRE_CENTRO}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{SEDE}</Typography.Text>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <Typography.Text strong style={{ fontSize: 12 }}>BOLETA DE VENTA</Typography.Text>
              <Typography.Text style={{ fontSize: 12, display: 'block' }}>{comprobante.numero}</Typography.Text>
            </div>
            <FilaBoleta label="Fecha de emisión" value={dayjs(comprobante.fechaEmision).format('DD/MM/YYYY HH:mm')} />
            <FilaBoleta label="Paciente" value={paciente} />
            <FilaBoleta label="Médico" value={medico} />
            {especialidad && <FilaBoleta label="Especialidad" value={especialidad} />}
            <FilaBoleta label="Fecha de cita" value={dayjs(fechaHoraCita).format('DD/MM/YYYY HH:mm')} />
            <FilaBoleta label="Concepto" value="Consulta médica" />
            {comprobante.descuento != null && comprobante.descuento > 0 && (
              <>
                <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
                <FilaBoleta label="Precio del servicio" value={`S/ ${(comprobante.montoTotal + comprobante.descuento).toFixed(2)}`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: '#389e0d' }}>Descuento ({comprobante.conceptoDescuento ?? 'Descuento'})</span>
                  <span style={{ color: '#389e0d' }}>-S/ {comprobante.descuento.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />
            <FilaBoleta label="Subtotal (sin IGV)" value={`S/ ${comprobante.subtotal.toFixed(2)}`} />
            <FilaBoleta label="IGV (18%)" value={`S/ ${comprobante.igv.toFixed(2)}`} />
            <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>TOTAL</Typography.Text>
              <Typography.Text strong style={{ fontSize: 13 }}>S/ {comprobante.montoTotal.toFixed(2)}</Typography.Text>
            </div>
          </div>

          {/* Enviar por correo */}
          <div style={{ background: '#f0f7f4', border: '1px solid #b7e3d4', borderRadius: 8, padding: '12px 14px' }}>
            <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              <MailOutlined style={{ marginRight: 6 }} />
              Enviar comprobante por correo
            </Typography.Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="correo@ejemplo.com"
                value={correoEnvio}
                onChange={e => setCorreoEnvio(e.target.value)}
                size="small"
                prefix={<MailOutlined style={{ color: '#aaa' }} />}
              />
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                loading={enviandoCorreo}
                disabled={!correoEnvio.trim()}
                onClick={handleEnviarCorreo}
              >
                Enviar
              </Button>
            </Space.Compact>
            {correoPaciente && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', marginTop: 4, cursor: 'pointer', color: '#1677ff' }}
                onClick={() => setCorreoEnvio(correoPaciente)}
              >
                Usar correo del paciente ({correoPaciente})
              </Typography.Text>
            )}
          </div>

          {/* Acciones */}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button icon={<DownloadOutlined />} onClick={handleDescargar}>Descargar</Button>
            <Button icon={<CloseOutlined />} type="primary" onClick={onClose}>Cerrar</Button>
          </Space>
        </div>
      )}
    </Modal>
  );
}

function FilaBoleta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '55%', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function TarjetaAnimacion({ mensaje }: { mensaje: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Tarjeta animada */}
      <div
        className="pasarela-tarjeta-animada"
        style={{
          width: 240, height: 148, borderRadius: 14,
          background: 'linear-gradient(135deg, #0F6E56 0%, #0a4a3a 60%, #0d2a22 100%)',
          boxShadow: '0 8px 24px rgba(15,110,86,0.35)',
          position: 'relative', overflow: 'hidden', padding: '18px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}
      >
        {/* Chip */}
        <div style={{
          width: 32, height: 24, borderRadius: 4,
          background: 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #b8960c 100%)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
        {/* Número oculto */}
        <Typography.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, letterSpacing: 4, fontFamily: 'monospace' }}>
          •••• •••• •••• ••••
        </Typography.Text>
        {/* Marca de onda decorativa */}
        <div style={{
          position: 'absolute', right: -20, top: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{
          position: 'absolute', right: 10, top: 10,
          width: 70, height: 70, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
      </div>
      {/* Indicador de procesamiento */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LoadingOutlined className="pasarela-icono-procesando" style={{ fontSize: 20, color: '#0F6E56' }} />
        <Typography.Text strong style={{ fontSize: 13 }}>{mensaje}</Typography.Text>
      </div>
    </div>
  );
}

function construirHtmlBoleta(c: ComprobanteResponseDTO, paciente: string, medico: string, fechaHoraCita: string, especialidad?: string): string {
  const filaEspecialidad = especialidad ? `<div class="row"><span>Especialidad</span><span>${especialidad}</span></div>` : '';
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${c.numero}</title>
<style>body{font-family:monospace;font-size:13px;max-width:360px;margin:24px auto;}
.center{text-align:center}.line{border-top:1px dashed #ccc;margin:10px 0}
.row{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}</style></head>
<body>
<div class="center"><strong>${NOMBRE_CENTRO}</strong><br/><span>${SEDE}</span></div>
<div class="line"></div>
<div class="center"><strong>BOLETA DE VENTA</strong><br/>${c.numero}</div>
<div class="line"></div>
<div class="row"><span>Fecha de emisión</span><span>${dayjs(c.fechaEmision).format('DD/MM/YYYY HH:mm')}</span></div>
<div class="row"><span>Paciente</span><span>${paciente}</span></div>
<div class="row"><span>Médico</span><span>${medico}</span></div>
${filaEspecialidad}
<div class="row"><span>Fecha de cita</span><span>${dayjs(fechaHoraCita).format('DD/MM/YYYY HH:mm')}</span></div>
<div class="row"><span>Concepto</span><span>Consulta médica</span></div>
${c.descuento && c.descuento > 0 ? `<div class="line"></div><div class="row"><span>Precio del servicio</span><span>S/ ${(c.montoTotal + c.descuento).toFixed(2)}</span></div><div class="row" style="color:#389e0d"><span>Descuento (${c.conceptoDescuento ?? 'Descuento'})</span><span>-S/ ${c.descuento.toFixed(2)}</span></div>` : ''}
<div class="line"></div>
<div class="row"><span>Subtotal (sin IGV)</span><span>S/ ${c.subtotal.toFixed(2)}</span></div>
<div class="row"><span>IGV (18%)</span><span>S/ ${c.igv.toFixed(2)}</span></div>
<div class="line"></div>
<div class="row"><strong>TOTAL</strong><strong>S/ ${c.montoTotal.toFixed(2)}</strong></div>
</body></html>`;
}
