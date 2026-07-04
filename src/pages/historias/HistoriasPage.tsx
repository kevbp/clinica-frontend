import { useState } from 'react';
import {
  Alert, Button, Descriptions, Divider, Drawer, Empty,
  Skeleton, Space, Tag, Timeline, Typography, Tooltip, Badge,
} from 'antd';
import {
  CalendarOutlined, ExperimentOutlined, FileTextOutlined,
  MedicineBoxOutlined, PrinterOutlined, SolutionOutlined,
  UserOutlined, WarningOutlined, HeartOutlined, CloseOutlined,
  DownOutlined, UpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { EpisodioClinicoDTO, EpisodioCompletoDTO, SignosVitalesDTO } from '../../types/historias';
import {
  useDisponibilidadHistorias,
  useEpisodioCompleto,
  useEpisodiosPorHistoria,
  useHistoriaPorPaciente,
} from '../../hooks/useHistorias';
import { useNombresMedicamentos } from '../../hooks/useFarmacia';
import { useNombresExamenes } from '../../hooks/useLaboratorio';
import { serviceErrorMessage } from '../../utils/errorUtils';

const { Text } = Typography;

const C = {
  verde: '#0F6E56',
  verdeClaro: '#E8F5F1',
  verdeBorde: '#B2DDD3',
  purpura: '#7C3AED',
  purpuraClaro: '#F5F3FF',
  purpuraBorde: '#DDD6FE',
  borde: '#E8E8E8',
  fondo: '#FAFAFA',
  textoSec: '#6B7280',
  rojo: '#EF4444',
  rojoFondo: '#FEF2F2',
  rojoBorde: '#FECACA',
};

const GRUPO_SG: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  O_POS: 'O+', O_NEG: 'O−', AB_POS: 'AB+', AB_NEG: 'AB−',
};

