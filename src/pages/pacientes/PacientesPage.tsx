import { useState, useEffect } from 'react';
import { extractApiError } from '../../utils/errorUtils';
import {
  Table,
  Button,
  Tag,
  Input,
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
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import { consultarDni } from '../../api/pacientes';
import PageHeader from '../../components/ui/PageHeader';
import {
  useBuscarPacientes,
  useDisponibilidadPacientes,
  useCrearPaciente,
  useActualizarPaciente,
  useObtenerPaciente,
  useCambiarEstadoPaciente,
  useAntecedentes,
  useAgregarAntecedente,
  useEliminarAntecedente,
} from '../../hooks/usePacientes';
import type {
  PacienteResponseDTO,
  AntecedenteClinicoResponseDTO,
  TipoAntecedente,
} from '../../types/pacientes';

const ANTECEDENTE_LABELS: Record<TipoAntecedente, string> = {
  ENFERMEDAD_CRONICA: 'Enfermedad crónica',
  ALERGIA:            'Alergia',
  OTRO:               'Otro',
};

const ANTECEDENTE_COLORS: Record<TipoAntecedente, string> = {
  ENFERMEDAD_CRONICA: 'orange',
  ALERGIA:            'red',
  OTRO:               'blue',
};

const RULES_CELULAR = [{ pattern: /^\d{9}$/, message: 'El celular debe tener 9 dígitos' }];
const RULES_CORREO  = [{ type: 'email' as const, message: 'Formato de correo inválido' }];

function calcularEdad(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento) return null;
  return dayjs().diff(dayjs(fechaNacimiento, 'YYYY-MM-DD'), 'year');
}

