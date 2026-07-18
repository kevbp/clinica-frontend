import { useState } from 'react';
import {
  Alert, Button, Descriptions, Divider, Drawer, Empty, Modal,
  Skeleton, Space, Tag, Tabs, Timeline, Typography, Tooltip, Badge, Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined, ExperimentOutlined, FileTextOutlined,
  MedicineBoxOutlined, PrinterOutlined, SolutionOutlined,
  UserOutlined, WarningOutlined, HeartOutlined, CloseOutlined,
  DownOutlined, UpOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { EpisodioClinicoDTO, EpisodioCompletoDTO, RecetaDTO, OrdenLaboratorioDTO } from '../../types/historias';
import {
  useDisponibilidadHistorias,
  useEpisodioCompleto,
  useEpisodiosPorHistoria,
  useHistoriaPorPaciente,
  useRecetasPorPaciente,
  useOrdenesPorPaciente,
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
  const [tabActiva, setTabActiva] = useState('historias');

  // Tab Historias
  const [paciente, setPaciente] = useState<PacienteResponseDTO | null>(null);
  const [episodioId, setEpisodioId] = useState<string | null>(null);

  // Tab Recetas
  const [pacienteRecetas, setPacienteRecetas] = useState<PacienteResponseDTO | null>(null);
  const [recetaModal, setRecetaModal] = useState<RecetaDTO | null>(null);

  // Tab Órdenes
  const [pacienteOrdenes, setPacienteOrdenes] = useState<PacienteResponseDTO | null>(null);
  const [ordenModal, setOrdenModal] = useState<OrdenLaboratorioDTO | null>(null);

  const { isError: servicioDown, error: downErr } = useDisponibilidadHistorias();

  const handleVerEpisodio = (id: string) => {
    setEpisodioId(id);
  };

  const { data: historia, isLoading: loadingHistoria, error: errorHistoria } =
    useHistoriaPorPaciente(paciente?.id ?? null);
  const { data: episodios = [], isLoading: loadingEpisodios } =
    useEpisodiosPorHistoria(historia?.id ?? null);
  const { data: detalle, isLoading: loadingDetalle } =
    useEpisodioCompleto(episodioId);

  const { data: recetas = [], isLoading: cargandoRecetas } =
    useRecetasPorPaciente(pacienteRecetas?.id ?? null);
  const { data: ordenes = [], isLoading: cargandoOrdenes } =
    useOrdenesPorPaciente(pacienteOrdenes?.id ?? null);

  // Nombres para tab recetas y órdenes
  const todosIdsMed = recetas.flatMap(r => r.lineas.map(l => l.idMedicamento));
  const todosIdsEx  = ordenes.flatMap(o => o.lineas.map(l => l.idExamen));
  const nombresMedTab = useNombresMedicamentos(todosIdsMed);
  const nombresExTab  = useNombresExamenes(todosIdsEx);

  const columnasRecetas: ColumnsType<RecetaDTO> = [
    {
      title: 'ID Receta', dataIndex: 'idReceta', key: 'idReceta',
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }} type="secondary">
          {v.slice(-12).toUpperCase()}
        </Text>
      ),
    },
    {
      title: 'Episodio', dataIndex: 'idEpisodioClinico', key: 'episodio',
      render: (v: string) => (
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>{v.slice(-8)}</Text>
      ),
    },
    {
      title: 'Medicamentos', key: 'meds',
      render: (_: unknown, r: RecetaDTO) => (
        <Space direction="vertical" size={2}>
          {r.lineas.slice(0, 2).map((l, i) => (
            <Text key={i} style={{ fontSize: 12 }}>
              {l.nombreMedicamento ?? nombresMedTab.get(l.idMedicamento) ?? `ID ${l.idMedicamento}`}
            </Text>
          ))}
          {r.lineas.length > 2 && (
            <Text type="secondary" style={{ fontSize: 11 }}>+{r.lineas.length - 2} más</Text>
          )}
        </Space>
      ),
    },
    {
      title: '', key: 'accion', width: 100,
      render: (_: unknown, r: RecetaDTO) => (
        <Button size="small" icon={<FileDoneOutlined />} onClick={() => setRecetaModal(r)}>
          Ver receta
        </Button>
      ),
    },
  ];

  const columnasOrdenes: ColumnsType<OrdenLaboratorioDTO> = [
    {
      title: 'ID Orden', dataIndex: 'idOrden', key: 'idOrden',
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }} type="secondary">
          {v.slice(-12).toUpperCase()}
        </Text>
      ),
    },
    {
      title: 'Episodio', dataIndex: 'idEpisodioClinico', key: 'episodio',
      render: (v: string) => (
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>{v.slice(-8)}</Text>
      ),
    },
    {
      title: 'Exámenes', key: 'exams',
      render: (_: unknown, o: OrdenLaboratorioDTO) => (
        <Space direction="vertical" size={2}>
          {o.lineas.slice(0, 2).map((l, i) => (
            <Text key={i} style={{ fontSize: 12 }}>
              {l.nombreExamen ?? nombresExTab.get(l.idExamen) ?? `ID ${l.idExamen}`}
            </Text>
          ))}
          {o.lineas.length > 2 && (
            <Text type="secondary" style={{ fontSize: 11 }}>+{o.lineas.length - 2} más</Text>
          )}
        </Space>
      ),
    },
    {
      title: '', key: 'accion', width: 100,
      render: (_: unknown, o: OrdenLaboratorioDTO) => (
        <Button size="small" icon={<ExperimentOutlined />} onClick={() => setOrdenModal(o)}>
          Ver orden
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <PageHeader title="Historias Clínicas" />

      {servicioDown && (
        <Alert type="error" showIcon
          message="Servicio de historias no disponible"
          description={serviceErrorMessage(downErr, 'ms-historias-clinicas', 8086)}
        />
      )}

      <Tabs
        activeKey={tabActiva}
        onChange={k => setTabActiva(k)}
        items={[
          /* ──────── TAB 1: HISTORIAS ──────── */
          {
            key: 'historias',
            label: <Space><SolutionOutlined />Historias clínicas</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <BuscadorPaciente
                  pacienteSeleccionado={paciente}
                  onSeleccionar={p => { setPaciente(p); setEpisodioId(null); }}
                />

                {!paciente && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#fff', borderRadius: 10, border: `1px solid ${C.borde}`, minHeight: 220,
                  }}>
                    <Empty
                      image={<SolutionOutlined style={{ fontSize: 48, color: '#D1D5DB' }} />}
                      description={<Text type="secondary">Busque un paciente para ver su historia clínica</Text>}
                    />
                  </div>
                )}

                {paciente && loadingHistoria && <Skeleton active paragraph={{ rows: 4 }} />}

                {paciente && errorHistoria && !loadingHistoria && (
                  <Alert type="info" showIcon icon={<SolutionOutlined />}
                    message={`${paciente.nombres} ${paciente.apellidos} no tiene historia clínica registrada`}
                    description="Se crea automáticamente al completar la primera atención médica."
                  />
                )}

                {paciente && historia && (
                  <>
                    <CabeceraHistoria paciente={paciente} historia={historia} totalEpisodios={episodios.length} />

                    {loadingEpisodios && <Skeleton active paragraph={{ rows: 6 }} />}

                    {!loadingEpisodios && episodios.length === 0 && (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin episodios registrados" />
                    )}

                    {!loadingEpisodios && episodios.length > 0 && (
                      <TimelineEpisodios
                        episodios={episodios}
                        episodioActivoId={episodioId}
                        onVerDetalle={handleVerEpisodio}
                      />
                    )}
                  </>
                )}
              </div>
            ),
          },

          /* ──────── TAB 2: RECETAS ──────── */
          {
            key: 'recetas',
            label: <Space><MedicineBoxOutlined />Buscar recetas</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ maxWidth: 480 }}>
                  <BuscadorPaciente
                    pacienteSeleccionado={pacienteRecetas}
                    onSeleccionar={setPacienteRecetas}
                    placeholder="Buscar paciente para ver sus recetas"
                  />
                </div>

                {!pacienteRecetas && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Seleccione un paciente para ver sus recetas médicas" />
                )}

                {pacienteRecetas && (
                  <>
                    <Alert type="info" showIcon
                      message={
                        <span>
                          Recetas de <Text strong>{pacienteRecetas.nombres} {pacienteRecetas.apellidos}</Text>
                          {' '}— {recetas.length} receta{recetas.length !== 1 ? 's' : ''}
                        </span>
                      }
                    />
                    <Table
                      dataSource={recetas}
                      rowKey="idReceta"
                      columns={columnasRecetas}
                      loading={cargandoRecetas}
                      pagination={{ pageSize: 15 }}
                      locale={{ emptyText: 'Este paciente no tiene recetas registradas' }}
                    />
                  </>
                )}
              </div>
            ),
          },

          /* ──────── TAB 3: ÓRDENES ──────── */
          {
            key: 'ordenes',
            label: <Space><ExperimentOutlined />Buscar órdenes de laboratorio</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ maxWidth: 480 }}>
                  <BuscadorPaciente
                    pacienteSeleccionado={pacienteOrdenes}
                    onSeleccionar={setPacienteOrdenes}
                    placeholder="Buscar paciente para ver sus órdenes de laboratorio"
                  />
                </div>

                {!pacienteOrdenes && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Seleccione un paciente para ver sus órdenes de laboratorio" />
                )}

                {pacienteOrdenes && (
                  <>
                    <Alert type="info" showIcon
                      message={
                        <span>
                          Órdenes de <Text strong>{pacienteOrdenes.nombres} {pacienteOrdenes.apellidos}</Text>
                          {' '}— {ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}
                        </span>
                      }
                    />
                    <Table
                      dataSource={ordenes}
                      rowKey="idOrden"
                      columns={columnasOrdenes}
                      loading={cargandoOrdenes}
                      pagination={{ pageSize: 15 }}
                      locale={{ emptyText: 'Este paciente no tiene órdenes registradas' }}
                    />
                  </>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Drawer episodio completo (Tab 1) */}
      <DetalleDrawer
        open={episodioId !== null}
        detalle={detalle ?? null}
        loading={loadingDetalle}
        codigoHistoria={historia?.codigoHistoria}
        onCerrar={() => setEpisodioId(null)}
      />

      {/* Modal receta (Tab 2) */}
      {recetaModal && (
        <RecetaDocumentoModal
          receta={recetaModal}
          paciente={pacienteRecetas}
          nombresMed={nombresMedTab}
          open={true}
          onCerrar={() => setRecetaModal(null)}
        />
      )}

      {/* Modal orden (Tab 3) */}
      {ordenModal && (
        <OrdenDocumentoModal
          orden={ordenModal}
          paciente={pacienteOrdenes}
          nombresEx={nombresExTab}
          open={true}
          onCerrar={() => setOrdenModal(null)}
        />
      )}
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

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'HISTORIA', valor: historia.codigoHistoria },
          { label: 'EPISODIOS', valor: String(totalEpisodios) },
          { label: 'DESDE', valor: dayjs(historia.fechaCreacion).format('DD/MM/YYYY') },
          { label: 'ESTADO', valor: historia.estado },
        ].map(({ label, valor }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{valor}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TIMELINE DE EPISODIOS
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <CalendarOutlined style={{ fontSize: 12, color: C.verde }} />
            <Text strong style={{ fontSize: 12, color: C.verde }}>
              {dayjs(ep.fechaAtencion).format('dddd DD [de] MMMM [de] YYYY')}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · {dayjs(ep.fechaAtencion).format('HH:mm')}
            </Text>
          </div>
          <Space size={6} wrap>
            <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
              {ep.diagnostico.codigoCie10}
            </Tag>
            {ep.diagnostico.tipoDiagnostico && (
              <Tag color={ep.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'success' : 'warning'} style={{ margin: 0, fontSize: 11 }}>
                {ep.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'Definitivo' : 'Presuntivo'}
              </Tag>
            )}
            <Text strong style={{ fontSize: 13 }}>{ep.diagnostico.descripcion}</Text>
          </Space>
          {!expandido && ep.medico && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Dr. {ep.medico.nombres} {ep.medico.apellidos}
              {ep.medico.especialidad ? ` · ${ep.medico.especialidad}` : ''}
            </Text>
          )}
        </div>
        <Button type="text" size="small" icon={expandido ? <UpOutlined /> : <DownOutlined />}
          style={{ color: C.textoSec, flexShrink: 0, marginTop: 2 }} />
      </div>

      {expandido && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ep.medico && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: C.textoSec, fontSize: 13 }} />
              <div>
                <Text style={{ fontSize: 13 }}>Dr. {ep.medico.nombres} {ep.medico.apellidos}</Text>
                {ep.medico.especialidad && (
                  <Tag style={{ marginLeft: 8, borderRadius: 10, fontSize: 11 }}>{ep.medico.especialidad}</Tag>
                )}
                {ep.medico.numeroColegiatura && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>CMP {ep.medico.numeroColegiatura}</Text>
                )}
              </div>
            </div>
          )}

          {ep.motivoConsulta && (
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                MOTIVO DE CONSULTA
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 1.7 }}>{ep.motivoConsulta}</Text>
            </div>
          )}

          {signosItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <HeartOutlined style={{ color: C.textoSec, fontSize: 13 }} />
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>EXAMEN FÍSICO</Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {signosItems.map(item => (
                  <div key={item.label} style={{
                    background: item.alerta ? C.rojoFondo : C.fondo,
                    border: `1px solid ${item.alerta ? C.rojoBorde : C.borde}`,
                    borderRadius: 8, padding: '5px 12px', textAlign: 'center', minWidth: 68,
                  }}>
                    <div style={{ fontSize: 10, color: item.alerta ? C.rojo : C.textoSec, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: item.alerta ? C.rojo : '#111' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ep.observacionesClinicas && (
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                OBSERVACIONES CLÍNICAS
              </Text>
              <div style={{
                background: C.fondo, border: `1px solid ${C.borde}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.7, color: '#374151',
              }}>
                {ep.observacionesClinicas}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: `1px solid ${C.borde}`, paddingTop: 10, marginTop: 2,
          }}>
            <Text type="secondary" style={{ fontSize: 11 }}>ID: {ep.idEpisodio.slice(-12).toUpperCase()}</Text>
            <Tooltip title="Ver receta, órdenes de laboratorio y adendas completas">
              <Button size="small" type="primary" icon={<FileTextOutlined />}
                onClick={e => { e.stopPropagation(); onVerDetalle(); }}
                style={{ background: C.verde, borderColor: C.verde, fontSize: 12 }}>
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
        <td>${l.nombreMedicamento ?? nombresMed.get(l.idMedicamento) ?? `ID ${l.idMedicamento}`}</td>
        <td>${l.dosis} · ${l.viaAdministracion}</td>
        <td>${l.frecuencia} · ${l.duracion}</td>
        <td style="text-align:center">${l.cantidadTotal}</td>
        <td>${l.indicaciones ?? '—'}</td>
      </tr>`).join('') ?? '';

    const ordenRows = e.ordenLaboratorio?.lineas.map(l => `
      <tr>
        <td>${l.nombreExamen ?? nombresEx.get(l.idExamen) ?? `ID ${l.idExamen}`}</td>
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
  const [recetaOpen, setRecetaOpen] = useState(false);
  const [ordenOpen, setOrdenOpen] = useState(false);

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
          <Descriptions.Item label="DNI">{detalle.paciente?.documentoIdentidad ?? '—'}</Descriptions.Item>
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
          <Descriptions.Item label="CMP">{detalle.medico?.numeroColegiatura ?? '—'}</Descriptions.Item>
          {detalle.medico?.especialidad && (
            <Descriptions.Item label="Especialidad">{detalle.medico.especialidad}</Descriptions.Item>
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
                <div style={{ fontSize: 10, color: item.alerta ? C.rojo : C.textoSec, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.alerta ? C.rojo : '#111' }}>{item.valor}</div>
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
              <Tag color={detalle.diagnostico.tipoDiagnostico === 'DEFINITIVO' ? 'success' : 'warning'} style={{ margin: 0 }}>
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

      {/* Receta — botón documento */}
      {nMeds > 0 && (
        <Bloque icono={<MedicineBoxOutlined style={{ color: C.verde }} />} titulo="Receta médica">
          <Button
            type="default"
            icon={<FileDoneOutlined />}
            style={{ borderColor: C.verde, color: C.verde }}
            onClick={() => setRecetaOpen(true)}
          >
            Ver receta médica ({nMeds} medicamento{nMeds !== 1 ? 's' : ''})
          </Button>
        </Bloque>
      )}

      {/* Orden de laboratorio — botón documento */}
      {nLabs > 0 && (
        <Bloque icono={<ExperimentOutlined style={{ color: C.purpura }} />} titulo="Orden de laboratorio">
          <Button
            type="default"
            icon={<ExperimentOutlined />}
            style={{ borderColor: C.purpura, color: C.purpura }}
            onClick={() => setOrdenOpen(true)}
          >
            Ver orden de laboratorio ({nLabs} examen{nLabs !== 1 ? 'es' : ''})
          </Button>
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

      {/* Modales de documento */}
      {detalle.receta && (
        <RecetaDocumentoModal
          receta={detalle.receta}
          paciente={detalle.paciente ? {
            id: detalle.idPaciente,
            nombres: detalle.paciente.nombres,
            apellidos: detalle.paciente.apellidos,
            documentoIdentidad: detalle.paciente.documentoIdentidad,
            fechaNacimiento: detalle.paciente.fechaNacimiento,
          } as PacienteResponseDTO : null}
          medicoNombre={detalle.medico ? `Dr. ${detalle.medico.nombres} ${detalle.medico.apellidos}` : undefined}
          medicoCmp={detalle.medico?.numeroColegiatura}
          medicoEspecialidad={detalle.medico?.especialidad}
          fechaAtencion={detalle.fechaAtencion}
          codigoHistoria={codigoHistoria}
          nombresMed={nombresMed}
          open={recetaOpen}
          onCerrar={() => setRecetaOpen(false)}
        />
      )}

      {detalle.ordenLaboratorio && (
        <OrdenDocumentoModal
          orden={detalle.ordenLaboratorio}
          paciente={detalle.paciente ? {
            id: detalle.idPaciente,
            nombres: detalle.paciente.nombres,
            apellidos: detalle.paciente.apellidos,
            documentoIdentidad: detalle.paciente.documentoIdentidad,
            fechaNacimiento: detalle.paciente.fechaNacimiento,
          } as PacienteResponseDTO : null}
          medicoNombre={detalle.medico ? `Dr. ${detalle.medico.nombres} ${detalle.medico.apellidos}` : undefined}
          medicoCmp={detalle.medico?.numeroColegiatura}
          medicoEspecialidad={detalle.medico?.especialidad}
          fechaAtencion={detalle.fechaAtencion}
          codigoHistoria={codigoHistoria}
          nombresEx={nombresEx}
          open={ordenOpen}
          onCerrar={() => setOrdenOpen(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MODAL RECETA MÉDICA — DOCUMENTO
════════════════════════════════════════════════════════════════════════ */
function RecetaDocumentoModal({
  receta, paciente: pacienteProp, medicoNombre: medicoNombreProp, medicoCmp: medicoCmpProp,
  medicoEspecialidad: medicoEspecialidadProp, fechaAtencion: fechaAtencionProp,
  codigoHistoria, nombresMed, open, onCerrar,
}: {
  receta: RecetaDTO;
  paciente?: PacienteResponseDTO | null;
  medicoNombre?: string;
  medicoCmp?: string;
  medicoEspecialidad?: string;
  fechaAtencion?: string;
  codigoHistoria?: string;
  nombresMed: Map<number, string>;
  open: boolean;
  onCerrar: () => void;
}) {
  // Preferir datos embebidos en la receta; caer a props cuando vienen del drawer (EpisodioCompleto)
  const snap = receta.paciente;
  const medicoSnap = receta.medico;
  const paciente = snap
    ? { nombres: snap.nombres, apellidos: snap.apellidos, documentoIdentidad: snap.documentoIdentidad, fechaNacimiento: snap.fechaNacimiento } as PacienteResponseDTO
    : pacienteProp ?? null;
  const medicoNombre = medicoSnap ? `Dr. ${medicoSnap.nombres} ${medicoSnap.apellidos}` : medicoNombreProp;
  const medicoCmp = medicoSnap?.numeroColegiatura ?? medicoCmpProp;
  const medicoEspecialidad = medicoSnap?.especialidad ?? medicoEspecialidadProp;
  const fechaAtencion = receta.fechaEmision ?? fechaAtencionProp;
  const imprimir = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const filas = receta.lineas.map((l, i) => `
      <tr>
        <td style="width:36px;text-align:center;color:#0F6E56;font-weight:700;font-size:14px">Rp.</td>
        <td>
          <strong>${l.nombreMedicamento ?? nombresMed.get(l.idMedicamento) ?? `ID ${l.idMedicamento}`}</strong>
          ${l.principioActivo ? `<br><small style="color:#666">${l.principioActivo}${l.presentacion ? ' · ' + l.presentacion : ''}</small>` : ''}
          <br><span style="color:#555;font-size:11px">${l.dosis} &nbsp;·&nbsp; ${l.viaAdministracion} &nbsp;·&nbsp; ${l.frecuencia} &nbsp;·&nbsp; ${l.duracion}</span>
          ${l.indicaciones ? `<br><em style="color:#777;font-size:11px">${l.indicaciones}</em>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;white-space:nowrap">${l.cantidadTotal} uds.</td>
      </tr>
      ${i < receta.lineas.length - 1 ? '<tr><td colspan="3" style="padding:2px 0;border:none"><hr style="border:none;border-top:1px dashed #ddd;margin:0"></td></tr>' : ''}`).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Receta — ${receta.idReceta.slice(-12).toUpperCase()}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;margin:0;padding:32px;color:#1a1a1a;background:#fff}
        .banda{height:8px;background:linear-gradient(90deg,#0A3D2E,#0F6E56);margin:-32px -32px 0;margin-bottom:0}
        .membrete{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0 12px;border-bottom:1px solid #ddd;margin-bottom:14px}
        .clinica{font-size:15px;font-weight:700;color:#0A3D2E}
        .clinica-sub{font-size:11px;color:#666;margin-top:2px}
        .tipo-doc{background:#0F6E56;color:#fff;padding:7px 18px;border-radius:20px;font-weight:700;font-size:13px;letter-spacing:.5px}
        .n-doc{background:#E8F5F1;border:1px solid #B2DDD3;border-radius:4px;padding:4px 10px;font-family:monospace;font-weight:700;font-size:11px;color:#0F6E56;margin-top:6px;text-align:right}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ddd;border-radius:6px;overflow:hidden;margin-bottom:14px}
        .cell{padding:7px 12px;border-right:1px solid #ddd;border-bottom:1px solid #ddd}
        .cell:nth-child(even){border-right:none}
        .cell:nth-last-child(-n+2){border-bottom:none}
        .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:2px}
        .val{font-size:12px;color:#1a1a1a}
        .seccion{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#0F6E56;padding:6px 0 4px;border-bottom:2px solid #0F6E56;margin-bottom:10px}
        table.rx{width:100%;border-collapse:collapse}
        table.rx td{padding:8px 4px;vertical-align:top}
        .firma-area{margin-top:36px;display:flex;justify-content:flex-end}
        .firma-box{text-align:center;min-width:200px}
        .firma-linea{border-top:1px solid #999;padding-top:6px;margin-top:28px}
        .firma-nombre{font-weight:700;font-size:12px}
        .firma-cmp{color:#666;font-size:10px;margin-top:2px}
        @media print{body{padding:20px}.banda{margin:-20px -20px 0}}
      </style></head><body>
      <div class="banda"></div>
      <div class="membrete">
        <div>
          <div class="clinica">Centro Médico Esperanza Sur</div>
          <div class="clinica-sub">Sede Lima Sur &nbsp;·&nbsp; Lima, Perú</div>
        </div>
        <div style="text-align:right">
          <div class="tipo-doc">RECETA MÉDICA</div>
          ${codigoHistoria ? `<div class="n-doc">${codigoHistoria}</div>` : ''}
        </div>
      </div>
      <div class="grid2">
        <div class="cell"><div class="lbl">Paciente</div><div class="val"><strong>${paciente ? `${paciente.nombres} ${paciente.apellidos}` : `ID ${receta.idPaciente}`}</strong></div></div>
        <div class="cell"><div class="lbl">D.N.I.</div><div class="val">${paciente?.documentoIdentidad ?? '—'}</div></div>
        ${paciente?.fechaNacimiento ? `<div class="cell"><div class="lbl">Fecha de nacimiento</div><div class="val">${dayjs(paciente.fechaNacimiento).format('DD/MM/YYYY')}</div></div>` : '<div class="cell"></div>'}
        <div class="cell"><div class="lbl">Fecha de emisión</div><div class="val">${fechaAtencion ? dayjs(fechaAtencion).format('DD/MM/YYYY HH:mm') : '—'}</div></div>
        <div class="cell"><div class="lbl">Médico prescriptor</div><div class="val">${medicoNombre ?? '—'}</div></div>
        <div class="cell"><div class="lbl">CMP &nbsp;·&nbsp; Especialidad</div><div class="val">${medicoCmp ?? '—'}${medicoEspecialidad ? ' &nbsp;·&nbsp; ' + medicoEspecialidad : ''}</div></div>
        <div class="cell" style="grid-column:span 2"><div class="lbl">N° Receta &nbsp;·&nbsp; Episodio clínico</div><div class="val" style="font-family:monospace;font-size:11px">${receta.idReceta.slice(-12).toUpperCase()} &nbsp;/&nbsp; ${receta.idEpisodioClinico.slice(-12).toUpperCase()}</div></div>
      </div>
      <div class="seccion">Prescripción médica</div>
      <table class="rx"><tbody>${filas}</tbody></table>
      <div class="firma-area">
        <div class="firma-box">
          <div class="firma-linea">
            <div class="firma-nombre">${medicoNombre ?? '—'}</div>
            ${medicoCmp ? `<div class="firma-cmp">CMP ${medicoCmp}</div>` : ''}
            ${medicoEspecialidad ? `<div class="firma-cmp">${medicoEspecialidad}</div>` : ''}
            <div class="firma-cmp" style="margin-top:4px">Firma y sello del médico</div>
          </div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : `ID ${receta.idPaciente}`;

  return (
    <Modal
      open={open}
      onCancel={onCerrar}
      width={680}
      styles={{ body: { padding: 0 } }}
      title={null}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <Button icon={<PrinterOutlined />} onClick={imprimir}>Imprimir / Descargar</Button>
          <Button type="primary" onClick={onCerrar} style={{ background: C.verde, borderColor: C.verde }}>Cerrar</Button>
        </div>
      }
    >
      {/* Banda superior */}
      <div style={{ height: 7, background: `linear-gradient(90deg, #0A3D2E, ${C.verde})`, borderRadius: '8px 8px 0 0' }} />

      <div style={{ padding: '20px 24px', background: '#FAFDF9' }}>
        {/* Membrete */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.borde}` }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0A3D2E' }}>Centro Médico Esperanza Sur</div>
            <div style={{ fontSize: 11, color: C.textoSec, marginTop: 2 }}>Sede Lima Sur · Lima, Perú</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', background: C.verde, color: '#fff',
              padding: '5px 16px', borderRadius: 20, fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
            }}>
              RECETA MÉDICA
            </div>
            {codigoHistoria && (
              <div style={{
                marginTop: 6, background: C.verdeClaro, border: `1px solid ${C.verdeBorde}`,
                borderRadius: 4, padding: '3px 10px', fontFamily: 'monospace', fontWeight: 700,
                fontSize: 11, color: C.verde,
              }}>
                {codigoHistoria}
              </div>
            )}
          </div>
        </div>

        {/* Datos del documento */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          border: `1px solid ${C.borde}`, borderRadius: 8, overflow: 'hidden', marginBottom: 18,
        }}>
          {[
            { label: 'Paciente', valor: <strong>{nombrePaciente}</strong>, span: false },
            { label: 'D.N.I.', valor: paciente?.documentoIdentidad ?? '—', span: false },
            { label: 'Fecha de nacimiento', valor: paciente?.fechaNacimiento ? dayjs(paciente.fechaNacimiento).format('DD/MM/YYYY') : '—', span: false },
            { label: 'Fecha de emisión', valor: fechaAtencion ? dayjs(fechaAtencion).format('DD/MM/YYYY  HH:mm') : '—', span: false },
            { label: 'Médico prescriptor', valor: medicoNombre ?? '—', span: false },
            { label: 'CMP · Especialidad', valor: `${medicoCmp ?? '—'}${medicoEspecialidad ? '  ·  ' + medicoEspecialidad : ''}`, span: false },
          ].map(({ label, valor }, i, arr) => (
            <div key={label} style={{
              padding: '8px 14px',
              borderRight: i % 2 === 0 ? `1px solid ${C.borde}` : 'none',
              borderBottom: i < arr.length - 2 ? `1px solid ${C.borde}` : 'none',
              background: i % 4 < 2 ? '#fff' : C.fondo,
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textoSec, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#1a1a1a' }}>{valor}</div>
            </div>
          ))}
          <div style={{
            gridColumn: 'span 2', padding: '7px 14px',
            borderTop: `1px solid ${C.borde}`, background: C.verdeClaro,
          }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: C.verde, marginBottom: 3 }}>N° Receta · Episodio clínico</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#1a1a1a' }}>
              {receta.idReceta.slice(-12).toUpperCase()}
              <Text type="secondary" style={{ margin: '0 8px' }}>·</Text>
              {receta.idEpisodioClinico.slice(-12).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Sección prescripción */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          paddingBottom: 6, borderBottom: `2px solid ${C.verde}`,
        }}>
          <MedicineBoxOutlined style={{ color: C.verde, fontSize: 13 }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: C.verde }}>
            Prescripción médica — {receta.lineas.length} medicamento{receta.lineas.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {receta.lineas.map((l, i) => (
            <div key={i}>
              <div style={{ display: 'flex', gap: 12, padding: '10px 4px', alignItems: 'flex-start' }}>
                {/* Rp. */}
                <div style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                  background: C.verde, color: '#fff', fontWeight: 700, fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontStyle: 'italic', letterSpacing: 0, marginTop: 2,
                }}>
                  Rp.
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {l.nombreMedicamento ?? nombresMed.get(l.idMedicamento) ?? `Medicamento ID ${l.idMedicamento}`}
                      </Text>
                      {l.principioActivo && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 1 }}>
                          {l.principioActivo}{l.presentacion ? ` · ${l.presentacion}` : ''}
                        </Text>
                      )}
                    </div>
                    <div style={{
                      flexShrink: 0, background: C.verde, color: '#fff',
                      borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {l.cantidadTotal} uds.
                    </div>
                  </div>
                  <div style={{
                    marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
                    fontSize: 12, color: '#374151',
                  }}>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Dosis</Text>
                      <strong>{l.dosis}</strong>
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Vía</Text>
                      <strong>{l.viaAdministracion}</strong>
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Frecuencia</Text>
                      <strong>{l.frecuencia}</strong>
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Duración</Text>
                      <strong>{l.duracion}</strong>
                    </span>
                  </div>
                  {l.indicaciones && (
                    <div style={{
                      marginTop: 6, fontSize: 11, color: C.textoSec, fontStyle: 'italic',
                      paddingLeft: 8, borderLeft: `2px solid ${C.verdeBorde}`,
                    }}>
                      {l.indicaciones}
                    </div>
                  )}
                </div>
              </div>
              {i < receta.lineas.length - 1 && (
                <div style={{ borderTop: '1px dashed #D1D5DB', margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Bloque de firma */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ height: 32, borderBottom: `1px solid #9CA3AF`, marginBottom: 8 }} />
            <Text strong style={{ fontSize: 12 }}>{medicoNombre ?? '—'}</Text>
            {medicoCmp && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>CMP {medicoCmp}</Text>}
            {medicoEspecialidad && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{medicoEspecialidad}</Text>}
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>Firma y sello del médico</Text>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MODAL ORDEN DE LABORATORIO — DOCUMENTO
════════════════════════════════════════════════════════════════════════ */
function OrdenDocumentoModal({
  orden, paciente: pacienteProp, medicoNombre: medicoNombreProp, medicoCmp: medicoCmpProp,
  medicoEspecialidad: medicoEspecialidadProp, fechaAtencion: fechaAtencionProp,
  codigoHistoria, nombresEx, open, onCerrar,
}: {
  orden: OrdenLaboratorioDTO;
  paciente?: PacienteResponseDTO | null;
  medicoNombre?: string;
  medicoCmp?: string;
  medicoEspecialidad?: string;
  fechaAtencion?: string;
  codigoHistoria?: string;
  nombresEx: Map<number, string>;
  open: boolean;
  onCerrar: () => void;
}) {
  const snap = orden.paciente;
  const medicoSnap = orden.medico;
  const paciente = snap
    ? { nombres: snap.nombres, apellidos: snap.apellidos, documentoIdentidad: snap.documentoIdentidad, fechaNacimiento: snap.fechaNacimiento } as PacienteResponseDTO
    : pacienteProp ?? null;
  const medicoNombre = medicoSnap ? `Dr. ${medicoSnap.nombres} ${medicoSnap.apellidos}` : medicoNombreProp;
  const medicoCmp = medicoSnap?.numeroColegiatura ?? medicoCmpProp;
  const medicoEspecialidad = medicoSnap?.especialidad ?? medicoEspecialidadProp;
  const fechaAtencion = orden.fechaEmision ?? fechaAtencionProp;
  const imprimir = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const filas = orden.lineas.map((l, i) => `
      <tr>
        <td style="width:28px;text-align:center;font-weight:700;color:#7C3AED;font-size:15px;vertical-align:top;padding-top:10px">${i + 1}</td>
        <td style="padding:8px 4px;vertical-align:top">
          <strong>${l.nombreExamen ?? nombresEx.get(l.idExamen) ?? `ID ${l.idExamen}`}</strong>
          ${l.categoria ? `<br><small style="background:#EDE9FE;color:#7C3AED;padding:1px 6px;border-radius:10px;font-size:10px">${l.categoria}</small>` : ''}
          ${l.indicacionesPreparacion ? `<br><span style="color:#555;font-size:11px;margin-top:4px;display:block"><strong>Preparación:</strong> ${l.indicacionesPreparacion}</span>` : ''}
        </td>
      </tr>
      ${i < orden.lineas.length - 1 ? '<tr><td colspan="2" style="padding:0;border:none"><hr style="border:none;border-top:1px dashed #ddd;margin:0"></td></tr>' : ''}`).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Orden — ${orden.idOrden.slice(-12).toUpperCase()}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;margin:0;padding:32px;color:#1a1a1a;background:#fff}
        .banda{height:8px;background:linear-gradient(90deg,#4C1D95,#7C3AED);margin:-32px -32px 0;margin-bottom:0}
        .membrete{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0 12px;border-bottom:1px solid #ddd;margin-bottom:14px}
        .clinica{font-size:15px;font-weight:700;color:#4C1D95}
        .clinica-sub{font-size:11px;color:#666;margin-top:2px}
        .tipo-doc{background:#7C3AED;color:#fff;padding:7px 18px;border-radius:20px;font-weight:700;font-size:13px;letter-spacing:.5px}
        .n-doc{background:#F5F3FF;border:1px solid #DDD6FE;border-radius:4px;padding:4px 10px;font-family:monospace;font-weight:700;font-size:11px;color:#7C3AED;margin-top:6px;text-align:right}
        .grid2{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd;border-radius:6px;overflow:hidden;margin-bottom:14px}
        .cell{padding:7px 12px;border-right:1px solid #ddd;border-bottom:1px solid #ddd}
        .cell:nth-child(even){border-right:none}
        .cell:nth-last-child(-n+2){border-bottom:none}
        .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:2px}
        .seccion{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7C3AED;padding:6px 0 4px;border-bottom:2px solid #7C3AED;margin-bottom:10px}
        table.rx{width:100%;border-collapse:collapse}
        .firma-area{margin-top:36px;display:flex;justify-content:flex-end}
        .firma-box{text-align:center;min-width:200px}
        .firma-linea{border-top:1px solid #999;padding-top:6px;margin-top:28px}
        @media print{body{padding:20px}.banda{margin:-20px -20px 0}}
      </style></head><body>
      <div class="banda"></div>
      <div class="membrete">
        <div>
          <div class="clinica">Centro Médico Esperanza Sur</div>
          <div class="clinica-sub">Sede Lima Sur · Lima, Perú</div>
        </div>
        <div style="text-align:right">
          <div class="tipo-doc">ORDEN DE LABORATORIO</div>
          ${codigoHistoria ? `<div class="n-doc">${codigoHistoria}</div>` : ''}
        </div>
      </div>
      <div class="grid2">
        <div class="cell"><div class="lbl">Paciente</div><div><strong>${paciente ? `${paciente.nombres} ${paciente.apellidos}` : `ID ${orden.idPaciente}`}</strong></div></div>
        <div class="cell"><div class="lbl">D.N.I.</div><div>${paciente?.documentoIdentidad ?? '—'}</div></div>
        ${paciente?.fechaNacimiento ? `<div class="cell"><div class="lbl">Fecha de nacimiento</div><div>${dayjs(paciente.fechaNacimiento).format('DD/MM/YYYY')}</div></div>` : '<div class="cell"></div>'}
        <div class="cell"><div class="lbl">Fecha de emisión</div><div>${fechaAtencion ? dayjs(fechaAtencion).format('DD/MM/YYYY HH:mm') : '—'}</div></div>
        <div class="cell"><div class="lbl">Médico solicitante</div><div>${medicoNombre ?? '—'}</div></div>
        <div class="cell"><div class="lbl">CMP · Especialidad</div><div>${medicoCmp ?? '—'}${medicoEspecialidad ? ' · ' + medicoEspecialidad : ''}</div></div>
        <div class="cell" style="grid-column:span 2"><div class="lbl">N° Orden · Episodio clínico</div><div style="font-family:monospace;font-size:11px">${orden.idOrden.slice(-12).toUpperCase()} / ${orden.idEpisodioClinico.slice(-12).toUpperCase()}</div></div>
      </div>
      <div class="seccion">Exámenes solicitados (${orden.lineas.length})</div>
      <table class="rx"><tbody>${filas}</tbody></table>
      <div class="firma-area">
        <div class="firma-box">
          <div class="firma-linea">
            <div style="font-weight:700;font-size:12px">${medicoNombre ?? '—'}</div>
            ${medicoCmp ? `<div style="color:#666;font-size:10px">CMP ${medicoCmp}</div>` : ''}
            ${medicoEspecialidad ? `<div style="color:#666;font-size:10px">${medicoEspecialidad}</div>` : ''}
            <div style="color:#999;font-size:10px;margin-top:4px">Firma y sello del médico</div>
          </div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : `ID ${orden.idPaciente}`;

  return (
    <Modal
      open={open}
      onCancel={onCerrar}
      width={640}
      styles={{ body: { padding: 0 } }}
      title={null}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <Button icon={<PrinterOutlined />} onClick={imprimir}>Imprimir / Descargar</Button>
          <Button type="primary" onClick={onCerrar} style={{ background: C.purpura, borderColor: C.purpura }}>Cerrar</Button>
        </div>
      }
    >
      {/* Banda superior */}
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4C1D95, #7C3AED)', borderRadius: '8px 8px 0 0' }} />

      <div style={{ padding: '20px 24px', background: '#FDFAFF' }}>
        {/* Membrete */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.borde}` }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#4C1D95' }}>Centro Médico Esperanza Sur</div>
            <div style={{ fontSize: 11, color: C.textoSec, marginTop: 2 }}>Sede Lima Sur · Lima, Perú</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', background: C.purpura, color: '#fff',
              padding: '5px 16px', borderRadius: 20, fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
            }}>
              ORDEN DE LABORATORIO
            </div>
            {codigoHistoria && (
              <div style={{
                marginTop: 6, background: C.purpuraClaro, border: `1px solid ${C.purpuraBorde}`,
                borderRadius: 4, padding: '3px 10px', fontFamily: 'monospace', fontWeight: 700,
                fontSize: 11, color: C.purpura,
              }}>
                {codigoHistoria}
              </div>
            )}
          </div>
        </div>

        {/* Datos del documento */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          border: `1px solid ${C.borde}`, borderRadius: 8, overflow: 'hidden', marginBottom: 18,
        }}>
          {[
            { label: 'Paciente', valor: <strong>{nombrePaciente}</strong> },
            { label: 'D.N.I.', valor: paciente?.documentoIdentidad ?? '—' },
            { label: 'Fecha de nacimiento', valor: paciente?.fechaNacimiento ? dayjs(paciente.fechaNacimiento).format('DD/MM/YYYY') : '—' },
            { label: 'Fecha de emisión', valor: fechaAtencion ? dayjs(fechaAtencion).format('DD/MM/YYYY  HH:mm') : '—' },
            { label: 'Médico solicitante', valor: medicoNombre ?? '—' },
            { label: 'CMP · Especialidad', valor: `${medicoCmp ?? '—'}${medicoEspecialidad ? '  ·  ' + medicoEspecialidad : ''}` },
          ].map(({ label, valor }, i, arr) => (
            <div key={label} style={{
              padding: '8px 14px',
              borderRight: i % 2 === 0 ? `1px solid ${C.borde}` : 'none',
              borderBottom: i < arr.length - 2 ? `1px solid ${C.borde}` : 'none',
              background: i % 4 < 2 ? '#fff' : C.fondo,
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textoSec, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#1a1a1a' }}>{valor}</div>
            </div>
          ))}
          <div style={{
            gridColumn: 'span 2', padding: '7px 14px',
            borderTop: `1px solid ${C.borde}`, background: C.purpuraClaro,
          }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: C.purpura, marginBottom: 3 }}>N° Orden · Episodio clínico</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#1a1a1a' }}>
              {orden.idOrden.slice(-12).toUpperCase()}
              <Text type="secondary" style={{ margin: '0 8px' }}>·</Text>
              {orden.idEpisodioClinico.slice(-12).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Sección exámenes */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          paddingBottom: 6, borderBottom: `2px solid ${C.purpura}`,
        }}>
          <ExperimentOutlined style={{ color: C.purpura, fontSize: 13 }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: C.purpura }}>
            Exámenes solicitados — {orden.lineas.length} examen{orden.lineas.length !== 1 ? 'es' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {orden.lineas.map((l, i) => (
            <div key={i}>
              <div style={{ display: 'flex', gap: 12, padding: '10px 4px', alignItems: 'flex-start' }}>
                {/* Número */}
                <div style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                  background: C.purpura, color: '#fff', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {l.nombreExamen ?? nombresEx.get(l.idExamen) ?? `Examen ID ${l.idExamen}`}
                    </Text>
                    {l.categoria && (
                      <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>{l.categoria}</Tag>
                    )}
                  </div>
                  {l.indicacionesPreparacion && (
                    <div style={{
                      marginTop: 6, fontSize: 12, color: '#374151',
                      paddingLeft: 8, borderLeft: `2px solid ${C.purpuraBorde}`,
                    }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Preparación: </Text>
                      {l.indicacionesPreparacion}
                    </div>
                  )}
                </div>
              </div>
              {i < orden.lineas.length - 1 && (
                <div style={{ borderTop: '1px dashed #D1D5DB', margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Bloque de firma */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ height: 32, borderBottom: `1px solid #9CA3AF`, marginBottom: 8 }} />
            <Text strong style={{ fontSize: 12 }}>{medicoNombre ?? '—'}</Text>
            {medicoCmp && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>CMP {medicoCmp}</Text>}
            {medicoEspecialidad && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{medicoEspecialidad}</Text>}
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>Firma y sello del médico</Text>
          </div>
        </div>
      </div>
    </Modal>
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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Divider orientation={'left' as any} orientationMargin={0} style={{ margin: '0 0 12px', color: '#374151' }}>
        <Space size={6}>
          {icono}
          <Text strong style={{ fontSize: 13 }}>{titulo}</Text>
        </Space>
      </Divider>
      {children}
    </div>
  );
}
