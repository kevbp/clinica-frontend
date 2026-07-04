import { useState, useEffect, useMemo } from 'react';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  Table,
  Button,
  Tag,
  Input,
  InputNumber,
  Drawer,
  Form,
  Tabs,
  App,
  Popconfirm,
  Select,
  Empty,
  Spin,
  Typography,
  Space,
  Tooltip,
  Alert,
  TimePicker,
  DatePicker,
  Calendar,
  Checkbox,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/ui/PageHeader';
import {
  useConsultorios,
  useCrearConsultorio,
  useActualizarConsultorio,
  useEliminarConsultorio,
  useDisponibilidadHorarios,
  useTurnosPorPersonal,
  useCrearTurno,
  useActualizarTurno,
  useEliminarTurno,
} from '../../hooks/useHorarios';
import { useEspecialidades, useMedicos } from '../../hooks/usePersonal';
import type { ConsultorioResponseDTO, ProgramacionHorarioResponseDTO } from '../../types/horarios';

const FORMATO_FECHA = 'YYYY-MM-DD';

function inicioDeSemana(d: Dayjs): Dayjs {
  const dia = d.day(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  return d.add(diff, 'day').startOf('day');
}


export default function HorariosPage() {
  const { isError: isServiceDown, error: serviceError } = useDisponibilidadHorarios();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PageHeader title="Horarios" />

      {isServiceDown && (
        <Alert
          type="error"
          showIcon
          message="ms-horarios no disponible"
          description={serviceErrorMessage(serviceError, 'ms-horarios', 8081)}
        />
      )}

      <Tabs
        items={[
          { key: 'consultorios', label: 'Consultorios', children: <ConsultoriosTab /> },
          { key: 'programacion', label: 'Programación de horarios', children: <ProgramacionTab /> },
        ]}
      />
    </div>
  );
}

// ── Tab: Consultorios ───────────────────────────────────────────────────────