export default function PacientesPage() {
  const { notification } = App.useApp();
  const [createForm]     = Form.useForm();
  const [editForm]       = Form.useForm();
  const [antForm]        = Form.useForm();

  const [searchInput, setSearchInput]       = useState('');
  const searchQuery                          = useDebouncedSearch(searchInput, 400);
  const [createOpen, setCreateOpen]         = useState(false);
  const [detailId, setDetailId]             = useState<number | null>(null);
  const [activeTab, setActiveTab]           = useState('datos');

  // Búsqueda de DNI en RENIEC (formulario de creación)
  type DniStatus = 'idle' | 'loading' | 'found' | 'not_found';
  const [dniStatus, setDniStatus]                 = useState<DniStatus>('idle');
  const [dniAutocompletado, setDniAutocompletado] = useState(false);
  const [dniInputValue, setDniInputValue]         = useState('');

  const { data: pacientes = [], isLoading: isSearchLoading, isFetching, isError: isSearchError, error: searchError } =
    useBuscarPacientes(searchQuery);
  const { isError: isServiceDown, error: serviceError } = useDisponibilidadPacientes();
  const { data: detailPaciente }            = useObtenerPaciente(detailId);
  const { data: antecedentes = [], isLoading: isAntLoading } = useAntecedentes(detailId);

  const crearMut         = useCrearPaciente();
  const actualizarMut    = useActualizarPaciente();
  const cambiarEstadoMut = useCambiarEstadoPaciente();
  const agregarMut       = useAgregarAntecedente();
  const eliminarMut      = useEliminarAntecedente();

  // Populate edit form when patient detail loads
  useEffect(() => {
    if (detailPaciente) {
      editForm.setFieldsValue({
        nombres:         detailPaciente.nombres,
        apellidos:       detailPaciente.apellidos,
        fechaNacimiento: detailPaciente.fechaNacimiento ? dayjs(detailPaciente.fechaNacimiento, 'YYYY-MM-DD') : undefined,
        direccion:       detailPaciente.direccion ?? '',
        celular:         detailPaciente.celular ?? '',
        correo:          detailPaciente.correo ?? '',
        nombreBanco:     detailPaciente.nombreBanco ?? '',
        numeroCuenta:    detailPaciente.numeroCuenta ?? '',
      });
    }
  }, [detailPaciente, editForm]);

  const openDetail = (p: PacienteResponseDTO) => {
    setDetailId(p.id);
    setActiveTab('datos');
  };

  const closeDetail = () => {
    setDetailId(null);
    antForm.resetFields();
  };

  const resetDniState = () => {
    setDniStatus('idle');
    setDniAutocompletado(false);
    setDniInputValue('');
  };

  const openCreate = () => {
    createForm.resetFields();
    resetDniState();
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    createForm.resetFields();
    resetDniState();
  };

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDniInputValue(v);
    if (dniAutocompletado) {
      createForm.setFieldsValue({ nombres: '', apellidos: '' });
      setDniAutocompletado(false);
    }
    setDniStatus('idle');
  };

  const handleBuscarDni = async () => {
    const dni = dniInputValue.trim();
    if (!/^\d{8}$/.test(dni)) return;
    setDniStatus('loading');
    const resultado = await consultarDni(dni);
    if (resultado) {
      const apellidos = [resultado.apellidoPaterno, resultado.apellidoMaterno]
        .filter(Boolean).join(' ');
      createForm.setFieldsValue({ nombres: resultado.nombres, apellidos });
      setDniStatus('found');
      setDniAutocompletado(true);
    } else {
      setDniStatus('not_found');
      setDniAutocompletado(false);
    }
  };

  const handleCreate = async (values: Record<string, string> & { fechaNacimiento: dayjs.Dayjs }) => {
    try {
      const newPaciente = await crearMut.mutateAsync({
        documentoIdentidad: values.documentoIdentidad,
        nombres:            values.nombres,
        apellidos:          values.apellidos,
        fechaNacimiento:    values.fechaNacimiento.format('YYYY-MM-DD'),
        direccion:          values.direccion || undefined,
        celular:            values.celular || undefined,
        correo:             values.correo || undefined,
      });
      notification.success({ message: 'Paciente registrado exitosamente' });
      closeCreate();
      setDetailId(newPaciente.id);
      setActiveTab('antecedentes');
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({ message: 'Ya existe un paciente con ese documento de identidad.', description: msg });
      } else if (status === 400) {
        notification.error({ message: 'Revise los datos ingresados: documento, celular o correo inválidos.', description: msg });
      } else {
        notification.error({ message: 'Error al registrar el paciente', description: msg });
      }
    }
  };

  const handleUpdate = async (values: Record<string, string> & { fechaNacimiento?: dayjs.Dayjs }) => {
    if (!detailId) return;
    try {
      await actualizarMut.mutateAsync({
        id: detailId,
        data: {
          nombres:         values.nombres,
          apellidos:       values.apellidos,
          fechaNacimiento: values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : undefined,
          // null explícito = limpiar el campo en BD; undefined sería ignorado por Axios
          direccion:       values.direccion?.trim() || null,
          celular:         values.celular?.trim() || null,
          correo:          values.correo?.trim() || null,
          nombreBanco:     values.nombreBanco?.trim() || null,
          numeroCuenta:    values.numeroCuenta?.trim() || null,
        },
      });
      notification.success({ message: 'Datos del paciente actualizados' });
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 400) {
        notification.error({ message: 'Revise los datos ingresados: celular o correo inválidos.', description: msg });
      } else {
        notification.error({ message: 'Error al actualizar los datos del paciente', description: msg });
      }
    }
  };

  const handleCambiarEstado = async (p: PacienteResponseDTO, activo: boolean) => {
    try {
      await cambiarEstadoMut.mutateAsync({ id: p.id, activo });
      notification.success({ message: activo ? 'Paciente habilitado' : 'Paciente deshabilitado' });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: activo ? 'Error al habilitar el paciente' : 'Error al deshabilitar el paciente', description: msg });
    }
  };

  const handleAgregarAntecedente = async (values: Record<string, string>) => {
    if (!detailId) return;
    try {
      await agregarMut.mutateAsync({
        id:   detailId,
        data: { descripcion: values.descripcion, tipo: values.tipo as TipoAntecedente },
      });
      notification.success({ message: 'Antecedente registrado' });
      antForm.resetFields();
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al registrar el antecedente', description: msg });
    }
  };

  const handleEliminarAntecedente = async (idAntecedente: number) => {
    if (!detailId) return;
    try {
      await eliminarMut.mutateAsync({ idPaciente: detailId, idAntecedente });
      notification.success({ message: 'Antecedente eliminado' });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al eliminar el antecedente', description: msg });
    }
  };

  const columns: ColumnsType<PacienteResponseDTO> = [
    {
      title: 'Nombre completo',
      key: 'nombre',
      ellipsis: true,
      render: (_, r) => `${r.nombres} ${r.apellidos}`,
    },
    {
      title: 'Documento de identidad',
      dataIndex: 'documentoIdentidad',
      width: 170,
    },
    {
      title: 'Edad',
      key: 'edad',
      width: 70,
      render: (_, r) => {
        const edad = calcularEdad(r.fechaNacimiento);
        return edad !== null ? `${edad}` : '—';
      },
    },
    {
      title: 'Celular',
      dataIndex: 'celular',
      width: 110,
      ellipsis: true,
    },
    {
      title: 'Correo',
      dataIndex: 'correo',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'estadoActivo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openDetail(r)}>
            Ver detalle
          </Button>
          {r.estadoActivo ? (
            <Popconfirm
              title="¿Deshabilitar este paciente?"
              description="El paciente conservará su historial, pero quedará inactivo."
              onConfirm={() => handleCambiarEstado(r, false)}
              okText="Deshabilitar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
            >
              <Tooltip title="Deshabilitar">
                <Button type="text" icon={<StopOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="¿Habilitar este paciente?"
              onConfirm={() => handleCambiarEstado(r, true)}
              okText="Habilitar"
              cancelText="Cancelar"
            >
              <Tooltip title="Habilitar">
                <Button type="text" icon={<CheckCircleOutlined />} size="small" style={{ color: '#0F6E56' }} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'datos',
      label: 'Datos demográficos',
      children: detailPaciente ? (
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Documento de identidad">
            <Input value={detailPaciente.documentoIdentidad} disabled />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              El documento no puede modificarse.
            </Typography.Text>
          </Form.Item>
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: 'Requerido' }]}>
            <Input disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="apellidos" label="Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
            <Input disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="fechaNacimiento" label="Fecha de nacimiento" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
              disabled={!detailPaciente.estadoActivo}
            />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="celular" label="Celular" rules={RULES_CELULAR}>
            <Input placeholder="Ej: 987654321" maxLength={9} disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="correo" label="Correo" rules={RULES_CORREO}>
            <Input placeholder="Ej: maria.torres@correo.com" disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="nombreBanco" label="Banco (para retiros de saldo)">
            <Input placeholder="Ej: BCP, BBVA, Interbank..." disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          <Form.Item name="numeroCuenta" label="N° de cuenta bancaria">
            <Input placeholder="Ej: 191-12345678-0-62" disabled={!detailPaciente.estadoActivo} />
          </Form.Item>
          {!detailPaciente.estadoActivo && (
            <Typography.Text type="warning" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
              Este paciente está deshabilitado. Habilítelo para poder editar sus datos.
            </Typography.Text>
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={actualizarMut.isPending}
            disabled={!detailPaciente.estadoActivo}
          >
            Guardar cambios
          </Button>
        </Form>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      ),
    },
    {
      key: 'antecedentes',
      label: `Antecedentes${antecedentes.length > 0 ? ` (${antecedentes.length})` : ''}`,
      children: (
        <AntecedentesTab
          antecedentes={antecedentes}
          isLoading={isAntLoading}
          form={antForm}
          onAgregar={handleAgregarAntecedente}
          onEliminar={handleEliminarAntecedente}
          isAgregarPending={agregarMut.isPending}
          isEliminarPending={eliminarMut.isPending}
          disabled={detailPaciente ? !detailPaciente.estadoActivo : false}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>

      <PageHeader
        title="Pacientes"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo paciente
          </Button>
        }
      />

      {/* Buscador */}
      <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-hint)' }} />}
          placeholder="Buscar por nombre, apellido o documento..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          allowClear
          size="large"
          style={{ maxWidth: 500 }}
          suffix={isFetching && searchQuery.length >= 2 ? <Spin size="small" /> : null}
        />
        {searchInput.length > 0 && searchInput.length < 2 && (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
            Ingrese al menos 2 caracteres para buscar.
          </Typography.Text>
        )}
      </div>

      {/* Error de carga / disponibilidad del servicio */}
      {(() => {
        const showSearchError  = isSearchError && searchQuery.length >= 2;
        const showServiceError = isServiceDown && !showSearchError;
        if (!showSearchError && !showServiceError) return null;

        const { status, msg } = extractApiError(showSearchError ? searchError : serviceError);

        return (
          <Alert
            type="error"
            showIcon
            message={showSearchError ? 'No se pudo completar la búsqueda de pacientes' : 'ms-pacientes no disponible'}
            description={
              status === 502 || status === 503
                ? `ms-pacientes no disponible (${status}). Puerto 8083.`
                : msg ?? 'Error desconocido. Revise la consola del navegador.'
            }
          />
        );
      })()}

      {/* Tabla */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
        {searchQuery.length < 2 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Empty
              description="Use el buscador para encontrar pacientes"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={pacientes}
            loading={isSearchLoading}
            size="small"
            scroll={{ y: 'calc(100vh - 310px)' }}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: t => `${t} resultados`,
            }}
            locale={{
              emptyText: 'No se encontraron pacientes. Intente con otro nombre o documento.',
            }}
          />
        )}
      </div>

      {/* Drawer — Nuevo paciente */}
      <Drawer
        title="Nuevo paciente"
        open={createOpen}
        onClose={closeCreate}
        width={480}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeCreate}>Cancelar</Button>
            <Button type="primary" loading={crearMut.isPending} onClick={() => createForm.submit()}>
              Registrar
            </Button>
          </div>
        }
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>

          {/* Documento de identidad con búsqueda RENIEC */}
          <Form.Item label="Documento de identidad" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="documentoIdentidad"
                noStyle
                rules={[
                  { required: true, message: 'Ingrese el documento' },
                  { pattern: /^[A-Za-z0-9]{8,12}$/, message: 'Debe tener entre 8 y 12 caracteres alfanuméricos' },
                ]}
              >
                <Input
                  placeholder="Ej: 12345678"
                  onChange={handleDniChange}
                  allowClear={{ clearIcon: <CloseCircleOutlined style={{ color: '#aaa' }} /> }}
                  suffix={
                    dniStatus === 'found'
                      ? <CheckCircleOutlined style={{ color: '#0F6E56' }} />
                      : undefined
                  }
                />
              </Form.Item>
              <Tooltip title="Buscar en RENIEC">
                <Button
                  icon={<SearchOutlined />}
                  loading={dniStatus === 'loading'}
                  disabled={!/^\d{8}$/.test(dniInputValue)}
                  onClick={handleBuscarDni}
                />
              </Tooltip>
            </Space.Compact>
            {dniStatus === 'found' && (
              <Typography.Text
                style={{ fontSize: 12, color: '#0F6E56', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <CheckCircleOutlined /> Persona encontrada
              </Typography.Text>
            )}
            {dniStatus === 'not_found' && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <CloseCircleOutlined /> Persona no encontrada
              </Typography.Text>
            )}
          </Form.Item>

          <Form.Item
            name="nombres"
            label="Nombres"
            rules={[{ required: true, message: 'Ingrese los nombres' }]}
          >
            <Input
              placeholder="Ej: María Elena"
              readOnly={dniAutocompletado}
              style={dniAutocompletado ? { background: '#f5f5f5', cursor: 'default' } : undefined}
            />
          </Form.Item>
          <Form.Item
            name="apellidos"
            label="Apellidos"
            rules={[{ required: true, message: 'Ingrese los apellidos' }]}
          >
            <Input
              placeholder="Ej: Torres Díaz"
              readOnly={dniAutocompletado}
              style={dniAutocompletado ? { background: '#f5f5f5', cursor: 'default' } : undefined}
            />
          </Form.Item>
          <Form.Item
            name="fechaNacimiento"
            label="Fecha de nacimiento"
            rules={[{ required: true, message: 'Ingrese la fecha de nacimiento' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
              placeholder="Seleccione la fecha"
            />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input placeholder="Dirección del paciente (opcional)" />
          </Form.Item>
          <Form.Item name="celular" label="Celular" rules={RULES_CELULAR}>
            <Input placeholder="Ej: 987654321 (opcional)" maxLength={9} />
          </Form.Item>
          <Form.Item name="correo" label="Correo" rules={RULES_CORREO}>
            <Input placeholder="Ej: maria.torres@correo.com (opcional)" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer — Detalle del paciente */}
      <Drawer
        title={
          detailPaciente ? (
            <Space>
              {`${detailPaciente.nombres} ${detailPaciente.apellidos}`}
              <Tag color={detailPaciente.estadoActivo ? 'green' : 'default'}>
                {detailPaciente.estadoActivo ? 'Activo' : 'Inactivo'}
              </Tag>
            </Space>
          ) : (
            'Detalle del paciente'
          )
        }
        open={detailId !== null}
        onClose={closeDetail}
        width={560}
        destroyOnClose
      >
        {detailId !== null && (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ height: '100%' }}
          />
        )}
      </Drawer>
    </div>
  );
}

