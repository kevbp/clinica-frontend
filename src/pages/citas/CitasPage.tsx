import { useState, useMemo, useRef } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  Tabs,
  Alert,
  Select,
  DatePicker,
  Button,
  Empty,
  Spin,
  Typography,
  Space,
  Tag,
  Table,
  Drawer,
  Modal,
  Input,
  App,
  Popconfirm,
  Tooltip,
  Checkbox,
  Calendar,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  SearchOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/ui/PageHeader';
import {
  useDisponibilidadCitas,
  useListaCitas,
  useSlotsDisponibles,
  useCrearCita,
  useCancelarPendientePago,
  useCancelarConfirmada,
  useCancelarPorClinica,
  useReagendarCita,
  useNombresPacientes,
} from '../../hooks/useCitas';
import { usePerfilPropio } from '../../hooks/usePerfilPropio';
import { useEspecialidades, useMedicos } from '../../hooks/usePersonal';
import { useTurnosPorPersonal, useConsultorios } from '../../hooks/useHorarios';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import * as pacientesApi from '../../api/pacientes';
import { useQuery } from '@tanstack/react-query';
import type { CitaMedicaResponseDTO, EstadoCita } from '../../types/citas';
import type { PacienteResponseDTO } from '../../types/pacientes';

const FORMATO_FECHA = 'YYYY-MM-DD';

const ESTADO_TAG: Record<EstadoCita, { color: string; label: string }> = {
  PENDIENTE_PAGO: { color: 'gold', label: 'Pendiente de pago' },
  CONFIRMADA: { color: 'blue', label: 'Confirmada' },
  ATENDIDA: { color: 'green', label: 'Atendida' },
  CANCELADA: { color: 'default', label: 'Cancelada' },
};


