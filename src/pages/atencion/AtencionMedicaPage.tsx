import { useState, useCallback, useMemo, useRef } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  Alert, Spin, Typography, Tag, Button, Space, Empty, App,
  Form, Input, InputNumber, Select, AutoComplete,
  Row, Col, Drawer, Badge, Tooltip, Timeline, Table, DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import {
  ArrowLeftOutlined, MedicineBoxOutlined, ExperimentOutlined,
  CheckCircleOutlined, UserOutlined, HeartOutlined,
  HistoryOutlined, CloseOutlined, PlusOutlined, InfoCircleOutlined,
  ClockCircleOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import { usePerfilPropio } from '../../hooks/usePerfilPropio';
import { useListaCitas, useNombresPacientes } from '../../hooks/useCitas';
import { useEspecialidades, useMedicos } from '../../hooks/usePersonal';
import * as pacientesApi from '../../api/pacientes';
import {
  useDisponibilidadAtencion, useBorrador, useIniciarAtencion,
  useActualizarAnamnesis, useAgregarDiagnostico, useAgregarReceta,
  useAgregarOrden, useFinalizarAtencion, useBuscarCie10,
} from '../../hooks/useAtencion';
import { useBuscarMedicamentos, useNombresMedicamentos } from '../../hooks/useFarmacia';
import { useBuscarExamenes, useNombresExamenes } from '../../hooks/useLaboratorio';
import { useObtenerPaciente } from '../../hooks/usePacientes';
import { useHistoriaPorPaciente, useEpisodiosPorHistoria } from '../../hooks/useHistorias';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import { obtenerAntecedentes } from '../../api/pacientes';
import { useQuery } from '@tanstack/react-query';
import type { CitaMedicaResponseDTO } from '../../types/citas';
import type { DisponibilidadDTO, BorradorResponseDTO } from '../../types/atencion';
import type { AntecedenteClinicoResponseDTO } from '../../types/pacientes';
import type { EpisodioClinicoDTO, SignosVitalesDTO } from '../../types/historias';

/* ── Constantes ─────────────────────────────────────────────────────────── */

const SEXO_LABEL: Record<string, string> = { MASCULINO: 'Masculino', FEMENINO: 'Femenino' };
const GRUPO_SG_LABEL: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  O_POS: 'O+', O_NEG: 'O−', AB_POS: 'AB+', AB_NEG: 'AB−',
};
const VIAS = [
  'Oral', 'Sublingual', 'Intravenosa', 'Intramuscular', 'Subcutánea',
  'Tópica', 'Inhalatoria', 'Rectal', 'Ótica', 'Oftálmica', 'Nasal',
];
const FRECUENCIAS = [
  'Una vez al día', 'Dos veces al día', 'Tres veces al día',
  'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas',
  'Una vez a la semana', 'Según necesidad',
];
const DURACIONES = [
  '3 días', '5 días', '7 días', '10 días', '14 días', '21 días', '30 días',
  '2 meses', '3 meses', 'Tratamiento continuo',
];