// ── Sub-component: AntecedentesTab ──────────────────────────────────────────

interface AntecedentesTabProps {
  antecedentes: AntecedenteClinicoResponseDTO[];
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof Form.useForm<any>>[0];
  onAgregar: (values: Record<string, string>) => void;
  onEliminar: (id: number) => void;
  isAgregarPending: boolean;
  isEliminarPending: boolean;
  disabled: boolean;
}

function AntecedentesTab({
  antecedentes, isLoading, form,
  onAgregar, onEliminar,
  isAgregarPending, isEliminarPending,
  disabled,
}: AntecedentesTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Formulario de nuevo antecedente */}
      <div style={{
        background: '#F9FAFB', border: '1px solid var(--border)',
        borderRadius: 10, padding: 16,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          Agregar antecedente
        </p>
        {disabled && (
          <Typography.Text type="warning" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            Este paciente está deshabilitado. Habilítelo para registrar antecedentes.
          </Typography.Text>
        )}
        <Form form={form} layout="vertical" onFinish={onAgregar} disabled={disabled}>
          <Form.Item
            name="tipo"
            label="Tipo"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
          >
            <Select
              placeholder="Seleccione el tipo"
              options={[
                { value: 'ENFERMEDAD_CRONICA', label: 'Enfermedad crónica' },
                { value: 'ALERGIA',            label: 'Alergia' },
                { value: 'OTRO',               label: 'Otro' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'Describa el antecedente' }]}
          >
            <Input.TextArea rows={2} placeholder="Ej: Hipertensión arterial diagnosticada en 2019" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={isAgregarPending}
            disabled={disabled}
          >
            Agregar
          </Button>
        </Form>
      </div>

      {/* Lista de antecedentes */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : antecedentes.length === 0 ? (
        <Empty
          description="Sin antecedentes registrados"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {antecedentes.map(a => (
            <div
              key={a.id}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <Tag color={ANTECEDENTE_COLORS[a.tipo]} style={{ marginBottom: 6 }}>
                  {ANTECEDENTE_LABELS[a.tipo]}
                </Tag>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                  {a.descripcion}
                </div>
              </div>
              <Popconfirm
                title="¿Eliminar este antecedente?"
                description="Esta acción no se puede deshacer."
                onConfirm={() => onEliminar(a.id)}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                disabled={disabled}
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                  loading={isEliminarPending}
                  disabled={disabled}
                />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