function ConsultoriosTab() {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultorioResponseDTO | null>(null);

  const { data: consultorios = [], isLoading } = useConsultorios();
  const crearMut = useCrearConsultorio();
  const actualizarMut = useActualizarConsultorio();
  const eliminarMut = useEliminarConsultorio();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (c: ConsultorioResponseDTO) => {
    setEditing(c);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (drawerOpen && editing) {
      form.setFieldsValue({
        numero: editing.numero,
        piso: editing.piso,
        ubicacion: editing.ubicacion ?? '',
      });
    }
  }, [drawerOpen, editing, form]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    form.resetFields();
  };

  const handleSubmit = async (values: { numero: string; piso: number; ubicacion?: string }) => {
    try {
      if (editing) {
        await actualizarMut.mutateAsync({ id: editing.id, data: values });
        notification.success({ message: 'Consultorio actualizado' });
      } else {
        await crearMut.mutateAsync(values);
        notification.success({ message: 'Consultorio registrado' });
      }
      closeDrawer();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: editing ? 'Error al actualizar el consultorio' : 'Error al registrar el consultorio', description: msg });
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await eliminarMut.mutateAsync(id);
      notification.success({ message: 'Consultorio eliminado' });
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({ message: 'No se puede eliminar', description: msg ?? 'El consultorio tiene turnos de programación asignados.' });
      } else {
        notification.error({ message: 'Error al eliminar el consultorio', description: msg });
      }
    }
  };

  const columns: ColumnsType<ConsultorioResponseDTO> = [
    { title: 'Número', dataIndex: 'numero', width: 140 },
    { title: 'Piso', dataIndex: 'piso', width: 100 },
    { title: 'Ubicación', dataIndex: 'ubicacion', ellipsis: true },
    {
      title: '',
      key: 'acciones',
      width: 100,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este consultorio?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleEliminar(r.id)}
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
          >
            <Tooltip title="Eliminar">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nuevo consultorio
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={consultorios}
          loading={isLoading}
          size="small"
          scroll={{ y: 'calc(100vh - 330px)' }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} consultorios` }}
          locale={{ emptyText: 'Sin consultorios registrados' }}
        />
      </div>

      <Drawer
        title={editing ? 'Editar consultorio' : 'Nuevo consultorio'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={420}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button
              type="primary"
              loading={crearMut.isPending || actualizarMut.isPending}
              onClick={() => form.submit()}
            >
              {editing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="numero"
            label="Número o código"
            rules={[{ required: true, message: 'Ingrese el número del consultorio' }]}
          >
            <Input placeholder="Ej: C-101" />
          </Form.Item>
          <Form.Item
            name="piso"
            label="Piso"
            rules={[{ required: true, message: 'Ingrese el piso' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="Ej: 1" />
          </Form.Item>
          <Form.Item name="ubicacion" label="Ubicación">
            <Input placeholder="Ej: Ala norte, frente a recepción (opcional)" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

// ── Tab: Programación de horarios (drill-down: especialidad → médico → calendario mensual) ─

function ProgramacionTab() {
  const { notification } = App.useApp();
  const [crearForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [idEspecialidad, setIdEspecialidad] = useState<number | null>(null);
  const [idPersonal, setIdPersonal] = useState<number | null>(null);

  const [mesVisible, setMesVisible] = useState<Dayjs>(dayjs());
  const [semanaAnchor, setSemanaAnchor] = useState<Dayjs>(dayjs());

  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<ProgramacionHorarioResponseDTO | null>(null);

  const { data: especialidades = [], isLoading: isLoadingEsp } = useEspecialidades();
  const { data: medicos = [], isLoading: isLoadingMedicos } = useMedicos();
  const { data: consultorios = [] } = useConsultorios();

  // El rango de búsqueda cubre el mes visible del mini-calendario Y la semana de la agenda,
  // ya que esta última puede cruzar el límite de un mes (ej. semana del 29/06 al 05/07).
  const desdeMes = mesVisible.startOf('month');
  const hastaMes = mesVisible.endOf('month');
  const inicioSemanaActual = inicioDeSemana(semanaAnchor);
  const finSemanaActual = inicioSemanaActual.add(6, 'day');
  const desde = (desdeMes.isBefore(inicioSemanaActual) ? desdeMes : inicioSemanaActual).format(FORMATO_FECHA);
  const hasta = (hastaMes.isAfter(finSemanaActual) ? hastaMes : finSemanaActual).format(FORMATO_FECHA);
  const { data: turnos = [], isLoading: isLoadingTurnos } = useTurnosPorPersonal(idPersonal, desde, hasta);

  const crearTurnoMut = useCrearTurno();
  const actualizarTurnoMut = useActualizarTurno();
  const eliminarTurnoMut = useEliminarTurno();

  const medicosFiltrados = useMemo(
    () => medicos.filter(m => m.especialidad.id === idEspecialidad),
    [medicos, idEspecialidad],
  );

  const medicoSeleccionado = medicos.find(m => m.idPersonal === idPersonal) ?? null;

  const turnosPorFecha = useMemo(() => {
    const map = new Map<string, ProgramacionHorarioResponseDTO[]>();
    turnos.forEach(t => {
      const lista = map.get(t.fecha) ?? [];
      lista.push(t);
      map.set(t.fecha, lista);
    });
    map.forEach(lista => lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));
    return map;
  }, [turnos]);

  const handleEspecialidadChange = (value: number) => {
    setIdEspecialidad(value);
    setIdPersonal(null);
  };

  const openCrear = () => {
    crearForm.resetFields();
    setCrearOpen(true);
  };
  const closeCrear = () => {
    setCrearOpen(false);
    crearForm.resetFields();
  };

  const openEditar = (t: ProgramacionHorarioResponseDTO) => {
    if (t.esPasado) return;
    setEditando(t);
    editForm.setFieldsValue({
      idConsultorio: t.consultorio.id,
      fecha: dayjs(t.fecha, FORMATO_FECHA),
      rango: [dayjs(t.horaInicio, 'HH:mm:ss'), dayjs(t.horaFin, 'HH:mm:ss')],
    });
  };
  const closeEditar = () => {
    setEditando(null);
    editForm.resetFields();
  };

  const handleCrearTurnos = async (values: {
    idConsultorio: number; fechas: string[]; rango: [Dayjs, Dayjs];
  }) => {
    if (!idPersonal || values.fechas.length === 0) return;
    const horaInicio = values.rango[0].format('HH:mm');
    const horaFin = values.rango[1].format('HH:mm');

    let creados = 0;
    const fallidas: string[] = [];

    for (const fecha of values.fechas) {
      try {
        await crearTurnoMut.mutateAsync({ idPersonal, idConsultorio: values.idConsultorio, fecha, horaInicio, horaFin });
        creados += 1;
      } catch (err: unknown) {
        const { status, msg } = extractApiError(err);
        const motivo = status === 409 ? (msg ?? 'consultorio ya ocupado')
          : status === 404 ? 'consultorio no encontrado'
          : status === 400 ? (msg ?? 'datos inválidos')
          : msg ?? `error ${status ?? 'desconocido'}`;
        fallidas.push(`${dayjs(fecha, FORMATO_FECHA).format('DD/MM')} (${motivo})`);
      }
    }

    if (creados > 0) {
      notification.success({
        message: creados === 1 ? '1 turno registrado' : `${creados} turnos registrados`,
      });
    }
    if (fallidas.length > 0) {
      notification.error({
        message: fallidas.length === 1 ? '1 turno no se pudo crear' : `${fallidas.length} turnos no se pudieron crear`,
        description: fallidas.join('; '),
      });
    }
    if (fallidas.length === 0) closeCrear();
  };

  const handleEditarTurno = async (values: { idConsultorio: number; fecha: Dayjs; rango: [Dayjs, Dayjs] }) => {
    if (!editando) return;
    try {
      await actualizarTurnoMut.mutateAsync({
        id: editando.id,
        data: {
          idConsultorio: values.idConsultorio,
          fecha: values.fecha.format(FORMATO_FECHA),
          horaInicio: values.rango[0].format('HH:mm'),
          horaFin: values.rango[1].format('HH:mm'),
        },
      });
      notification.success({ message: 'Turno actualizado' });
      closeEditar();
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({ message: 'Conflicto de horario', description: msg ?? 'El consultorio ya está ocupado en esa fecha y franja.' });
      } else {
        notification.error({ message: 'Error al actualizar el turno', description: msg });
      }
    }
  };

  const handleEliminarTurno = async (t: ProgramacionHorarioResponseDTO) => {
    try {
      await eliminarTurnoMut.mutateAsync({ id: t.id, idPersonal: t.idPersonal });
      notification.success({ message: 'Turno eliminado' });
      if (editando?.id === t.id) closeEditar();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al eliminar el turno', description: msg });
    }
  };

  const diasSemanaCreacion = useMemo(() => {
    const lunes = inicioDeSemana(semanaAnchor);
    return Array.from({ length: 7 }, (_, i) => lunes.add(i, 'day'));
  }, [semanaAnchor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selectores de drill-down */}
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
            onClear={() => { setIdEspecialidad(null); setIdPersonal(null); }}
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
            onChange={setIdPersonal}
            options={medicosFiltrados.map(m => ({
              value: m.idPersonal,
              label: `${m.nombres} ${m.apellidos}`,
            }))}
            notFoundContent="Sin médicos en esta especialidad"
          />
        </div>
        {idPersonal && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCrear}>
            Agregar turnos
          </Button>
        )}
      </div>

      {/* Patrón híbrido: mini-calendario de navegación + agenda semanal en lista */}
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 330px)' }}>
        {!idPersonal ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
            <Empty
              description="Seleccione una especialidad y un médico para ver su calendario de turnos"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : isLoadingTurnos ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Mini-calendario — solo navegación, un punto por día con turnos */}
            <div style={{ width: 300, flexShrink: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: 8 }}>
              <Calendar
                fullscreen={false}
                defaultValue={mesVisible}
                onPanelChange={(date) => setMesVisible(date)}
                onSelect={(date) => setSemanaAnchor(date)}
                cellRender={(date, info) => {
                  if (info.type !== 'date') return info.originNode;
                  const turnosDia = turnosPorFecha.get(date.format(FORMATO_FECHA)) ?? [];
                  if (turnosDia.length === 0) return null;
                  const hayFuturos = turnosDia.some(t => !t.esPasado);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Badge status={hayFuturos ? 'success' : 'default'} />
                    </div>
                  );
                }}
              />
            </div>

            {/* Agenda semanal — lista legible con acciones de editar/eliminar */}
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Button icon={<LeftOutlined />} size="small" onClick={() => setSemanaAnchor(prev => prev.subtract(7, 'day'))} />
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {diasSemanaCreacion[0].format('D MMM')} – {diasSemanaCreacion[6].format('D MMM YYYY')}
                </Typography.Text>
                <Button icon={<RightOutlined />} size="small" onClick={() => setSemanaAnchor(prev => prev.add(7, 'day'))} />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                {medicoSeleccionado?.nombres} {medicoSeleccionado?.apellidos} — clic en un turno para editarlo. Las fechas pasadas son solo de consulta (historial).
              </Typography.Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {diasSemanaCreacion.map(d => {
                  const fechaStr = d.format(FORMATO_FECHA);
                  const turnosDia = turnosPorFecha.get(fechaStr) ?? [];
                  const esHoy = d.isSame(dayjs(), 'day');
                  return (
                    <div
                      key={fechaStr}
                      style={{
                        display: 'flex', gap: 12, padding: '10px 4px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ width: 130, flexShrink: 0 }}>
                        <Typography.Text style={{ fontSize: 13, fontWeight: esHoy ? 600 : 500, color: esHoy ? '#0F6E56' : 'var(--text)' }}>
                          {d.format('dddd D MMM')}
                        </Typography.Text>
                        {esHoy && <Tag color="green" style={{ marginLeft: 6, fontSize: 10 }}>Hoy</Tag>}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {turnosDia.length === 0 ? (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Sin turnos</Typography.Text>
                        ) : (
                          turnosDia.map(t => (
                            <div
                              key={t.id}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: t.esPasado ? '#F9FAFB' : '#F0FAF6',
                                border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
                              }}
                            >
                              <Space size={10}>
                                <Typography.Text style={{ fontSize: 13, color: t.esPasado ? 'var(--text-hint)' : 'var(--text)' }}>
                                  {t.horaInicio.slice(0, 5)}–{t.horaFin.slice(0, 5)}
                                </Typography.Text>
                                <Tag style={{ fontSize: 11 }}>{t.consultorio.numero}</Tag>
                              </Space>
                              {!t.esPasado && (
                                <Space size={2}>
                                  <Tooltip title="Editar">
                                    <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditar(t)} />
                                  </Tooltip>
                                  <Popconfirm
                                    title="¿Eliminar este turno?"
                                    onConfirm={() => handleEliminarTurno(t)}
                                    okText="Eliminar"
                                    okButtonProps={{ danger: true }}
                                    cancelText="Cancelar"
                                  >
                                    <Tooltip title="Eliminar">
                                      <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                                    </Tooltip>
                                  </Popconfirm>
                                </Space>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawer — Crear turnos (selección múltiple de fechas, horario uniforme) */}
      <Drawer
        title={medicoSeleccionado ? `Nuevos turnos — ${medicoSeleccionado.nombres} ${medicoSeleccionado.apellidos}` : 'Nuevos turnos'}
        open={crearOpen}
        onClose={closeCrear}
        width={440}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeCrear}>Cancelar</Button>
            <Button type="primary" loading={crearTurnoMut.isPending} onClick={() => crearForm.submit()}>
              Registrar
            </Button>
          </div>
        }
      >
        <Form form={crearForm} layout="vertical" onFinish={handleCrearTurnos}>
          <Form.Item label="Semana">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Button
                icon={<LeftOutlined />}
                size="small"
                onClick={() => setSemanaAnchor(prev => prev.subtract(7, 'day'))}
              />
              <Typography.Text style={{ fontSize: 13 }}>
                {diasSemanaCreacion[0].format('D MMM')} – {diasSemanaCreacion[6].format('D MMM YYYY')}
              </Typography.Text>
              <Button
                icon={<RightOutlined />}
                size="small"
                onClick={() => setSemanaAnchor(prev => prev.add(7, 'day'))}
              />
            </div>
          </Form.Item>
          <Form.Item
            name="fechas"
            label="Días a programar"
            rules={[{ required: true, message: 'Seleccione al menos un día' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {diasSemanaCreacion.map(d => {
                  const esPasado = d.isBefore(dayjs(), 'day');
                  return (
                    <Checkbox key={d.format(FORMATO_FECHA)} value={d.format(FORMATO_FECHA)} disabled={esPasado}>
                      {d.format('dddd D [de] MMMM')}
                      {esPasado && <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>(pasado)</Typography.Text>}
                    </Checkbox>
                  );
                })}
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item
            name="idConsultorio"
            label="Consultorio"
            rules={[{ required: true, message: 'Seleccione el consultorio' }]}
          >
            <Select
              placeholder="Seleccione consultorio"
              options={consultorios.map(c => ({ value: c.id, label: `${c.numero} — Piso ${c.piso}` }))}
            />
          </Form.Item>
          <Form.Item
            name="rango"
            label="Rango horario (uniforme para todos los días seleccionados)"
            rules={[{ required: true, message: 'Seleccione el rango horario' }]}
          >
            <TimePicker.RangePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer — Editar turno puntual */}
      <Drawer
        title="Editar turno"
        open={editando !== null}
        onClose={closeEditar}
        width={420}
        destroyOnClose
        footer={
          editando && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Popconfirm
                title="¿Eliminar este turno?"
                onConfirm={() => handleEliminarTurno(editando)}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
              >
                <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
              </Popconfirm>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={closeEditar}>Cancelar</Button>
                <Button type="primary" loading={actualizarTurnoMut.isPending} onClick={() => editForm.submit()}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          )
        }
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditarTurno}>
          <Form.Item
            name="idConsultorio"
            label="Consultorio"
            rules={[{ required: true, message: 'Seleccione el consultorio' }]}
          >
            <Select
              placeholder="Seleccione consultorio"
              options={consultorios.map(c => ({ value: c.id, label: `${c.numero} — Piso ${c.piso}` }))}
            />
          </Form.Item>
          <Form.Item
            name="fecha"
            label="Fecha"
            rules={[{ required: true, message: 'Seleccione la fecha' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
          <Form.Item
            name="rango"
            label="Rango horario"
            rules={[{ required: true, message: 'Seleccione el rango horario' }]}
          >
            <TimePicker.RangePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