/* ════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════════════════ */
export default function HistoriasPage() {
  const [paciente, setPaciente] = useState<PacienteResponseDTO | null>(null);
  const [episodioId, setEpisodioId] = useState<string | null>(null);

  const { isError: servicioDown, error: downErr } = useDisponibilidadHistorias();

  const { data: historia, isLoading: loadingHistoria, error: errorHistoria } =
    useHistoriaPorPaciente(paciente?.id ?? null);

  const { data: episodios = [], isLoading: loadingEpisodios } =
    useEpisodiosPorHistoria(historia?.id ?? null);

  const { data: detalle, isLoading: loadingDetalle } =
    useEpisodioCompleto(episodioId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <PageHeader title="Historias Clínicas" />

      {servicioDown && (
        <Alert type="error" showIcon
          message="Servicio de historias no disponible"
          description={serviceErrorMessage(downErr, 'ms-historias-clinicas', 8086)}
        />
      )}

      <BuscadorPaciente
        pacienteSeleccionado={paciente}
        onSeleccionar={p => { setPaciente(p); setEpisodioId(null); }}
      />

      {!paciente && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', borderRadius: 10, border: `1px solid ${C.borde}`, minHeight: 260,
        }}>
          <Empty
            image={<SolutionOutlined style={{ fontSize: 48, color: '#D1D5DB' }} />}
            description={<Text type="secondary">Busque un paciente para ver su historia clínica</Text>}
          />
        </div>
      )}

      {paciente && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {loadingHistoria && <Skeleton active paragraph={{ rows: 4 }} />}

          {errorHistoria && !loadingHistoria && (
            <Alert type="info" showIcon icon={<SolutionOutlined />}
              message={`${paciente.nombres} ${paciente.apellidos} no tiene historia clínica registrada`}
              description="Se crea automáticamente al completar la primera atención médica."
            />
          )}

          {historia && (
            <>
              {/* Cabecera de la historia */}
              <CabeceraHistoria paciente={paciente} historia={historia} totalEpisodios={episodios.length} />

              {loadingEpisodios && <Skeleton active paragraph={{ rows: 6 }} />}

              {!loadingEpisodios && episodios.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin episodios registrados" />
              )}

              {!loadingEpisodios && episodios.length > 0 && (
                <TimelineEpisodios
                  episodios={episodios}
                  episodioActivoId={episodioId}
                  onVerDetalle={setEpisodioId}
                />
              )}
            </>
          )}
        </div>
      )}

      <DetalleDrawer
        open={episodioId !== null}
        detalle={detalle ?? null}
        loading={loadingDetalle}
        codigoHistoria={historia?.codigoHistoria}
        onCerrar={() => setEpisodioId(null)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CABECERA DE LA HISTORIA
════════════════════════════════════════════════════════════════════════ */
function CabeceraHistoria({
  paciente, historia, totalEpisodios,
}: {
  paciente: PacienteResponseDTO;
  historia: { codigoHistoria: string; fechaCreacion: string; estado: string };
  totalEpisodios: number;
}) {
  const edad = paciente.fechaNacimiento
    ? dayjs().diff(dayjs(paciente.fechaNacimiento), 'year')
    : null;

  return (
    <div style={{
      background: `linear-gradient(135deg, #0A3D2E 0%, ${C.verde} 100%)`,
      borderRadius: 12, padding: '16px 20px', color: '#fff',
      display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
    }}>
      {/* Icono + nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserOutlined style={{ fontSize: 20 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {paciente.nombres} {paciente.apellidos}
          </div>
          <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>
            DNI {paciente.documentoIdentidad}
            {edad !== null ? ` · ${edad} años` : ''}
            {paciente.sexo === 'MASCULINO' ? ' · Masculino' : paciente.sexo === 'FEMENINO' ? ' · Femenino' : ''}
          </div>
        </div>
      </div>

      {/* Grupo sanguíneo */}
      {paciente.grupoSanguineo && (
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '6px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>GRUPO</div>
          <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
            <HeartOutlined style={{ fontSize: 13 }} />
            {GRUPO_SG[paciente.grupoSanguineo] ?? paciente.grupoSanguineo}
          </div>
        </div>
      )}

      {/* Código HC + stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>HISTORIA</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{historia.codigoHistoria}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>EPISODIOS</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{totalEpisodios}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>DESDE</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{dayjs(historia.fechaCreacion).format('DD/MM/YYYY')}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>ESTADO</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{historia.estado}</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TIMELINE DE EPISODIOS — tarjetas ricas
════════════════════════════════════════════════════════════════════════ */
function TimelineEpisodios({
  episodios, episodioActivoId, onVerDetalle,
}: {
  episodios: EpisodioClinicoDTO[];
  episodioActivoId: string | null;
  onVerDetalle: (id: string) => void;
}) {
  const ordenados = [...episodios].sort(
    (a, b) => dayjs(b.fechaAtencion).valueOf() - dayjs(a.fechaAtencion).valueOf()
  );

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.borde}`, padding: '24px 28px' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileTextOutlined style={{ color: C.verde, fontSize: 16 }} />
        <Text strong style={{ fontSize: 15 }}>Línea de tiempo clínica</Text>
        <Tag style={{ borderRadius: 10, marginLeft: 4 }}>{episodios.length} episodio{episodios.length !== 1 ? 's' : ''}</Tag>
      </div>

      <Timeline
        items={ordenados.map((ep, idx) => ({
          color: idx === 0 ? C.verde : '#9CA3AF',
          dot: (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: idx === 0 ? C.verde : '#E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: idx === 0 ? '#fff' : C.textoSec, fontWeight: 700,
              border: `2px solid ${idx === 0 ? C.verde : '#D1D5DB'}`,
            }}>
              {ordenados.length - idx}
            </div>
          ),
          children: (
            <TarjetaEpisodio
              ep={ep}
              activo={ep.idEpisodio === episodioActivoId}
              esUltimo={idx === 0}
              onVerDetalle={() => onVerDetalle(ep.idEpisodio)}
            />
          ),
        }))}
      />
    </div>
  );
}

function TarjetaEpisodio({
  ep, activo, esUltimo, onVerDetalle,
}: {
  ep: EpisodioClinicoDTO;
  activo: boolean;
  esUltimo: boolean;
  onVerDetalle: () => void;
}) {
  const [expandido, setExpandido] = useState(esUltimo);
  const sv = ep.signosVitales;

  const signosItems = sv ? [
    { label: 'Peso', value: sv.peso != null ? `${sv.peso} kg` : null },
    { label: 'Talla', value: sv.talla != null ? `${sv.talla} cm` : null },
    { label: 'IMC', value: sv.imc != null ? String(sv.imc) : null, alerta: sv.imc != null && (sv.imc < 18.5 || sv.imc > 29.9) },
    { label: 'P. Arterial', value: sv.presionArterial ? `${sv.presionArterial} mmHg` : null },
    { label: 'F. Cardíaca', value: sv.frecuenciaCardiaca != null ? `${sv.frecuenciaCardiaca} lpm` : null },
    { label: 'F. Resp.', value: sv.frecuenciaRespiratoria != null ? `${sv.frecuenciaRespiratoria} rpm` : null },
    { label: 'SpO₂', value: sv.saturacionOxigeno != null ? `${sv.saturacionOxigeno}%` : null, alerta: sv.saturacionOxigeno != null && sv.saturacionOxigeno < 95 },
    { label: 'Temperatura', value: sv.temperatura != null ? `${sv.temperatura} °C` : null, alerta: sv.temperatura != null && sv.temperatura > 37.5 },
  ].filter(i => i.value !== null) : [];

  return (
    <div style={{
      border: `1px solid ${activo ? C.verdeBorde : C.borde}`,
      borderRadius: 10, overflow: 'hidden',
      background: activo ? C.verdeClaro : '#fff',
      marginBottom: 4,
      transition: 'border-color .15s, background .15s',
    }}>
      {/* Encabezado siempre visible */}
      <div
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          background: activo ? C.verdeClaro : C.fondo,
          borderBottom: expandido ? `1px solid ${activo ? C.verdeBorde : C.borde}` : 'none',
        }}
        onClick={() => setExpandido(v => !v)}
        role="button"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Fecha + médico */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CalendarOutlined style={{ fontSize: 12, color: C.verde }} />
              <Text strong style={{ fontSize: 12, color: C.verde }}>
                {dayjs(ep.fechaAtencion).format('dddd DD [de] MMMM [de] YYYY')}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                · {dayjs(ep.fechaAtencion).format('HH:mm')}
              </Text>
            </div>
          </div>

          {/* Diagnóstico */}
          <Space size={6} wrap>
            <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
              {ep.diagnostico.codigoCie10}
            </Tag>
            {ep.diagnostico.tipoDiagnostico && (
              <Tag
                color={ep.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'success' : 'warning'}
                style={{ margin: 0, fontSize: 11 }}
              >
                {ep.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'Definitivo' : 'Presuntivo'}
              </Tag>
            )}
            <Text strong style={{ fontSize: 13 }}>{ep.diagnostico.descripcion}</Text>
          </Space>

          {/* Médico (preview cuando colapsado) */}
          {!expandido && ep.medico && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Dr. {ep.medico.nombres} {ep.medico.apellidos}
              {ep.medico.especialidad ? ` · ${ep.medico.especialidad}` : ''}
            </Text>
          )}
        </div>

        {/* Botón expandir */}
        <Button
          type="text" size="small"
          icon={expandido ? <UpOutlined /> : <DownOutlined />}
          style={{ color: C.textoSec, flexShrink: 0, marginTop: 2 }}
        />
      </div>

      {/* Cuerpo expandido */}
      {expandido && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Médico */}
          {ep.medico && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: C.textoSec, fontSize: 13 }} />
              <div>
                <Text style={{ fontSize: 13 }}>
                  Dr. {ep.medico.nombres} {ep.medico.apellidos}
                </Text>
                {ep.medico.especialidad && (
                  <Tag style={{ marginLeft: 8, borderRadius: 10, fontSize: 11 }}>
                    {ep.medico.especialidad}
                  </Tag>
                )}
                {ep.medico.numeroColegiatura && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                    CMP {ep.medico.numeroColegiatura}
                  </Text>
                )}
              </div>
            </div>
          )}

          {/* Motivo de consulta */}
          {ep.motivoConsulta && (
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                MOTIVO DE CONSULTA
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 1.7 }}>{ep.motivoConsulta}</Text>
            </div>
          )}

          {/* Signos vitales */}
          {signosItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <HeartOutlined style={{ color: C.textoSec, fontSize: 13 }} />
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                  EXAMEN FÍSICO
                </Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {signosItems.map(item => (
                  <div key={item.label} style={{
                    background: item.alerta ? C.rojoFondo : C.fondo,
                    border: `1px solid ${item.alerta ? C.rojoBorde : C.borde}`,
                    borderRadius: 8, padding: '5px 12px', textAlign: 'center', minWidth: 68,
                  }}>
                    <div style={{ fontSize: 10, color: item.alerta ? C.rojo : C.textoSec, marginBottom: 2 }}>
                      {item.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: item.alerta ? C.rojo : '#111' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones clínicas */}
          {ep.observacionesClinicas && (
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                OBSERVACIONES CLÍNICAS
              </Text>
              <div style={{
                background: C.fondo, border: `1px solid ${C.borde}`,
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, lineHeight: 1.7, color: '#374151',
              }}>
                {ep.observacionesClinicas}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: `1px solid ${C.borde}`, paddingTop: 10, marginTop: 2,
          }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {ep.idEpisodio.slice(-12).toUpperCase()}
            </Text>
            <Tooltip title="Ver receta, órdenes de laboratorio y adendas completas">
              <Button
                size="small" type="primary"
                icon={<FileTextOutlined />}
                onClick={e => { e.stopPropagation(); onVerDetalle(); }}
                style={{ background: C.verde, borderColor: C.verde, fontSize: 12 }}
              >
                Ver episodio completo
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DRAWER DE DETALLE COMPLETO
════════════════════════════════════════════════════════════════════════ */
function DetalleDrawer({
  open, detalle, loading, codigoHistoria, onCerrar,
}: {
  open: boolean;
  detalle: EpisodioCompletoDTO | null;
  loading: boolean;
  codigoHistoria?: string;
  onCerrar: () => void;
}) {
  const idsMed = detalle?.receta?.lineas.map(l => l.idMedicamento) ?? [];
  const idsEx  = detalle?.ordenLaboratorio?.lineas.map(l => l.idExamen) ?? [];
  const nombresMed = useNombresMedicamentos(idsMed);
  const nombresEx  = useNombresExamenes(idsEx);

  const handleImprimir = () => {
    if (!detalle) return;
    const e = detalle;
    const fmt = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm');

    const recetaRows = e.receta?.lineas.map(l => `
      <tr>
        <td>${nombresMed.get(l.idMedicamento) ?? `ID ${l.idMedicamento}`}</td>
        <td>${l.dosis} · ${l.viaAdministracion}</td>
        <td>${l.frecuencia} · ${l.duracion}</td>
        <td style="text-align:center">${l.cantidadTotal}</td>
        <td>${l.indicaciones ?? '—'}</td>
      </tr>`).join('') ?? '';

    const ordenRows = e.ordenLaboratorio?.lineas.map(l => `
      <tr>
        <td>${nombresEx.get(l.idExamen) ?? `ID ${l.idExamen}`}</td>
        <td>${l.indicacionesPreparacion ?? '—'}</td>
      </tr>`).join('') ?? '';

    const svHtml = e.signosVitales ? (() => {
      const sv = e.signosVitales!;
      const items = [
        sv.peso != null ? `<div><div class="lbl">Peso</div><div class="val">${sv.peso} kg</div></div>` : '',
        sv.talla != null ? `<div><div class="lbl">Talla</div><div class="val">${sv.talla} cm</div></div>` : '',
        sv.imc != null ? `<div><div class="lbl">IMC</div><div class="val">${sv.imc}</div></div>` : '',
        sv.presionArterial ? `<div><div class="lbl">P. Arterial</div><div class="val">${sv.presionArterial} mmHg</div></div>` : '',
        sv.frecuenciaCardiaca != null ? `<div><div class="lbl">F. Cardíaca</div><div class="val">${sv.frecuenciaCardiaca} lpm</div></div>` : '',
        sv.frecuenciaRespiratoria != null ? `<div><div class="lbl">F. Resp.</div><div class="val">${sv.frecuenciaRespiratoria} rpm</div></div>` : '',
        sv.saturacionOxigeno != null ? `<div><div class="lbl">SpO₂</div><div class="val">${sv.saturacionOxigeno}%</div></div>` : '',
        sv.temperatura != null ? `<div><div class="lbl">Temperatura</div><div class="val">${sv.temperatura} °C</div></div>` : '',
      ].filter(Boolean).join('');
      return items ? `<h2>Examen Físico</h2><div class="grid">${items}</div>` : '';
    })() : '';

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"><title>Episodio — ${codigoHistoria ?? ''}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:32px;color:#1a1a1a}
        h1{font-size:16px;color:#0F6E56;margin-bottom:4px}
        h2{font-size:13px;color:#0F6E56;border-bottom:1px solid #0F6E56;padding-bottom:4px;margin-top:20px}
        .hdr{display:flex;justify-content:space-between;margin-bottom:16px}
        .codigo{background:#f0faf6;border:1px solid #0F6E56;border-radius:4px;padding:6px 12px;font-weight:bold;color:#0F6E56}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#f5f5f5;padding:6px;text-align:left;font-size:11px}
        td{padding:6px;border-bottom:1px solid #eee}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
        .lbl{color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
        .val{font-weight:500;margin-top:2px}
        .adenda{background:#fffbe6;border-left:3px solid #faad14;padding:8px;margin-top:8px;border-radius:0 4px 4px 0}
        @media print{body{margin:16px}}
      </style></head><body>
      <div class="hdr">
        <div><strong>Centro Médico Esperanza Sur</strong><br><span style="color:#666">Sede Lima Sur</span></div>
        <div class="codigo">${codigoHistoria ?? ''}</div>
      </div>
      <h1>Episodio Clínico — ${fmt(e.fechaAtencion)}</h1>
      ${e.motivoConsulta ? `<p style="margin:4px 0;color:#555"><strong>Motivo:</strong> ${e.motivoConsulta}</p>` : ''}
      <h2>Paciente</h2>
      <div class="grid">
        <div><div class="lbl">Nombre</div><div class="val">${e.paciente?.nombres ?? ''} ${e.paciente?.apellidos ?? ''}</div></div>
        <div><div class="lbl">DNI</div><div class="val">${e.paciente?.documentoIdentidad ?? '—'}</div></div>
        <div><div class="lbl">Nacimiento</div><div class="val">${e.paciente?.fechaNacimiento ? dayjs(e.paciente.fechaNacimiento).format('DD/MM/YYYY') : '—'}</div></div>
      </div>
      <h2>Médico Tratante</h2>
      <div class="grid">
        <div><div class="lbl">Nombre</div><div class="val">Dr. ${e.medico?.nombres ?? ''} ${e.medico?.apellidos ?? ''}</div></div>
        <div><div class="lbl">CMP</div><div class="val">${e.medico?.numeroColegiatura ?? '—'}</div></div>
        <div><div class="lbl">Especialidad</div><div class="val">${e.medico?.especialidad ?? '—'}</div></div>
      </div>
      ${svHtml}
      <h2>Diagnóstico</h2>
      <p><strong>${e.diagnostico.codigoCie10}</strong> — ${e.diagnostico.descripcion}${e.diagnostico.tipoDiagnostico ? ` (${e.diagnostico.tipoDiagnostico})` : ''}</p>
      ${e.observacionesClinicas ? `<p style="color:#555">${e.observacionesClinicas}</p>` : ''}
      ${recetaRows ? `<h2>Receta Médica</h2>
        <table><thead><tr><th>Medicamento</th><th>Dosis · Vía</th><th>Frecuencia · Duración</th><th>Cant.</th><th>Indicaciones</th></tr></thead>
        <tbody>${recetaRows}</tbody></table>` : ''}
      ${ordenRows ? `<h2>Orden de Laboratorio</h2>
        <table><thead><tr><th>Examen</th><th>Preparación</th></tr></thead>
        <tbody>${ordenRows}</tbody></table>` : ''}
      ${(e.adendas?.length ?? 0) > 0 ? `<h2>Adendas</h2>${e.adendas.map(a =>
        `<div class="adenda"><strong>${fmt(a.fechaCorreccion)}</strong><br>${a.textoRectificacion}</div>`
      ).join('')}` : ''}
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Drawer
      open={open}
      onClose={onCerrar}
      closeIcon={<CloseOutlined />}
      width={660}
      title={
        <Space>
          <FileTextOutlined style={{ color: C.verde }} />
          <span>Episodio completo</span>
          {detalle && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(detalle.fechaAtencion).format('DD/MM/YYYY HH:mm')}
            </Text>
          )}
        </Space>
      }
      extra={
        <Tooltip title="Imprimir episodio">
          <Button icon={<PrinterOutlined />} disabled={!detalle || loading} onClick={handleImprimir}>
            Imprimir
          </Button>
        </Tooltip>
      }
    >
      {loading && <Skeleton active paragraph={{ rows: 10 }} />}
      {!loading && detalle && (
        <ContenidoDetalle
          detalle={detalle}
          codigoHistoria={codigoHistoria}
          nombresMed={nombresMed}
          nombresEx={nombresEx}
        />
      )}
    </Drawer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CONTENIDO DEL DRAWER
════════════════════════════════════════════════════════════════════════ */
function ContenidoDetalle({
  detalle, codigoHistoria, nombresMed, nombresEx,
}: {
  detalle: EpisodioCompletoDTO;
  codigoHistoria?: string;
  nombresMed: Map<number, string>;
  nombresEx: Map<number, string>;
}) {
  const sv = detalle.signosVitales;
  const svItems = sv ? [
    { label: 'Peso', valor: sv.peso != null ? `${sv.peso} kg` : null },
    { label: 'Talla', valor: sv.talla != null ? `${sv.talla} cm` : null },
    { label: 'IMC', valor: sv.imc != null ? String(sv.imc) : null, alerta: sv.imc != null && (sv.imc < 18.5 || sv.imc > 29.9) },
    { label: 'P. Arterial', valor: sv.presionArterial ? `${sv.presionArterial} mmHg` : null },
    { label: 'F. Cardíaca', valor: sv.frecuenciaCardiaca != null ? `${sv.frecuenciaCardiaca} lpm` : null },
    { label: 'F. Resp.', valor: sv.frecuenciaRespiratoria != null ? `${sv.frecuenciaRespiratoria} rpm` : null },
    { label: 'SpO₂', valor: sv.saturacionOxigeno != null ? `${sv.saturacionOxigeno}%` : null, alerta: sv.saturacionOxigeno != null && sv.saturacionOxigeno < 95 },
    { label: 'Temperatura', valor: sv.temperatura != null ? `${sv.temperatura} °C` : null, alerta: sv.temperatura != null && sv.temperatura > 37.5 },
  ].filter(i => i.valor !== null) : [];

  const nMeds = detalle.receta?.lineas.length ?? 0;
  const nLabs = detalle.ordenLaboratorio?.lineas.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Cabecera HC + badges */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.verdeClaro, border: `1px solid ${C.verdeBorde}`, borderRadius: 8, padding: '10px 16px',
      }}>
        <Space>
          <SolutionOutlined style={{ color: C.verde }} />
          <Text strong style={{ color: C.verde, fontSize: 15 }}>{codigoHistoria}</Text>
        </Space>
        <Space size={8}>
          {nMeds > 0 && (
            <Badge count={nMeds} style={{ backgroundColor: C.verde }}>
              <Tag icon={<MedicineBoxOutlined />} style={{ marginRight: 0 }}>Receta</Tag>
            </Badge>
          )}
          {nLabs > 0 && (
            <Badge count={nLabs} style={{ backgroundColor: C.purpura }}>
              <Tag icon={<ExperimentOutlined />} color="purple" style={{ marginRight: 0 }}>Lab</Tag>
            </Badge>
          )}
          {(detalle.adendas?.length ?? 0) > 0 && (
            <Badge count={detalle.adendas.length} style={{ backgroundColor: '#F59E0B' }}>
              <Tag color="warning" style={{ marginRight: 0 }}>Adendas</Tag>
            </Badge>
          )}
        </Space>
      </div>

      {/* Paciente */}
      <Bloque icono={<UserOutlined />} titulo="Paciente">
        <Descriptions size="small" column={2} colon={false} labelStyle={{ color: C.textoSec, width: 100 }}>
          <Descriptions.Item label="Nombre">
            {detalle.paciente
              ? `${detalle.paciente.nombres} ${detalle.paciente.apellidos}`
              : `ID ${detalle.idPaciente}`}
          </Descriptions.Item>
          <Descriptions.Item label="DNI">
            {detalle.paciente?.documentoIdentidad ?? '—'}
          </Descriptions.Item>
          {detalle.paciente?.fechaNacimiento && (
            <Descriptions.Item label="Nacimiento">
              {dayjs(detalle.paciente.fechaNacimiento).format('DD/MM/YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Bloque>

      {/* Médico tratante */}
      <Bloque icono={<MedicineBoxOutlined />} titulo="Médico tratante">
        <Descriptions size="small" column={2} colon={false} labelStyle={{ color: C.textoSec, width: 100 }}>
          <Descriptions.Item label="Nombre">
            {detalle.medico
              ? `Dr. ${detalle.medico.nombres} ${detalle.medico.apellidos}`
              : `ID ${detalle.idPersonalMedico}`}
          </Descriptions.Item>
          <Descriptions.Item label="CMP">
            {detalle.medico?.numeroColegiatura ?? '—'}
          </Descriptions.Item>
          {detalle.medico?.especialidad && (
            <Descriptions.Item label="Especialidad">
              {detalle.medico.especialidad}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Bloque>

      {/* Motivo de consulta */}
      {detalle.motivoConsulta && (
        <Bloque icono={<CalendarOutlined />} titulo="Motivo de consulta">
          <Text style={{ lineHeight: 1.7, fontSize: 13 }}>{detalle.motivoConsulta}</Text>
        </Bloque>
      )}

      {/* Signos vitales */}
      {svItems.length > 0 && (
        <Bloque icono={<HeartOutlined />} titulo="Examen físico">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {svItems.map(item => (
              <div key={item.label} style={{
                background: item.alerta ? C.rojoFondo : C.fondo,
                border: `1px solid ${item.alerta ? C.rojoBorde : C.borde}`,
                borderRadius: 8, padding: '6px 14px', textAlign: 'center', minWidth: 72,
              }}>
                <div style={{ fontSize: 10, color: item.alerta ? C.rojo : C.textoSec, marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.alerta ? C.rojo : '#111' }}>
                  {item.valor}
                </div>
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {/* Diagnóstico */}
      <Bloque icono={<FileTextOutlined />} titulo="Diagnóstico">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
              {detalle.diagnostico.codigoCie10}
            </Tag>
            {detalle.diagnostico.tipoDiagnostico && (
              <Tag
                color={detalle.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'success' : 'warning'}
                style={{ margin: 0 }}
              >
                {detalle.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'Definitivo' : 'Presuntivo'}
              </Tag>
            )}
            <Text strong style={{ fontSize: 13 }}>{detalle.diagnostico.descripcion}</Text>
          </Space>
          {detalle.observacionesClinicas && (
            <div style={{
              background: C.fondo, border: `1px solid ${C.borde}`, borderRadius: 8,
              padding: '10px 14px', fontSize: 13, lineHeight: 1.7, color: '#374151',
            }}>
              {detalle.observacionesClinicas}
            </div>
          )}
        </Space>
      </Bloque>

      {/* Receta */}
      {detalle.receta && detalle.receta.lineas.length > 0 && (
        <Bloque icono={<MedicineBoxOutlined style={{ color: C.verde }} />} titulo={`Receta médica (${detalle.receta.lineas.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detalle.receta.lineas.map((l, i) => (
              <div key={i} style={{
                background: C.verdeClaro, border: `1px solid ${C.verdeBorde}`,
                borderRadius: 8, padding: '10px 14px',
              }}>
                <Text strong style={{ fontSize: 13 }}>
                  {nombresMed.get(l.idMedicamento) ?? `Medicamento ID ${l.idMedicamento}`}
                </Text>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#374151' }}>
                  <span><span style={{ color: C.textoSec }}>Dosis:</span> {l.dosis}</span>
                  <span><span style={{ color: C.textoSec }}>Vía:</span> {l.viaAdministracion}</span>
                  <span><span style={{ color: C.textoSec }}>Frecuencia:</span> {l.frecuencia}</span>
                  <span><span style={{ color: C.textoSec }}>Duración:</span> {l.duracion}</span>
                  <span><span style={{ color: C.textoSec }}>Cantidad:</span> {l.cantidadTotal} unidades</span>
                </div>
                {l.indicaciones && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6, fontStyle: 'italic' }}>
                    {l.indicaciones}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {/* Orden de laboratorio */}
      {detalle.ordenLaboratorio && detalle.ordenLaboratorio.lineas.length > 0 && (
        <Bloque icono={<ExperimentOutlined style={{ color: C.purpura }} />} titulo={`Orden de laboratorio (${detalle.ordenLaboratorio.lineas.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detalle.ordenLaboratorio.lineas.map((l, i) => (
              <div key={i} style={{
                background: C.purpuraClaro, border: `1px solid ${C.purpuraBorde}`,
                borderRadius: 8, padding: '10px 14px',
              }}>
                <Text strong style={{ fontSize: 13, color: C.purpura }}>
                  {nombresEx.get(l.idExamen) ?? `Examen ID ${l.idExamen}`}
                </Text>
                {l.indicacionesPreparacion && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Preparación: {l.indicacionesPreparacion}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {/* Adendas */}
      {detalle.adendas?.length > 0 && (
        <Bloque icono={<WarningOutlined style={{ color: '#F59E0B' }} />} titulo="Adendas clínicas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detalle.adendas.map(a => (
              <div key={a.idAdenda} style={{
                borderLeft: '4px solid #F59E0B', background: '#FFFBEB',
                borderRadius: '0 8px 8px 0', padding: '10px 14px',
              }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(a.fechaCorreccion).format('DD/MM/YYYY HH:mm')} · Médico ID {a.idPersonalMedico}
                </Text>
                <div style={{ marginTop: 6, lineHeight: 1.6, fontSize: 13 }}>{a.textoRectificacion}</div>
              </div>
            ))}
          </div>
        </Bloque>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   BLOQUE
════════════════════════════════════════════════════════════════════════ */
function Bloque({ icono, titulo, children }: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Divider orientation="left" orientationMargin={0} style={{ margin: '0 0 12px', color: '#374151' }}>
        <Space size={6}>
          {icono}
          <Text strong style={{ fontSize: 13 }}>{titulo}</Text>
        </Space>
      </Divider>
      {children}
    </div>
  );
}