export default function CitasPage() {
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const puedeAgendar = userRoles.some(r => ['RECEPCIONISTA', 'ADMIN', 'ADMINISTRATIVO'].includes(r));

  const { isError: isServiceDown, error: serviceError } = useDisponibilidadCitas();

  const tabs = [
    ...(puedeAgendar ? [{ key: 'agendar', label: 'Agendar cita', children: <AgendarTab /> }] : []),
    { key: 'listado', label: 'Listado de citas', children: <ListadoTab /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PageHeader title="Citas" />

      {isServiceDown && (
        <Alert
          type="error"
          showIcon
          message="ms-citas no disponible"
          description={serviceErrorMessage(serviceError, 'ms-citas', 8082)}
        />
      )}

      <Tabs defaultActiveKey={puedeAgendar ? 'agendar' : 'listado'} items={tabs} />
    </div>
  );
}

// ── Tab: Agendar cita (drill-down especialidad → médico → fecha → slots) ───

function AgendarTab() {
  const { notification } = App.useApp();

  const [idEspecialidad, setIdEspecialidad] = useState<number | null>(null);
  const [idPersonal, setIdPersonal] = useState<number | null>(null);
  const [mesVisible, setMesVisible] = useState<Dayjs>(dayjs());
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Dayjs>(dayjs());
  const [slotSeleccionado, setSlotSeleccionado] = useState<{ fechaHora: string; idConsultorio: number } | null>(null);

  const { data: especialidades = [], isLoading: isLoadingEsp } = useEspecialidades();
  const { data: medicos = [], isLoading: isLoadingMedicos } = useMedicos();

  const medicosFiltrados = useMemo(
    () => medicos.filter(m => m.especialidad.id === idEspecialidad),
    [medicos, idEspecialidad],
  );
  const medicoSeleccionado = medicos.find(m => m.idPersonal === idPersonal) ?? null;

  // Turnos del médico en el mes visible: solo para marcar en el mini-calendario qué días
  // tiene agenda (recognition rather than recall — heurística de Nielsen #6). La disponibilidad
  // real (bloques libres) se calcula aparte, por día, con useSlotsDisponibles.
  const desdeMes = mesVisible.startOf('month').format(FORMATO_FECHA);
  const hastaMes = mesVisible.endOf('month').format(FORMATO_FECHA);
  const { data: turnosDelMes = [] } = useTurnosPorPersonal(idPersonal, desdeMes, hastaMes);
  const fechasConTurno = useMemo(() => new Set(turnosDelMes.map(t => t.fecha)), [turnosDelMes]);

  const fechaStr = fechaSeleccionada.format(FORMATO_FECHA);
  const { data: slots = [], isLoading: isLoadingSlots } = useSlotsDisponibles(idPersonal, fechaStr);

  const slotsManana = slots.filter(s => dayjs(s.fechaHora).hour() < 12);
  const slotsTarde = slots.filter(s => dayjs(s.fechaHora).hour() >= 12);

  const handleEspecialidadChange = (value: number | null) => {
    setIdEspecialidad(value);
    setIdPersonal(null);
  };

  const handleMedicoChange = (value: number) => {
    setIdPersonal(value);
    setFechaSeleccionada(dayjs());
    setMesVisible(dayjs());
  };

  const closeDrawer = () => setSlotSeleccionado(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Especialidad
          </Typography.Text>
          <Select
            placeholder="Seleccione especialidad"
            style={{ width: 220 }}
            loading={isLoadingEsp}
            value={idEspecialidad}
            onChange={handleEspecialidadChange}
            options={especialidades.map(e => ({ value: e.id, label: e.nombre }))}
            allowClear
            onClear={() => handleEspecialidadChange(null)}
          />
        </div>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Médico
          </Typography.Text>
          <Select
            placeholder={idEspecialidad ? 'Seleccione médico' : 'Primero seleccione una especialidad'}
            style={{ width: 260 }}
            loading={isLoadingMedicos}
            disabled={!idEspecialidad}
            value={idPersonal}
            onChange={handleMedicoChange}
            options={medicosFiltrados.map(m => ({ value: m.idPersonal, label: `${m.nombres} ${m.apellidos}` }))}
            notFoundContent="Sin médicos en esta especialidad"
          />
        </div>
      </div>

      {!idPersonal ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
          <Empty description="Seleccione una especialidad y un médico para ver su disponibilidad" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Mini-calendario — marca con un punto los días en los que el médico tiene agenda */}
          <div style={{ width: 300, flexShrink: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: 8 }}>
            <Calendar
              fullscreen={false}
              value={fechaSeleccionada}
              onPanelChange={(date) => setMesVisible(date)}
              onSelect={(date) => { if (!date.isBefore(dayjs(), 'day')) setFechaSeleccionada(date); }}
              disabledDate={(date) => date.isBefore(dayjs(), 'day')}
              cellRender={(date, info) => {
                if (info.type !== 'date') return info.originNode;
                if (!fechasConTurno.has(date.format(FORMATO_FECHA))) return null;
                return (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Badge status="success" />
                  </div>
                );
              }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', padding: '4px 8px 0' }}>
              <Badge status="success" /> el médico atiende ese día
            </Typography.Text>
          </div>

          {/* Bloques disponibles del día seleccionado, agrupados por franja horaria */}
          <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: 16, minHeight: 280 }}>
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
              {fechaSeleccionada.format('dddd D [de] MMMM')}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
              {medicoSeleccionado?.nombres} {medicoSeleccionado?.apellidos} — clic en un bloque para agendar
            </Typography.Text>

            {isLoadingSlots ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : slots.length === 0 ? (
              <Empty
                description={fechasConTurno.has(fechaStr)
                  ? 'No quedan bloques disponibles ese día'
                  : 'El médico no tiene turno programado ese día'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {slotsManana.length > 0 && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                      Mañana
                    </Typography.Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slotsManana.map(s => (
                        <Button
                          key={s.fechaHora}
                          icon={<ClockCircleOutlined />}
                          onClick={() => setSlotSeleccionado(s)}
                          style={{ borderColor: '#0F6E56', color: '#0F6E56' }}
                        >
                          {dayjs(s.fechaHora).format('HH:mm')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {slotsTarde.length > 0 && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                      Tarde
                    </Typography.Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slotsTarde.map(s => (
                        <Button
                          key={s.fechaHora}
                          icon={<ClockCircleOutlined />}
                          onClick={() => setSlotSeleccionado(s)}
                          style={{ borderColor: '#0F6E56', color: '#0F6E56' }}
                        >
                          {dayjs(s.fechaHora).format('HH:mm')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AgendarDrawer
        slot={slotSeleccionado}
        idPersonal={idPersonal}
        onClose={closeDrawer}
        notification={notification}
      />
    </div>
  );
}

function AgendarDrawer({
  slot,
  idPersonal,
  onClose,
  notification,
}: {
  slot: { fechaHora: string; idConsultorio: number } | null;
  idPersonal: number | null;
  onClose: () => void;
  notification: ReturnType<typeof App.useApp>['notification'];
}) {
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedSearch(searchInput, 400);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);
  const [notificarCorreo, setNotificarCorreo] = useState(true);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['pacientes', 'buscar', searchQuery],
    queryFn: () => pacientesApi.buscar(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  });

  const crearMut = useCrearCita();

  const handleClose = () => {
    setSearchInput('');
    setPacienteSeleccionado(null);
    setNotificarCorreo(true);
    onClose();
  };

  const handleConfirmar = async () => {
    if (!slot || !idPersonal || !pacienteSeleccionado) return;
    try {
      await crearMut.mutateAsync({
        idPaciente: pacienteSeleccionado.id,
        idPersonal,
        fechaHora: slot.fechaHora,
        notificarCorreo: notificarCorreo && Boolean(pacienteSeleccionado.correo),
      });
      notification.success({ message: 'Cita agendada en estado Pendiente de pago' });
      handleClose();
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({ message: 'Horario no disponible', description: msg ?? 'El bloque seleccionado ya está ocupado.' });
      } else {
        notification.error({ message: 'Error al agendar la cita', description: msg });
      }
    }
  };

  return (
    <Drawer
      title="Agendar cita"
      open={slot !== null}
      onClose={handleClose}
      width={420}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            type="primary"
            disabled={!pacienteSeleccionado}
            loading={crearMut.isPending}
            onClick={handleConfirmar}
          >
            Confirmar cita
          </Button>
        </div>
      }
    >
      {slot && (
        <div style={{
          background: '#F0FAF6', border: '1px solid var(--border)', borderRadius: 8,
          padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CalendarOutlined style={{ color: '#0F6E56' }} />
          <Typography.Text strong>
            {dayjs(slot.fechaHora).format('dddd D [de] MMMM, HH:mm')}
          </Typography.Text>
        </div>
      )}

      <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 6 }}>
        Buscar paciente
      </Typography.Text>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--text-hint)' }} />}
        placeholder="Nombre, apellido o documento"
        value={searchInput}
        onChange={(e) => { setSearchInput(e.target.value); setPacienteSeleccionado(null); }}
        allowClear
      />

      <div style={{ marginTop: 10 }}>
        {searchQuery.trim().length < 2 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ingrese al menos 2 caracteres para buscar.
          </Typography.Text>
        ) : isFetching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Spin size="small" />
          </div>
        ) : resultados.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Sin resultados.</Typography.Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {resultados.map(p => {
              const activo = p.estadoActivo;
              const selected = pacienteSeleccionado?.id === p.id;
              return (
                <div
                  key={p.id}
                  role="button"
                  onClick={() => {
                    if (activo) {
                      setPacienteSeleccionado(p);
                      setNotificarCorreo(Boolean(p.correo));
                    }
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8, cursor: activo ? 'pointer' : 'not-allowed',
                    border: selected ? '1.5px solid #0F6E56' : '1px solid var(--border)',
                    background: selected ? '#F0FAF6' : '#fff', opacity: activo ? 1 : 0.5,
                  }}
                >
                  <div>
                    <Typography.Text style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
                      {p.nombres} {p.apellidos}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Doc. {p.documentoIdentidad}
                    </Typography.Text>
                  </div>
                  {!activo && <Tag color="default">Deshabilitado</Tag>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pacienteSeleccionado && (
        <div style={{
          marginTop: 16, background: '#F0FAF6', border: '1px solid var(--border)',
          borderRadius: 8, padding: 12,
        }}>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Paciente seleccionado
          </Typography.Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <Row label="Nombres" value={`${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos}`} />
            <Row label="Documento" value={pacienteSeleccionado.documentoIdentidad} />
            <Row label="Celular" value={pacienteSeleccionado.celular || '—'} />
            <Row label="Correo" value={pacienteSeleccionado.correo || '—'} />
          </div>
          <Checkbox
            checked={notificarCorreo}
            disabled={!pacienteSeleccionado.correo}
            onChange={(e) => setNotificarCorreo(e.target.checked)}
          >
            Notificar por correo al paciente
          </Checkbox>
          {!pacienteSeleccionado.correo && (
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              El paciente no tiene correo registrado.
            </Typography.Text>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
      <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>{value}</Typography.Text>
    </div>
  );
}

// ── Tab: Listado de citas ───────────────────────────────────────────────────

function ListadoTab() {
  const { notification } = App.useApp();
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const esMedico = userRoles.includes('MEDICO') && !userRoles.includes('ADMIN');

  const { data: perfilPropio } = usePerfilPropio();
  const idPersonalPropio = perfilPropio?.id ?? null;

  const [idEspecialidad, setIdEspecialidad] = useState<number | null>(null);
  // Médico ve sus propias citas por defecto; otros roles sin pre-filtro.
  // Se inicializa en null y se sobreescribe cuando el perfil carga (ver efecto en el render).
  const [idPersonal, setIdPersonal] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoCita | undefined>(undefined);
  const [fecha, setFecha] = useState<Dayjs | null>(null);
  const [reagendando, setReagendando] = useState<CitaMedicaResponseDTO | null>(null);
  const [citaACancelar, setCitaACancelar] = useState<CitaMedicaResponseDTO | null>(null);

  // Búsqueda de paciente por nombre/documento
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [opcionesPaciente, setOpcionesPaciente] = useState<{ value: number; label: string }[]>([]);
  const [idPaciente, setIdPaciente] = useState<number | null>(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cuando el perfil carga y el usuario es médico, inicializar el filtro de médico con su propio ID.
  const idPersonalEfectivo = esMedico && idPersonal === null
    ? (idPersonalPropio ?? null)
    : idPersonal;

  const { data: especialidades = [] } = useEspecialidades();
  const { data: medicos = [] } = useMedicos();
  const { data: consultorios = [] } = useConsultorios();
  const consultorioMap = useMemo(() => new Map(consultorios.map(c => [c.id, c.numero])), [consultorios]);
  const { data: citasSinFiltrarPorEspecialidad = [], isLoading } = useListaCitas({
    idPersonal: idPersonalEfectivo ?? undefined,
    idPaciente: idPaciente ?? undefined,
    estado,
    fecha: fecha ? fecha.format(FORMATO_FECHA) : undefined,
  });

  // El backend no filtra por especialidad (la cita solo guarda idPersonal): se acota en
  // cliente usando la especialidad de cada médico ya cargada en useMedicos.
  const citas = idEspecialidad === null
    ? citasSinFiltrarPorEspecialidad
    : citasSinFiltrarPorEspecialidad.filter(c => {
        const medico = medicos.find(m => m.idPersonal === c.idPersonal);
        return medico?.especialidad.id === idEspecialidad;
      });

  const medicosFiltrados = idEspecialidad === null
    ? medicos
    : medicos.filter(m => m.especialidad.id === idEspecialidad);

  const handleBuscarPaciente = (texto: string) => {
    setBusquedaPaciente(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto || texto.trim().length < 2) {
      setOpcionesPaciente([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscandoPaciente(true);
      try {
        const resultados = await pacientesApi.buscar(texto.trim());
        setOpcionesPaciente(
          resultados.map(p => ({
            value: p.id,
            label: `${p.nombres} ${p.apellidos} — ${p.documentoIdentidad}`,
          })),
        );
      } catch {
        setOpcionesPaciente([]);
      } finally {
        setBuscandoPaciente(false);
      }
    }, 350);
  };

  const handleSeleccionarPaciente = (id: number, opcion: { value: number; label: string }) => {
    setIdPaciente(id);
    setBusquedaPaciente(opcion.label);
  };

  const handleLimpiarPaciente = () => {
    setIdPaciente(null);
    setBusquedaPaciente('');
    setOpcionesPaciente([]);
  };

  const handleEspecialidadChange = (value: number | null) => {
    setIdEspecialidad(value);
    setIdPersonal(null);
  };

  const nombresPacientes = useNombresPacientes(citas.map(c => c.idPaciente));
  const cancelarPendienteMut = useCancelarPendientePago();
  const cancelarConfirmadaMut = useCancelarConfirmada();
  const cancelarPorClinicaMut = useCancelarPorClinica();

  const nombreMedico = (idPersonalCita: number) => {
    const m = medicos.find(med => med.idPersonal === idPersonalCita);
    return m ? `${m.nombres} ${m.apellidos}` : `#${idPersonalCita}`;
  };

  const handleCancelarPendiente = async (id: number) => {
    try {
      await cancelarPendienteMut.mutateAsync(id);
      notification.success({ message: 'Cita cancelada' });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al cancelar la cita', description: msg });
    }
  };

  const handleCancelarConfirmada = async (id: number) => {
    try {
      await cancelarConfirmadaMut.mutateAsync(id);
      notification.success({ message: 'Cita cancelada — nota de crédito emitida' });
      setCitaACancelar(null);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al cancelar la cita', description: msg });
    }
  };

  const handleCancelarPorClinica = async (id: number) => {
    try {
      await cancelarPorClinicaMut.mutateAsync(id);
      notification.success({ message: 'Cita cancelada por la clínica — nota de crédito total emitida' });
      setCitaACancelar(null);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al cancelar la cita', description: msg });
    }
  };

  const columns: ColumnsType<CitaMedicaResponseDTO> = [
    {
      title: 'N°',
      dataIndex: 'id',
      width: 55,
      render: (v: number) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>#{v}</Typography.Text>,
    },
    {
      title: 'Paciente',
      key: 'paciente',
      render: (_, r) => nombresPacientes.get(r.idPaciente) ?? <Spin size="small" />,
    },
    {
      title: 'Especialidad',
      key: 'especialidad',
      width: 160,
      render: (_, r) => {
        const m = medicos.find(med => med.idPersonal === r.idPersonal);
        return m?.especialidad.nombre ?? '—';
      },
    },
    {
      title: 'Médico',
      key: 'medico',
      width: 180,
      render: (_, r) => nombreMedico(r.idPersonal),
    },
    {
      title: 'Fecha y hora',
      dataIndex: 'fechaHora',
      width: 155,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.fechaHora).valueOf() - dayjs(b.fechaHora).valueOf(),
    },
    {
      title: 'Consultorio',
      dataIndex: 'idConsultorio',
      width: 110,
      render: (v: number) => {
        const num = consultorioMap.get(v);
        return num ? `Cons. ${num}` : `#${v}`;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 155,
      render: (v: EstadoCita) => <Tag color={ESTADO_TAG[v].color}>{ESTADO_TAG[v].label}</Tag>,
    },
    {
      title: '',
      key: 'acciones',
      width: 110,
      render: (_, r) => {
        if (r.estado === 'PENDIENTE_PAGO') {
          return (
            <Space size={2}>
              <Tooltip title="Reagendar">
                <Button type="text" icon={<SwapOutlined />} size="small" onClick={() => setReagendando(r)} />
              </Tooltip>
              <Popconfirm
                title="¿Cancelar esta cita?"
                description="No tiene penalidad: aún no hay pago."
                onConfirm={() => handleCancelarPendiente(r.id)}
                okText="Cancelar cita"
                okButtonProps={{ danger: true }}
                cancelText="Volver"
              >
                <Tooltip title="Cancelar">
                  <Button type="text" icon={<CloseCircleOutlined />} size="small" danger />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        }
        if (r.estado === 'CONFIRMADA') {
          return (
            <Space size={2}>
              <Tooltip title="Reagendar">
                <Button type="text" icon={<SwapOutlined />} size="small" onClick={() => setReagendando(r)} />
              </Tooltip>
              <Tooltip title="Cancelar (paciente / clínica)">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  size="small"
                  danger
                  onClick={() => setCitaACancelar(r)}
                />
              </Tooltip>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{
        background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>

        {/* Búsqueda de paciente — disponible para todos los roles */}
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Buscar paciente
          </Typography.Text>
          <Select
            showSearch
            value={idPaciente ?? undefined}
            placeholder="Nombre o N° documento..."
            style={{ width: 260 }}
            filterOption={false}
            searchValue={busquedaPaciente}
            onSearch={handleBuscarPaciente}
            onSelect={handleSeleccionarPaciente}
            onClear={handleLimpiarPaciente}
            allowClear
            loading={buscandoPaciente}
            notFoundContent={
              busquedaPaciente.length < 2
                ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>Escribe al menos 2 caracteres</Typography.Text>
                : buscandoPaciente
                  ? <Spin size="small" />
                  : 'Sin resultados'
            }
            options={opcionesPaciente}
          />
        </div>

        {/* Filtros de especialidad y médico — solo para roles no-médico */}
        {!esMedico && (
          <>
            <div>
              <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
                Especialidad
              </Typography.Text>
              <Select
                placeholder="Todas las especialidades"
                style={{ width: 200 }}
                value={idEspecialidad}
                onChange={handleEspecialidadChange}
                allowClear
                onClear={() => handleEspecialidadChange(null)}
                options={especialidades.map(e => ({ value: e.id, label: e.nombre }))}
              />
            </div>
            <div>
              <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
                Médico
              </Typography.Text>
              <Select
                placeholder="Todos los médicos"
                style={{ width: 240 }}
                value={idPersonal}
                onChange={setIdPersonal}
                allowClear
                options={medicosFiltrados.map(m => ({ value: m.idPersonal, label: `${m.nombres} ${m.apellidos}` }))}
                notFoundContent={idEspecialidad ? 'Sin médicos en esta especialidad' : undefined}
              />
            </div>
          </>
        )}

        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Estado
          </Typography.Text>
          <Select
            placeholder="Todos los estados"
            style={{ width: 200 }}
            value={estado}
            onChange={setEstado}
            allowClear
            options={Object.entries(ESTADO_TAG).map(([value, { label }]) => ({ value, label }))}
          />
        </div>
        <div>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
            Fecha
          </Typography.Text>
          <DatePicker value={fecha} onChange={setFecha} format="DD/MM/YYYY" allowClear />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={citas}
          loading={isLoading}
          size="small"
          scroll={{ y: 'calc(100vh - 380px)' }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} citas` }}
          locale={{ emptyText: 'Sin citas registradas con estos filtros' }}
        />
      </div>

      <ReagendarDrawer cita={reagendando} onClose={() => setReagendando(null)} notification={notification} />

      <CancelarCitaModal
        cita={citaACancelar}
        onCancelarPaciente={handleCancelarConfirmada}
        onCancelarClinica={handleCancelarPorClinica}
        cargandoPaciente={cancelarConfirmadaMut.isPending}
        cargandoClinica={cancelarPorClinicaMut.isPending}
        onClose={() => setCitaACancelar(null)}
      />
    </div>
  );
}

// ── Modal de cancelación con política de penalidad ──────────────────────────

function CancelarCitaModal({
  cita,
  onCancelarPaciente,
  onCancelarClinica,
  cargandoPaciente,
  cargandoClinica,
  onClose,
}: {
  cita: CitaMedicaResponseDTO | null;
  onCancelarPaciente: (id: number) => void;
  onCancelarClinica: (id: number) => void;
  cargandoPaciente: boolean;
  cargandoClinica: boolean;
  onClose: () => void;
}) {
  if (!cita) return null;

  const ahora = dayjs();
  const fechaCita = dayjs(cita.fechaHora);
  const horasRestantes = fechaCita.diff(ahora, 'hour', true);
  const conAnticipacion = horasRestantes >= 24;

  return (
    <Modal
      open={cita !== null}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      destroyOnClose
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          Cancelar cita confirmada
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        {/* Resumen de la cita */}
        <div style={{
          background: '#F5F5F5', borderRadius: 8, padding: '10px 14px',
          fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">Cita N°</Typography.Text>
            <Typography.Text strong>#{cita.id}</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">Fecha programada</Typography.Text>
            <Typography.Text strong>{fechaCita.format('DD/MM/YYYY HH:mm')}</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">Tiempo restante</Typography.Text>
            <Typography.Text strong style={{ color: conAnticipacion ? '#389e0d' : '#cf1322' }}>
              {horasRestantes >= 1
                ? `${Math.floor(horasRestantes)}h ${Math.round((horasRestantes % 1) * 60)}min`
                : `${Math.round(horasRestantes * 60)} min`}
            </Typography.Text>
          </div>
        </div>

        {/* Sección: Cancelación por el paciente */}
        <div style={{
          border: `1px solid ${conAnticipacion ? '#b7eb8f' : '#ffbb96'}`,
          borderRadius: 8,
          padding: '12px 14px',
          background: conAnticipacion ? '#f6ffed' : '#fff2e8',
        }}>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Cancelación por el paciente
          </Typography.Text>
          {conAnticipacion ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <InfoCircleOutlined style={{ color: '#389e0d', marginTop: 2 }} />
                <Typography.Text>
                  La cita se cancela con <strong>≥24h de anticipación</strong>.
                  Se emitirá nota de crédito por el <strong>100 %</strong> del pago.
                </Typography.Text>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <ExclamationCircleOutlined style={{ color: '#fa8c16', marginTop: 2 }} />
                <Typography.Text>
                  La cita se cancela con <strong>menos de 24h de anticipación</strong>.
                  Se aplica <Tag color="orange" style={{ margin: 0 }}>Penalidad 30 %</Tag>
                </Typography.Text>
              </div>
              <div style={{ background: '#fff7e6', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#666' }}>Monto retenido (penalidad 30 %)</span>
                  <Typography.Text type="danger">Se descuenta del pago</Typography.Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Nota de crédito emitida (70 %)</span>
                  <Typography.Text strong>Saldo devuelto</Typography.Text>
                </div>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                El saldo (70 %) podrá aplicarse como crédito para una reprogramación o ser devuelto al paciente.
              </Typography.Text>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Popconfirm
              title={conAnticipacion ? '¿Confirmar cancelación sin penalidad?' : '¿Confirmar cancelación con penalidad del 30 %?'}
              description={conAnticipacion
                ? 'Se emitirá nota de crédito por el 100 % del pago.'
                : 'Se retendrá el 30 % como penalidad y se emitirá NC por el 70 % restante.'}
              okText="Sí, cancelar"
              okButtonProps={{ danger: true }}
              cancelText="Volver"
              onConfirm={() => onCancelarPaciente(cita.id)}
            >
              <Button danger loading={cargandoPaciente} style={{ width: '100%' }}>
                {conAnticipacion ? 'Cancelar — devolución total' : 'Cancelar — con penalidad del 30 %'}
              </Button>
            </Popconfirm>
          </div>
        </div>

        {/* Sección: Cancelación por la clínica */}
        <div style={{
          border: '1px solid #91caff',
          borderRadius: 8,
          padding: '12px 14px',
          background: '#e6f4ff',
        }}>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Cancelación por parte de la clínica
          </Typography.Text>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, marginBottom: 10 }}>
            <MedicineBoxOutlined style={{ color: '#1677ff', marginTop: 2 }} />
            <Typography.Text>
              Por <strong>fuerza mayor</strong> (ausencia del médico, falla técnica, cierre imprevisto).
              Se emitirá nota de crédito por el <strong>100 %</strong> del pago sin importar la anticipación.
            </Typography.Text>
          </div>
          <Popconfirm
            title="¿Cancelar la cita por parte de la clínica?"
            description="Se emitirá nota de crédito por el 100 % del pago. Esta acción no se puede deshacer."
            okText="Sí, cancelar por la clínica"
            okButtonProps={{ danger: true }}
            cancelText="Volver"
            onConfirm={() => onCancelarClinica(cita.id)}
          >
            <Button loading={cargandoClinica} style={{ width: '100%' }}>
              Cancelar por la clínica — devolución total
            </Button>
          </Popconfirm>
        </div>
      </div>
    </Modal>
  );
}

function ReagendarDrawer({
  cita,
  onClose,
  notification,
}: {
  cita: CitaMedicaResponseDTO | null;
  onClose: () => void;
  notification: ReturnType<typeof App.useApp>['notification'];
}) {
  const [mesVisible, setMesVisible] = useState<Dayjs>(dayjs());
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Dayjs>(dayjs());
  const [slotSeleccionado, setSlotSeleccionado] = useState<string | null>(null);
  const reagendarMut = useReagendarCita();

  const idPersonal = cita?.idPersonal ?? null;

  const desdeMes = mesVisible.startOf('month').format(FORMATO_FECHA);
  const hastaMes = mesVisible.endOf('month').format(FORMATO_FECHA);
  const { data: turnosDelMes = [] } = useTurnosPorPersonal(idPersonal, desdeMes, hastaMes);
  const fechasConTurno = useMemo(() => new Set(turnosDelMes.map(t => t.fecha)), [turnosDelMes]);

  const fechaStr = fechaSeleccionada.format(FORMATO_FECHA);
  const { data: slots = [], isLoading: isLoadingSlots } = useSlotsDisponibles(idPersonal, fechaStr);

  const slotsManana = slots.filter(s => dayjs(s.fechaHora).hour() < 12);
  const slotsTarde = slots.filter(s => dayjs(s.fechaHora).hour() >= 12);

  const handleClose = () => {
    setMesVisible(dayjs());
    setFechaSeleccionada(dayjs());
    setSlotSeleccionado(null);
    onClose();
  };

  const handleConfirmar = async () => {
    if (!cita || !slotSeleccionado) return;
    try {
      await reagendarMut.mutateAsync({ id: cita.id, data: { nuevaFechaHora: slotSeleccionado } });
      notification.success({ message: 'Cita reagendada', description: 'Se enviará una notificación al paciente.' });
      handleClose();
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({ message: 'Horario no disponible', description: msg ?? 'El nuevo horario ya está ocupado o no corresponde a un turno del médico.' });
      } else if (status === 400) {
        notification.error({ message: 'Anticipación insuficiente', description: msg ?? 'Se requieren al menos 24h de anticipación para reagendar una cita confirmada.' });
      } else {
        notification.error({ message: 'Error al reagendar la cita', description: msg });
      }
    }
  };

  const esConfirmada = cita?.estado === 'CONFIRMADA';

  return (
    <Drawer
      title="Reagendar cita"
      open={cita !== null}
      onClose={handleClose}
      width={460}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            type="primary"
            disabled={!slotSeleccionado}
            loading={reagendarMut.isPending}
            onClick={handleConfirmar}
          >
            Confirmar reagendamiento
          </Button>
        </div>
      }
    >
      {cita && (
        <div style={{
          background: '#FFF8E6', border: '1px solid #FFD666', borderRadius: 8,
          padding: 10, marginBottom: 14, fontSize: 12, color: '#7A4F00',
        }}>
          <strong>Cita actual:</strong> {dayjs(cita.fechaHora).format('DD/MM/YYYY HH:mm')}
          {esConfirmada && ' — requiere ≥24h de anticipación para reagendar.'}
        </div>
      )}

      {slotSeleccionado && (
        <div style={{
          background: '#F0FAF6', border: '1px solid var(--border)', borderRadius: 8,
          padding: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CalendarOutlined style={{ color: '#0F6E56' }} />
          <Typography.Text strong style={{ fontSize: 13 }}>
            Nuevo horario: {dayjs(slotSeleccionado).format('dddd D [de] MMMM, HH:mm')}
          </Typography.Text>
          <Button type="link" size="small" onClick={() => setSlotSeleccionado(null)} style={{ marginLeft: 'auto', padding: 0 }}>
            Cambiar
          </Button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
        {/* Mini-calendario */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', padding: 6 }}>
          <Calendar
            fullscreen={false}
            value={fechaSeleccionada}
            onPanelChange={(date) => setMesVisible(date)}
            onSelect={(date) => {
              if (!date.isBefore(dayjs(), 'day')) {
                setFechaSeleccionada(date);
                setSlotSeleccionado(null);
              }
            }}
            disabledDate={(date) => date.isBefore(dayjs(), 'day')}
            cellRender={(date, info) => {
              if (info.type !== 'date') return info.originNode;
              if (!fechasConTurno.has(date.format(FORMATO_FECHA))) return null;
              return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Badge status="success" />
                </div>
              );
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', padding: '2px 6px 4px' }}>
            <Badge status="success" /> el médico atiende ese día
          </Typography.Text>
        </div>

        {/* Slots disponibles */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', padding: 14, minHeight: 120 }}>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
            {fechaSeleccionada.format('dddd D [de] MMMM')}
          </Typography.Text>
          {isLoadingSlots ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <Spin size="small" />
            </div>
          ) : slots.length === 0 ? (
            <Empty
              description={fechasConTurno.has(fechaStr)
                ? 'No quedan bloques disponibles ese día'
                : 'El médico no tiene turno programado ese día'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slotsManana.length > 0 && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                    Mañana
                  </Typography.Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slotsManana.map(s => (
                      <Button
                        key={s.fechaHora}
                        size="small"
                        icon={<ClockCircleOutlined />}
                        type={slotSeleccionado === s.fechaHora ? 'primary' : 'default'}
                        onClick={() => setSlotSeleccionado(s.fechaHora)}
                        style={slotSeleccionado === s.fechaHora ? {} : { borderColor: '#0F6E56', color: '#0F6E56' }}
                      >
                        {dayjs(s.fechaHora).format('HH:mm')}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {slotsTarde.length > 0 && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                    Tarde
                  </Typography.Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slotsTarde.map(s => (
                      <Button
                        key={s.fechaHora}
                        size="small"
                        icon={<ClockCircleOutlined />}
                        type={slotSeleccionado === s.fechaHora ? 'primary' : 'default'}
                        onClick={() => setSlotSeleccionado(s.fechaHora)}
                        style={slotSeleccionado === s.fechaHora ? {} : { borderColor: '#0F6E56', color: '#0F6E56' }}
                      >
                        {dayjs(s.fechaHora).format('HH:mm')}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