/* ── Tokens de color ─────────────────────────────────────────────────────── */
const C = {
  verde: '#0F6E56',
  verdeClaro: '#E8F5F1',
  verdeBorde: '#B2DDD3',
  fondoSeccion: '#FAFAFA',
  borde: '#E8E8E8',
  textoSecundario: '#6B7280',
  rojo: '#EF4444',
  rojoFondo: '#FEF2F2',
  rojoBorde: '#FECACA',
  purpura: '#7C3AED',
  purpuraClaro: '#F5F3FF',
  purpuraBorde: '#DDD6FE',
};

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA RAÍZ
════════════════════════════════════════════════════════════════════════════ */
export default function AtencionMedicaPage() {
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const esAdmin = userRoles.includes('ADMIN');

  const { isError: isDown, error: downErr } = useDisponibilidadAtencion();
  const { data: perfil, isLoading: loadingPerfil } = usePerfilPropio();
  const [citaActiva, setCitaActiva] = useState<{ idCita: number; idPaciente: number } | null>(null);

  const abrirAtencion = useCallback((idCita: number, idPaciente: number) => {
    setCitaActiva({ idCita, idPaciente });
  }, []);
  const cerrarAtencion = useCallback(() => setCitaActiva(null), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <PageHeader title="Atención médica" />

      {isDown && (
        <Alert type="error" showIcon
          message="Servicio de atención no disponible"
          description={serviceErrorMessage(downErr, 'ms-atencion-medica', 8089)}
        />
      )}

      {esAdmin
        ? <VistaAdminAtencion />
        : loadingPerfil
          ? <Centrado><Spin size="large" /></Centrado>
          : !perfil
            ? <Alert type="warning" showIcon message="No se encontró su perfil de personal médico." />
            : citaActiva === null
              ? <ListaCitas idPersonal={perfil.id} onAtender={abrirAtencion} />
              : <Workspace
                  idCita={citaActiva.idCita}
                  idPaciente={citaActiva.idPaciente}
                  idPersonalMedico={perfil.id}
                  onCerrar={cerrarAtencion}
                />
      }
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   VISTA ADMIN — solo lectura, todas las atenciones en curso
════════════════════════════════════════════════════════════════════════════ */
const FORMATO_FECHA = 'YYYY-MM-DD';

const ESTADO_ATENCION_TAG: Record<string, { color: string; label: string }> = {
  CONFIRMADA:     { color: 'blue',    label: 'Confirmada' },
  PENDIENTE_PAGO: { color: 'gold',    label: 'Pendiente pago' },
  ATENDIDA:       { color: 'green',   label: 'Atendida' },
  CANCELADA:      { color: 'default', label: 'Cancelada' },
};

function VistaAdminAtencion() {
  const [idEspecialidad, setIdEspecialidad] = useState<number | null>(null);
  const [idPersonal, setIdPersonal] = useState<number | null>(null);
  const [fecha, setFecha] = useState<Dayjs | null>(null);

  // Búsqueda de paciente
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [opcionesPaciente, setOpcionesPaciente] = useState<{ value: number; label: string }[]>([]);
  const [idPaciente, setIdPaciente] = useState<number | null>(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: especialidades = [] } = useEspecialidades();
  const { data: medicos = [] } = useMedicos();

  const medicosFiltrados = useMemo(
    () => idEspecialidad === null ? medicos : medicos.filter(m => m.especialidad.id === idEspecialidad),
    [medicos, idEspecialidad],
  );

  const { data: todasCitas = [], isLoading } = useListaCitas({
    idPersonal: idPersonal ?? undefined,
    idPaciente: idPaciente ?? undefined,
    fecha: fecha ? fecha.format(FORMATO_FECHA) : undefined,
  });

  // Filtro por especialidad en cliente (igual que ListadoTab en CitasPage)
  const citas = idEspecialidad === null
    ? todasCitas
    : todasCitas.filter(c => medicos.find(m => m.idPersonal === c.idPersonal)?.especialidad.id === idEspecialidad);

  const nombresPacientes = useNombresPacientes(citas.map(c => c.idPaciente));

  const handleBuscarPaciente = (texto: string) => {
    setBusquedaPaciente(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto || texto.trim().length < 2) { setOpcionesPaciente([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscandoPaciente(true);
      try {
        const res = await pacientesApi.buscar(texto.trim());
        setOpcionesPaciente(res.map(p => ({ value: p.id, label: `${p.nombres} ${p.apellidos} — ${p.documentoIdentidad}` })));
      } catch { setOpcionesPaciente([]); }
      finally { setBuscandoPaciente(false); }
    }, 350);
  };

  const columns: ColumnsType<CitaMedicaResponseDTO> = [
    {
      title: 'N°', dataIndex: 'id', width: 55,
      render: (v: number) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>#{v}</Typography.Text>,
    },
    {
      title: 'Paciente', key: 'paciente',
      render: (_, r) => nombresPacientes.get(r.idPaciente) ?? <Spin size="small" />,
    },
    {
      title: 'Médico', key: 'medico', width: 200,
      render: (_, r) => {
        const m = medicos.find(med => med.idPersonal === r.idPersonal);
        return m ? `${m.nombres} ${m.apellidos}` : `#${r.idPersonal}`;
      },
    },
    {
      title: 'Especialidad', key: 'especialidad', width: 160,
      render: (_, r) => medicos.find(m => m.idPersonal === r.idPersonal)?.especialidad.nombre ?? '—',
    },
    {
      title: 'Fecha y hora', dataIndex: 'fechaHora', width: 155,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.fechaHora).valueOf() - dayjs(b.fechaHora).valueOf(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Consultorio', dataIndex: 'idConsultorio', width: 100,
      render: (v: number) => `Cons. ${v}`,
    },
    {
      title: 'Estado', dataIndex: 'estado', width: 150,
      render: (v: string) => {
        const cfg = ESTADO_ATENCION_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filtros */}
      <div style={{
        background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Buscar paciente
          </Typography.Text>
          <Select
            showSearch filterOption={false}
            value={idPaciente ?? undefined}
            placeholder="Nombre o N° documento..."
            style={{ width: 240 }}
            searchValue={busquedaPaciente}
            onSearch={handleBuscarPaciente}
            onSelect={(id: number, opt: { value: number; label: string }) => { setIdPaciente(id); setBusquedaPaciente(opt.label); }}
            onClear={() => { setIdPaciente(null); setBusquedaPaciente(''); setOpcionesPaciente([]); }}
            allowClear loading={buscandoPaciente}
            notFoundContent={
              busquedaPaciente.length < 2
                ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>Escribe al menos 2 caracteres</Typography.Text>
                : buscandoPaciente ? <Spin size="small" /> : 'Sin resultados'
            }
            options={opcionesPaciente}
          />
        </div>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Especialidad
          </Typography.Text>
          <Select
            placeholder="Todas" style={{ width: 190 }}
            value={idEspecialidad} allowClear
            onChange={(v: number | undefined) => { setIdEspecialidad(v ?? null); setIdPersonal(null); }}
            options={especialidades.map(e => ({ value: e.id, label: e.nombre }))}
          />
        </div>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Médico
          </Typography.Text>
          <Select
            placeholder="Todos" style={{ width: 220 }}
            value={idPersonal} allowClear
            onChange={(v: number | undefined) => setIdPersonal(v ?? null)}
            options={medicosFiltrados.map(m => ({ value: m.idPersonal, label: `${m.nombres} ${m.apellidos}` }))}
          />
        </div>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Fecha
          </Typography.Text>
          <DatePicker value={fecha} onChange={setFecha} format="DD/MM/YYYY" allowClear />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={citas}
          loading={isLoading}
          size="small"
          scroll={{ y: 'calc(100vh - 380px)' }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} citas` }}
          locale={{ emptyText: 'Sin citas con estos filtros' }}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LISTA DE CITAS
════════════════════════════════════════════════════════════════════════════ */
function ListaCitas({
  idPersonal,
  onAtender,
}: {
  idPersonal: number;
  onAtender: (idCita: number, idPaciente: number) => void;
}) {
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const { notification } = App.useApp();
  const { data: citas = [], isLoading } = useListaCitas({ idPersonal, estado: 'CONFIRMADA' });
  const nombresPacientes = useNombresPacientes(citas.map(c => c.idPaciente));
  const iniciarMut = useIniciarAtencion();

  const handleAtender = async (cita: CitaMedicaResponseDTO) => {
    try {
      await iniciarMut.mutateAsync({ idCita: cita.id, idPaciente: cita.idPaciente, idPersonalMedico: idPersonal });
      onAtender(cita.id, cita.idPaciente);
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) { onAtender(cita.id, cita.idPaciente); return; }
      if (status === 400) notification.error({ message: 'La cita ya no está disponible para atender.', description: msg });
      else notification.error({ message: 'No se pudo iniciar la atención. Intente de nuevo.', description: msg });
    }
  };

  if (isLoading) return <Centrado><Spin size="large" /></Centrado>;

  if (citas.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 320, background: '#fff', borderRadius: 12, border: `1px solid ${C.borde}`,
      }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: C.textoSecundario }}>
              No tiene citas confirmadas pendientes de atención
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
        {citas.length} cita{citas.length !== 1 ? 's' : ''} confirmada{citas.length !== 1 ? 's' : ''} pendiente{citas.length !== 1 ? 's' : ''}
      </Typography.Text>
      {citas.map(cita => (
        <div key={cita.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          background: '#fff', border: `1px solid ${C.borde}`, borderRadius: 10,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: C.verdeClaro, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserOutlined style={{ color: C.verde, fontSize: 16 }} />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 14, display: 'block' }}>
                {nombresPacientes.get(cita.idPaciente) ?? <Spin size="small" />}
              </Typography.Text>
              <Space size={4} style={{ marginTop: 2 }}>
                <ClockCircleOutlined style={{ color: C.textoSecundario, fontSize: 11 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(cita.fechaHora).format('DD MMM YYYY, HH:mm')}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  · Consultorio {cita.idConsultorio}
                </Typography.Text>
              </Space>
            </div>
          </div>
          <Button
            type="primary"
            loading={iniciarMut.isPending}
            onClick={() => handleAtender(cita)}
            style={{ background: C.verde, borderColor: C.verde }}
          >
            Iniciar atención
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WORKSPACE — layout de dos columnas
════════════════════════════════════════════════════════════════════════════ */
function Workspace({
  idCita, idPaciente, idPersonalMedico: _idPersonalMedico, onCerrar,
}: {
  idCita: number;
  idPaciente: number;
  idPersonalMedico: number;
  onCerrar: () => void;
}) {
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const { notification, modal } = App.useApp();
  const { data: borrador, isLoading } = useBorrador(idCita);
  const finalizarMut = useFinalizarAtencion();
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const { data: historia } = useHistoriaPorPaciente(idPaciente);
  const { data: episodios = [] } = useEpisodiosPorHistoria(historia?.id ?? null);

  const handleFinalizar = () => {
    modal.confirm({
      title: 'Finalizar atención',
      content: 'La consulta pasará a estado ATENDIDA y se registrará en la historia clínica. Esta acción no se puede deshacer.',
      okText: 'Finalizar consulta',
      cancelText: 'Cancelar',
      okButtonProps: { style: { background: C.verde, borderColor: C.verde } },
      onOk: async () => {
        try {
          await finalizarMut.mutateAsync(idCita);
          notification.success({ message: 'Consulta finalizada', description: 'El episodio quedó registrado en la historia clínica.' });
          onCerrar();
        } catch (err: unknown) {
          const { msg } = extractApiError(err);
          notification.error({ message: 'No se pudo finalizar la consulta. Intente de nuevo.', description: msg });
        }
      },
    });
  };

  if (isLoading || !borrador) return <Centrado><Spin size="large" /></Centrado>;

  const puedeFinalizar = !!borrador.diagnostico;

  /* Progreso de secciones */
  const secciones = [
    { label: 'Motivo', ok: !!borrador.motivoConsulta },
    { label: 'Examen físico', ok: !!borrador.signosVitales },
    { label: 'Diagnóstico', ok: !!borrador.diagnostico },
    { label: 'Tratamiento', ok: borrador.lineasReceta.length > 0 || borrador.lineasOrden.length > 0, opcional: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Barra superior ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', border: `1px solid ${C.borde}`, borderRadius: 10,
        padding: '10px 16px', gap: 12, flexWrap: 'wrap',
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onCerrar} type="text">
          Volver a la lista
        </Button>

        {/* Indicadores de progreso */}
        <Space size={6} wrap>
          {secciones.map(s => (
            <Tag
              key={s.label}
              icon={s.ok ? <CheckCircleOutlined /> : undefined}
              color={s.ok ? 'success' : s.opcional ? 'default' : undefined}
              style={{ borderRadius: 12, fontSize: 11, padding: '1px 8px' }}
            >
              {s.label}
            </Tag>
          ))}
        </Space>

        <Space>
          <Tooltip title={episodios.length === 0 ? 'Sin consultas anteriores' : `${episodios.length} consulta${episodios.length !== 1 ? 's' : ''} previa${episodios.length !== 1 ? 's' : ''}`}>
            <Badge count={episodios.length} style={{ backgroundColor: C.verde }}>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setHistorialAbierto(true)}
                disabled={episodios.length === 0}
              >
                Historial
              </Button>
            </Badge>
          </Tooltip>
          <Tooltip title={!puedeFinalizar ? 'Registre un diagnóstico antes de finalizar' : ''}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!puedeFinalizar}
              loading={finalizarMut.isPending}
              onClick={handleFinalizar}
              style={puedeFinalizar ? { background: C.verde, borderColor: C.verde } : {}}
            >
              Finalizar consulta
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* ── Banner del paciente ── */}
      <BannerPaciente idPaciente={idPaciente} />

      {/* ── Aviso de diagnóstico pendiente ── */}
      {!puedeFinalizar && (
        <Alert
          type="info" showIcon icon={<InfoCircleOutlined />}
          message="Registre un diagnóstico para poder finalizar la consulta"
          style={{ borderRadius: 8 }}
        />
      )}

      {/* ── Layout de dos columnas ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* Columna clínica (izquierda) */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SeccionMotivoConsulta idCita={idCita} borrador={borrador} />
          <SeccionExamenFisico idCita={idCita} borrador={borrador} />
          <SeccionDiagnostico idCita={idCita} borrador={borrador} />
        </div>

        {/* Columna tratamiento (derecha) */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SeccionTratamiento idCita={idCita} borrador={borrador} />
        </div>
      </div>

      {/* ── Drawer de historial ── */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: C.verde }} />
            <span>Consultas anteriores</span>
            {episodios.length > 0 && (
              <Tag style={{ borderRadius: 10 }}>{episodios.length}</Tag>
            )}
          </Space>
        }
        placement="right"
        width={520}
        open={historialAbierto}
        onClose={() => setHistorialAbierto(false)}
        closeIcon={<CloseOutlined />}
      >
        <HistorialPaciente idPaciente={idPaciente} />
      </Drawer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BANNER DEL PACIENTE
════════════════════════════════════════════════════════════════════════════ */
function BannerPaciente({ idPaciente }: { idPaciente: number }) {
  const { data: paciente } = useObtenerPaciente(idPaciente);
  const { data: antecedentes = [] } = useQuery<AntecedenteClinicoResponseDTO[]>({
    queryKey: ['paciente', idPaciente, 'antecedentes'],
    queryFn: () => obtenerAntecedentes(idPaciente),
    enabled: idPaciente > 0,
    staleTime: 60_000,
  });

  const alergias = antecedentes.filter(a => a.tipo === 'ALERGIA');
  const cronicas = antecedentes.filter(a => a.tipo === 'ENFERMEDAD_CRONICA');
  const edad = paciente?.fechaNacimiento
    ? dayjs().diff(dayjs(paciente.fechaNacimiento), 'year')
    : null;

  return (
    <div style={{
      background: `linear-gradient(135deg, #0A3D2E 0%, ${C.verde} 100%)`,
      borderRadius: 12, padding: '14px 20px', color: '#fff',
      display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserOutlined style={{ fontSize: 20 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {paciente ? `${paciente.nombres} ${paciente.apellidos}` : <Spin size="small" />}
          </div>
          <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>
            DNI {paciente?.documentoIdentidad}
            {edad !== null ? ` · ${edad} años` : ''}
            {paciente?.sexo ? ` · ${SEXO_LABEL[paciente.sexo] ?? paciente.sexo}` : ''}
          </div>
        </div>
      </div>

      {paciente?.grupoSanguineo && (
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '6px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2, letterSpacing: 1 }}>GRUPO</div>
          <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
            <HeartOutlined style={{ fontSize: 14, opacity: 0.8 }} />
            {GRUPO_SG_LABEL[paciente.grupoSanguineo] ?? paciente.grupoSanguineo}
          </div>
        </div>
      )}

      {alergias.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 8, padding: '6px 12px', minWidth: 140,
        }}>
          <div style={{ fontSize: 10, opacity: 0.9, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>
            ⚠ ALERGIAS
          </div>
          {alergias.map(a => (
            <div key={a.id} style={{ fontSize: 12, fontWeight: 500 }}>{a.descripcion}</div>
          ))}
        </div>
      )}

      {cronicas.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.1)', borderRadius: 8,
          padding: '6px 12px', minWidth: 140,
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, letterSpacing: 1 }}>ANTECEDENTES</div>
          {cronicas.map(a => (
            <div key={a.id} style={{ fontSize: 12 }}>{a.descripcion}</div>
          ))}
        </div>
      )}

      {alergias.length === 0 && cronicas.length === 0 && (
        <div style={{ opacity: 0.5, fontSize: 12, alignSelf: 'center' }}>
          Sin antecedentes registrados
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECCIÓN: MOTIVO DE CONSULTA
════════════════════════════════════════════════════════════════════════════ */
function SeccionMotivoConsulta({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState(!borrador.motivoConsulta);
  const mut = useActualizarAnamnesis();

  const guardar = async (values: { motivoConsulta: string }) => {
    try {
      await mut.mutateAsync({ idCita, data: { motivoConsulta: values.motivoConsulta, signosVitales: borrador.signosVitales } });
      notification.success({ message: 'Guardado' });
      setEditando(false);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'No se pudo guardar. Intente de nuevo.', description: msg });
    }
  };

  return (
    <Seccion titulo="Motivo de consulta" completa={!!borrador.motivoConsulta} onEditar={() => setEditando(true)} editando={editando}>
      {!editando && borrador.motivoConsulta ? (
        <Typography.Text style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {borrador.motivoConsulta}
        </Typography.Text>
      ) : (
        <Form form={form} onFinish={guardar} initialValues={{ motivoConsulta: borrador.motivoConsulta }}>
          <Form.Item name="motivoConsulta" style={{ marginBottom: 10 }}>
            <Input.TextArea
              rows={3}
              placeholder="Describa el motivo de consulta y síntomas referidos por el paciente..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={mut.isPending}
              style={{ background: C.verde, borderColor: C.verde }}>
              Guardar
            </Button>
            {borrador.motivoConsulta && (
              <Button onClick={() => setEditando(false)}>Cancelar</Button>
            )}
          </Space>
        </Form>
      )}
    </Seccion>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECCIÓN: EXAMEN FÍSICO
════════════════════════════════════════════════════════════════════════════ */
function SeccionExamenFisico({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState(!borrador.signosVitales);
  const mut = useActualizarAnamnesis();
  const sv = borrador.signosVitales;

  const guardar = async (v: Record<string, number | string | undefined>) => {
    try {
      await mut.mutateAsync({
        idCita,
        data: {
          motivoConsulta: borrador.motivoConsulta,
          signosVitales: {
            peso: v.peso as number,
            talla: v.talla as number,
            presionArterial: v.presionArterial as string,
            frecuenciaCardiaca: v.frecuenciaCardiaca as number,
            saturacionOxigeno: v.saturacionOxigeno as number,
            frecuenciaRespiratoria: v.frecuenciaRespiratoria as number,
            temperatura: v.temperatura as number,
          },
        },
      });
      notification.success({ message: 'Guardado' });
      setEditando(false);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'No se pudo guardar. Intente de nuevo.', description: msg });
    }
  };

  return (
    <Seccion titulo="Examen físico" completa={!!sv} onEditar={() => setEditando(true)} editando={editando}>
      {!editando && sv ? (
        <SignosVitalesViewer sv={sv} />
      ) : (
        <Form form={form} layout="vertical" onFinish={guardar} initialValues={sv ?? {}}>
          <Row gutter={[12, 0]}>
            {[
              { name: 'peso', label: 'Peso (kg)', step: 0.1, ph: '70.5', max: undefined },
              { name: 'talla', label: 'Talla (cm)', step: 1, ph: '170', max: undefined },
              { name: 'frecuenciaCardiaca', label: 'F. Cardíaca (lpm)', step: 1, ph: '72', max: undefined },
              { name: 'saturacionOxigeno', label: 'SpO₂ (%)', step: 1, ph: '98', max: 100 },
              { name: 'frecuenciaRespiratoria', label: 'F. Resp. (rpm)', step: 1, ph: '16', max: undefined },
              { name: 'temperatura', label: 'Temperatura (°C)', step: 0.1, ph: '36.8', max: 45 },
            ].map(f => (
              <Col xs={12} sm={8} key={f.name}>
                <Form.Item name={f.name} label={f.label} style={{ marginBottom: 10 }}>
                  <InputNumber
                    style={{ width: '100%', maxWidth: 160 }}
                    min={0} max={f.max} step={f.step}
                    placeholder={`Ej: ${f.ph}`}
                  />
                </Form.Item>
              </Col>
            ))}
            <Col xs={12} sm={8}>
              <Form.Item name="presionArterial" label="P. Arterial (mmHg)" style={{ marginBottom: 10 }}>
                <Input style={{ maxWidth: 160 }} placeholder="120/80" />
              </Form.Item>
            </Col>
          </Row>
          <Space style={{ marginTop: 4 }}>
            <Button type="primary" htmlType="submit" loading={mut.isPending}
              style={{ background: C.verde, borderColor: C.verde }}>
              Guardar
            </Button>
            {sv && <Button onClick={() => setEditando(false)}>Cancelar</Button>}
          </Space>
        </Form>
      )}
    </Seccion>
  );
}

function SignosVitalesViewer({ sv }: { sv: SignosVitalesDTO }) {
  const items = [
    { label: 'Peso', value: sv.peso != null ? `${sv.peso} kg` : null },
    { label: 'Talla', value: sv.talla != null ? `${sv.talla} cm` : null },
    { label: 'IMC', value: sv.imc != null ? String(sv.imc) : null, alerta: sv.imc != null && (sv.imc > 29.9 || sv.imc < 18.5) },
    { label: 'P. Arterial', value: sv.presionArterial ? `${sv.presionArterial} mmHg` : null },
    { label: 'F. Cardíaca', value: sv.frecuenciaCardiaca != null ? `${sv.frecuenciaCardiaca} lpm` : null },
    { label: 'F. Resp.', value: sv.frecuenciaRespiratoria != null ? `${sv.frecuenciaRespiratoria} rpm` : null },
    { label: 'SpO₂', value: sv.saturacionOxigeno != null ? `${sv.saturacionOxigeno}%` : null, alerta: sv.saturacionOxigeno != null && sv.saturacionOxigeno < 95 },
    { label: 'Temperatura', value: sv.temperatura != null ? `${sv.temperatura} °C` : null, alerta: sv.temperatura != null && sv.temperatura > 37.5 },
  ].filter(i => i.value !== null);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <Chip key={item.label} label={item.label} value={item.value!} highlight={item.alerta} />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECCIÓN: DIAGNÓSTICO
════════════════════════════════════════════════════════════════════════════ */
function SeccionDiagnostico({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  const { keycloak } = useKeycloak();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState(!borrador.diagnostico);
  const [cie10Q, setCie10Q] = useState('');
  const cie10Deb = useDebouncedSearch(cie10Q, 350);
  const { data: cie10Results = [], isFetching: buscandoCie10 } = useBuscarCie10(cie10Deb);
  const mut = useAgregarDiagnostico();
  const diag = borrador.diagnostico;

  const guardar = async (v: { codigoCie10: string; descripcion: string; tipoDiagnostico?: string; observacionesClinicas?: string }) => {
    try {
      await mut.mutateAsync({ idCita, data: v });
      notification.success({ message: 'Diagnóstico guardado' });
      setEditando(false);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'No se pudo guardar el diagnóstico.', description: msg });
    }
  };

  return (
    <Seccion titulo="Diagnóstico" completa={!!diag} obligatoria onEditar={() => setEditando(true)} editando={editando}>
      {!editando && diag ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Space wrap>
            <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 6, fontFamily: 'monospace' }}>
              {diag.codigoCie10}
            </Tag>
            <Tag
              color={diag.tipoDiagnostico === 'DEFINITIVO' ? 'green' : 'orange'}
              style={{ borderRadius: 6 }}
            >
              {diag.tipoDiagnostico === 'DEFINITIVO' ? 'Definitivo' : 'Presuntivo'}
            </Tag>
            <Typography.Text strong style={{ fontSize: 14 }}>{diag.descripcion}</Typography.Text>
          </Space>
          {borrador.observacionesClinicas && (
            <Typography.Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
              {borrador.observacionesClinicas}
            </Typography.Text>
          )}
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={guardar} initialValues={{
          codigoCie10: diag?.codigoCie10,
          descripcion: diag?.descripcion,
          tipoDiagnostico: diag?.tipoDiagnostico ?? 'PRESUNTIVO',
          observacionesClinicas: borrador.observacionesClinicas,
        }}>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={9}>
              <Form.Item name="codigoCie10" label="Código CIE-10"
                rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 10 }}>
                <AutoComplete
                  options={cie10Results.map(c => ({ value: c.codigo, label: `${c.codigo} — ${c.descripcion}` }))}
                  onSearch={v => { setCie10Q(v); form.setFieldValue('codigoCie10', v); }}
                  onSelect={val => {
                    const f = cie10Results.find(c => c.codigo === val);
                    if (f) form.setFieldsValue({ codigoCie10: f.codigo, descripcion: f.descripcion });
                  }}
                  notFoundContent={
                    cie10Deb.trim().length < 2
                      ? <span style={{ color: C.textoSecundario, fontSize: 12 }}>Escriba al menos 2 caracteres</span>
                      : buscandoCie10 ? <Spin size="small" />
                      : <span style={{ color: C.textoSecundario, fontSize: 12 }}>Sin resultados</span>
                  }
                  placeholder="Buscar código o descripción"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name="descripcion" label="Descripción"
                rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 10 }}>
                <Input placeholder="Descripción diagnóstica" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={5}>
              <Form.Item name="tipoDiagnostico" label="Tipo" style={{ marginBottom: 10 }}>
                <Select options={[
                  { value: 'PRESUNTIVO', label: 'Presuntivo' },
                  { value: 'DEFINITIVO', label: 'Definitivo' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="observacionesClinicas" label="Observaciones clínicas (opcional)" style={{ marginBottom: 10 }}>
                <Input.TextArea rows={2} placeholder="Hallazgos del examen, notas clínicas adicionales..." />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" loading={mut.isPending}
              style={{ background: C.verde, borderColor: C.verde }}>
              Guardar diagnóstico
            </Button>
            {diag && <Button onClick={() => setEditando(false)}>Cancelar</Button>}
          </Space>
        </Form>
      )}
    </Seccion>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECCIÓN: TRATAMIENTO (panel derecho)
════════════════════════════════════════════════════════════════════════════ */
function SeccionTratamiento({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.borde}`, borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${C.borde}`,
        background: C.fondoSeccion,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Typography.Text strong style={{ fontSize: 14 }}>Tratamiento</Typography.Text>
        <Tag style={{ borderRadius: 10, fontSize: 10, color: C.textoSecundario }}>Opcional</Tag>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SubSeccionReceta idCita={idCita} borrador={borrador} />
        <div style={{ borderTop: `1px solid ${C.borde}`, paddingTop: 16 }}>
          <SubSeccionOrdenes idCita={idCita} borrador={borrador} />
        </div>
      </div>
    </div>
  );
}

function SubSeccionReceta({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  const { keycloak } = useKeycloak();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchQ = useDebouncedSearch(searchInput, 400);
  const { data: medicamentos = [], isFetching } = useBuscarMedicamentos(searchQ);
  const nombresMed = useNombresMedicamentos(borrador.lineasReceta.map(l => l.idMedicamento));
  const mut = useAgregarReceta();
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadDTO | null>(null);

  const guardar = async (v: Parameters<typeof mut.mutateAsync>[0]['data']) => {
    try {
      const r = await mut.mutateAsync({ idCita, data: v });
      setDisponibilidad(r.disponibilidadMedicamento);
      form.resetFields();
      setSearchInput('');
      setMostrarForm(false);
      notification.success({ message: 'Medicamento agregado a la receta' });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'No se pudo agregar el medicamento.', description: msg });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Space size={6}>
          <MedicineBoxOutlined style={{ color: C.verde }} />
          <Typography.Text strong style={{ fontSize: 13 }}>Receta médica</Typography.Text>
          {borrador.lineasReceta.length > 0 && (
            <Badge count={borrador.lineasReceta.length} style={{ backgroundColor: C.verde }} />
          )}
        </Space>
        {!mostrarForm && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setMostrarForm(true)}
            style={{ color: C.verde, borderColor: C.verde }}>
            Agregar
          </Button>
        )}
      </div>

      {borrador.lineasReceta.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: mostrarForm ? 12 : 0 }}>
          {borrador.lineasReceta.map((l, i) => (
            <div key={i} style={{
              background: C.verdeClaro, border: `1px solid ${C.verdeBorde}`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              <Typography.Text strong style={{ fontSize: 12 }}>
                {l.nombreMedicamento ?? nombresMed.get(l.idMedicamento) ?? `ID: ${l.idMedicamento}`}
              </Typography.Text>
              {l.principioActivo && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {l.principioActivo}{l.presentacion ? ` · ${l.presentacion}` : ''}
                </Typography.Text>
              )}
              <div style={{ fontSize: 11, color: C.textoSecundario, marginTop: 2 }}>
                {l.dosis} · {l.viaAdministracion} · {l.frecuencia} · {l.duracion}
                {l.cantidadTotal ? ` · ${l.cantidadTotal} uds.` : ''}
              </div>
              {l.indicaciones && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>
                  {l.indicaciones}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div style={{
          background: C.fondoSeccion, border: `1px solid ${C.borde}`,
          borderRadius: 8, padding: 12, marginBottom: 8,
        }}>
          <Form form={form} layout="vertical" onFinish={guardar} size="small">
            <Form.Item name="idMedicamento" label="Medicamento"
              rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
              <Select
                showSearch filterOption={false}
                placeholder="Buscar medicamento..."
                onSearch={setSearchInput} loading={isFetching}
                notFoundContent={searchQ.trim().length < 2 ? 'Escriba al menos 2 caracteres' : 'Sin resultados'}
                options={medicamentos.map(m => ({ value: m.id, label: `${m.nombre} — ${m.presentacion}` }))}
              />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="dosis" label="Dosis"
                  rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <Input placeholder="Ej: 500 mg" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="viaAdministracion" label="Vía"
                  rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <Select showSearch placeholder="Vía"
                    options={VIAS.map(v => ({ value: v, label: v }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="frecuencia" label="Frecuencia"
                  rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <Select showSearch placeholder="Frecuencia"
                    options={FRECUENCIAS.map(f => ({ value: f, label: f }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="duracion" label="Duración"
                  rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <Select showSearch placeholder="Duración"
                    options={DURACIONES.map(d => ({ value: d, label: d }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cantidadTotal" label="Cant. total"
                  rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
                  <InputNumber min={1} placeholder="21" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="indicaciones" label="Indicaciones adicionales" style={{ marginBottom: 8 }}>
                  <Input placeholder="Ej: Tomar con alimentos..." />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" htmlType="submit" loading={mut.isPending} size="small"
                style={{ background: C.verde, borderColor: C.verde }}>
                Agregar
              </Button>
              <Button size="small" onClick={() => { setMostrarForm(false); form.resetFields(); }}>
                Cancelar
              </Button>
            </Space>
          </Form>
        </div>
      )}

      {disponibilidad && (
        <Alert
          type={disponibilidad.cantidadTotal > 0 ? 'info' : 'error'}
          showIcon
          message={disponibilidad.cantidadTotal > 0
            ? `Farmacia: ${disponibilidad.cantidadTotal} unidades disponibles`
            : 'Sin stock disponible en farmacia'}
          style={{ marginTop: 8, borderRadius: 8 }}
        />
      )}
    </div>
  );
}

function SubSeccionOrdenes({ idCita, borrador }: { idCita: number; borrador: BorradorResponseDTO }) {
  const { keycloak } = useKeycloak();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchQ = useDebouncedSearch(searchInput, 400);
  const { data: examenes = [], isFetching } = useBuscarExamenes(searchQ);
  const nombresEx = useNombresExamenes(borrador.lineasOrden.map(l => l.idExamen));
  const mut = useAgregarOrden();

  const guardar = async (v: { idExamen: number; indicacionesPreparacion?: string }) => {
    try {
      await mut.mutateAsync({ idCita, data: v });
      form.resetFields();
      setSearchInput('');
      setMostrarForm(false);
      notification.success({ message: 'Examen agregado a la orden' });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'No se pudo agregar el examen.', description: msg });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Space size={6}>
          <ExperimentOutlined style={{ color: C.purpura }} />
          <Typography.Text strong style={{ fontSize: 13 }}>Órdenes de laboratorio</Typography.Text>
          {borrador.lineasOrden.length > 0 && (
            <Badge count={borrador.lineasOrden.length} style={{ backgroundColor: C.purpura }} />
          )}
        </Space>
        {!mostrarForm && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setMostrarForm(true)}
            style={{ color: C.purpura, borderColor: C.purpura }}>
            Agregar
          </Button>
        )}
      </div>

      {borrador.lineasOrden.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: mostrarForm ? 12 : 0 }}>
          {borrador.lineasOrden.map((l, i) => (
            <div key={i} style={{
              background: C.purpuraClaro, border: `1px solid ${C.purpuraBorde}`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              <Typography.Text strong style={{ fontSize: 12, color: C.purpura }}>
                {l.nombreExamen ?? nombresEx.get(l.idExamen) ?? `ID: ${l.idExamen}`}
              </Typography.Text>
              {l.categoria && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {l.categoria}
                </Typography.Text>
              )}
              {l.indicacionesPreparacion && (
                <div style={{ fontSize: 11, color: C.textoSecundario, marginTop: 2 }}>
                  {l.indicacionesPreparacion}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div style={{
          background: C.fondoSeccion, border: `1px solid ${C.borde}`,
          borderRadius: 8, padding: 12, marginBottom: 8,
        }}>
          <Form form={form} layout="vertical" onFinish={guardar} size="small">
            <Form.Item name="idExamen" label="Examen"
              rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 8 }}>
              <Select
                showSearch filterOption={false}
                placeholder="Buscar examen..."
                onSearch={setSearchInput} loading={isFetching}
                notFoundContent={searchQ.trim().length < 2 ? 'Escriba al menos 2 caracteres' : 'Sin resultados'}
                options={examenes.map(e => ({ value: e.id, label: `${e.nombre} — ${e.categoria}` }))}
              />
            </Form.Item>
            <Form.Item name="indicacionesPreparacion" label="Preparación (opcional)" style={{ marginBottom: 8 }}>
              <Input placeholder="Ej: Ayuno de 8 horas" />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={mut.isPending} size="small"
                style={{ background: C.purpura, borderColor: C.purpura }}>
                Agregar
              </Button>
              <Button size="small" onClick={() => { setMostrarForm(false); form.resetFields(); }}>
                Cancelar
              </Button>
            </Space>
          </Form>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HISTORIAL DEL PACIENTE — Timeline completo en el Drawer
════════════════════════════════════════════════════════════════════════════ */
function HistorialPaciente({ idPaciente }: { idPaciente: number }) {
  const { data: historia, isLoading: loadingHist } = useHistoriaPorPaciente(idPaciente);
  const { data: episodios = [], isLoading: loadingEp } = useEpisodiosPorHistoria(historia?.id ?? null);

  if (loadingHist || loadingEp) return <Centrado><Spin /></Centrado>;

  if (!historia) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Este paciente no tiene consultas previas registradas"
      />
    );
  }

  const episodiosOrdenados = [...episodios].sort(
    (a, b) => new Date(b.fechaAtencion).getTime() - new Date(a.fechaAtencion).getTime()
  );

  return (
    <div>
      {/* Código de historia */}
      <div style={{
        background: C.verdeClaro, border: `1px solid ${C.verdeBorde}`,
        borderRadius: 8, padding: '8px 14px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Typography.Text style={{ color: C.verde, fontWeight: 600, fontSize: 13 }}>
          {historia.codigoHistoria}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Desde {dayjs(historia.fechaCreacion).format('DD/MM/YYYY')}
        </Typography.Text>
      </div>

      {episodiosOrdenados.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin episodios registrados" />
      ) : (
        <Timeline
          items={episodiosOrdenados.map(ep => ({
            color: C.verde,
            dot: <CalendarOutlined style={{ fontSize: 13, color: C.verde }} />,
            children: <EpisodioHistorialCard ep={ep} />,
          }))}
        />
      )}
    </div>
  );
}

function EpisodioHistorialCard({ ep }: { ep: EpisodioClinicoDTO }) {
  const [expandido, setExpandido] = useState(false);
  const sv = ep.signosVitales;

  const signosRelevantes = sv ? [
    sv.presionArterial ? `PA: ${sv.presionArterial}` : null,
    sv.frecuenciaCardiaca != null ? `FC: ${sv.frecuenciaCardiaca} lpm` : null,
    sv.saturacionOxigeno != null ? `SpO₂: ${sv.saturacionOxigeno}%` : null,
    sv.temperatura != null ? `T°: ${sv.temperatura} °C` : null,
    sv.peso != null ? `Peso: ${sv.peso} kg` : null,
  ].filter(Boolean) : [];

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.borde}`, borderRadius: 10,
      overflow: 'hidden', marginBottom: 4,
    }}>
      {/* Cabecera */}
      <div style={{ padding: '10px 14px', background: C.fondoSeccion, borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Typography.Text strong style={{ fontSize: 12, color: C.verde }}>
            {dayjs(ep.fechaAtencion).format('DD MMM YYYY · HH:mm')}
          </Typography.Text>
          {ep.medico && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Dr. {ep.medico.nombres} {ep.medico.apellidos}
              {ep.medico.especialidad ? ` · ${ep.medico.especialidad}` : ''}
            </Typography.Text>
          )}
        </div>
      </div>

      {/* Diagnóstico */}
      <div style={{ padding: '10px 14px' }}>
        <Space size={6} wrap style={{ marginBottom: 6 }}>
          <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>
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
          <Typography.Text strong style={{ fontSize: 13 }}>{ep.diagnostico.descripcion}</Typography.Text>
        </Space>

        {/* Motivo preview */}
        {ep.motivoConsulta && (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.5, marginBottom: 6 }}>
            {ep.motivoConsulta.length > 100 && !expandido
              ? ep.motivoConsulta.slice(0, 100) + '…'
              : ep.motivoConsulta}
          </Typography.Text>
        )}

        {/* Signos vitales mini */}
        {signosRelevantes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {signosRelevantes.map(s => (
              <span key={s} style={{
                fontSize: 11, background: '#F3F4F6', border: '1px solid #E5E7EB',
                borderRadius: 4, padding: '1px 6px', color: '#374151',
              }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Observaciones (expandibles) */}
        {expandido && ep.observacionesClinicas && (
          <div style={{
            background: C.fondoSeccion, borderRadius: 6, padding: '8px 10px',
            marginBottom: 6, fontSize: 12, color: '#4B5563', lineHeight: 1.6,
          }}>
            <Typography.Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 600 }}>
              OBSERVACIONES
            </Typography.Text>
            <div style={{ marginTop: 4 }}>{ep.observacionesClinicas}</div>
          </div>
        )}

        {/* Botón expandir */}
        <Button
          type="link" size="small"
          onClick={() => setExpandido(v => !v)}
          style={{ padding: 0, height: 'auto', fontSize: 11, color: C.verde }}
        >
          {expandido ? 'Ver menos ↑' : 'Ver más ↓'}
        </Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTES REUTILIZABLES
════════════════════════════════════════════════════════════════════════════ */

function Seccion({
  titulo, completa, obligatoria, editando, onEditar, children,
}: {
  titulo: string;
  completa?: boolean;
  obligatoria?: boolean;
  editando?: boolean;
  onEditar?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${completa ? C.verdeBorde : C.borde}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 18px',
        borderBottom: `1px solid ${completa ? C.verdeBorde : C.borde}`,
        background: completa ? C.verdeClaro : C.fondoSeccion,
      }}>
        <Space size={8}>
          <Typography.Text strong style={{ fontSize: 14 }}>{titulo}</Typography.Text>
          {obligatoria && !completa && (
            <Tag color="red" style={{ borderRadius: 10, fontSize: 10 }}>Requerido</Tag>
          )}
          {completa && (
            <CheckCircleOutlined style={{ color: C.verde, fontSize: 14 }} />
          )}
        </Space>
        {!editando && onEditar && completa && (
          <Button size="small" type="text" onClick={onEditar}
            style={{ color: C.verde, fontSize: 12 }}>
            Editar
          </Button>
        )}
      </div>
      <div style={{ padding: '14px 18px' }}>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      background: highlight ? C.rojoFondo : C.fondoSeccion,
      border: `1px solid ${highlight ? C.rojoBorde : C.borde}`,
      borderRadius: 8, padding: '5px 12px', minWidth: 72,
    }}>
      <div style={{ fontSize: 10, color: highlight ? C.rojo : C.textoSecundario, marginBottom: 2, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: highlight ? C.rojo : '#111' }}>
        {value}
      </div>
    </div>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
      {children}
    </div>
  );
}
