import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { extractApiError } from '../../utils/errorUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import {
  Table,
  Button,
  Tag,
  Input,
  Select,
  Drawer,
  Form,
  DatePicker,
  Popconfirm,
  Tooltip,
  Divider,
  Space,
  App,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import PageHeader from '../../components/ui/PageHeader';
import * as personalApi from '../../api/personal';
import {
  useListaPersonal,
  useCrearPersonal,
  useActualizarPersonal,
  useHabilitarPersonal,
  useDeshabilitarPersonal,
  useEspecialidades,
  useRegistrarMedico,
  useActualizarEspecialidad,
  useEliminarEspecialidad,
} from '../../hooks/usePersonal';
import type { PersonalDTO, TipoPersonal, EspecialidadDTO } from '../../types/personal';

const TIPO_LABELS: Record<TipoPersonal, string> = {
  MEDICO:              'Médico',
  RECEPCIONISTA:       'Recepcionista',
  TECNICO_LABORATORIO: 'Técnico de Laboratorio',
  ADMINISTRATIVO:      'Administrativo',
  ADMIN:               'Administrador',
};

const TIPO_COLORS: Record<TipoPersonal, string> = {
  MEDICO:              'green',
  RECEPCIONISTA:       'blue',
  TECNICO_LABORATORIO: 'purple',
  ADMINISTRATIVO:      'orange',
  ADMIN:               'red',
};

type DrawerMode = 'create' | 'edit' | null;

export default function PersonalPage() {
  const location = useLocation();
  const { notification } = App.useApp();
  const { keycloak }      = useKeycloak();
  const [form]    = Form.useForm();
  const [espForm] = Form.useForm();
  const qc        = useQueryClient();

  const isAdmin = (keycloak.realmAccess?.roles ?? []).includes('ADMIN');

  const TIPO_OPTIONS = [
    { value: 'MEDICO',              label: 'Médico' },
    { value: 'RECEPCIONISTA',       label: 'Recepcionista' },
    { value: 'TECNICO_LABORATORIO', label: 'Técnico de Laboratorio' },
    { value: 'ADMINISTRATIVO',      label: 'Administrativo' },
    ...(isAdmin ? [{ value: 'ADMIN', label: 'Administrador' }] : []),
  ];

  // Filtros
  const [nombre, setNombre]             = useState('');
  const [tipoFilter, setTipoFilter]     = useState<TipoPersonal | undefined>();
  const [estadoFilter, setEstadoFilter] = useState<boolean | undefined>();

  // Drawer — Personal
  const [drawerMode, setDrawerMode]           = useState<DrawerMode>(null);
  const [editingPersonal, setEditingPersonal] = useState<PersonalDTO | null>(null);

  // Drawer — Especialidades
  const [espOpen, setEspOpen]           = useState(false);
  const [editingEsp, setEditingEsp]     = useState<EspecialidadDTO | null>(null);

  // Queries
  const { data: lista = [], isLoading, isError, error } = useListaPersonal({ nombre: nombre || undefined, tipoPersonal: tipoFilter, estadoActivo: estadoFilter });
  const { data: especialidades = [] }    = useEspecialidades();

  // Mutations — Personal
  const crearMut        = useCrearPersonal();
  const actualizarMut   = useActualizarPersonal();
  const habilitarMut    = useHabilitarPersonal();
  const deshabilitarMut = useDeshabilitarPersonal();
  const medicoMut       = useRegistrarMedico();

  // Mutations — Especialidades
  const actualizarEspMut = useActualizarEspecialidad();
  const eliminarEspMut   = useEliminarEspecialidad();

  const openCreate = () => {
    form.resetFields();
    setEditingPersonal(null);
    setDrawerMode('create');
  };

  const openEdit = (p: PersonalDTO) => {
    form.resetFields();
    setEditingPersonal(p);
    setDrawerMode('edit');
  };

  // Poblar el form DESPUÉS de que el Drawer esté montado para que los Form.Item
  // condicionales (shouldUpdate) ya existan en el DOM al recibir los valores.
  useEffect(() => {
    if (drawerMode === 'edit' && editingPersonal) {
      form.setFieldsValue({
        nombres:            editingPersonal.nombres,
        apellidos:          editingPersonal.apellidos,
        documentoIdentidad: editingPersonal.documentoIdentidad,
        celular:            editingPersonal.celular ?? '',
        correo:             editingPersonal.correo ?? '',
        fechaIngreso:       editingPersonal.fechaIngreso ? dayjs(editingPersonal.fechaIngreso) : null,
        tipoPersonal:       editingPersonal.tipoPersonal,
        numeroColegiatura:  editingPersonal.medicoInfo?.numeroColegiatura ?? '',
        idEspecialidad:     editingPersonal.medicoInfo?.especialidad.id ?? null,
        _keycloakUserId_readonly: editingPersonal.keycloakUserId ?? '',
      });
    }
  }, [drawerMode, editingPersonal, form]);

  const closeDrawer = () => {
    setDrawerMode(null);
    setEditingPersonal(null);
    form.resetFields();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const fechaIngreso = values.fechaIngreso
      ? dayjs(values.fechaIngreso as string).format('YYYY-MM-DD')
      : '';

    if (drawerMode === 'create') {
      try {
        const response = await crearMut.mutateAsync({
          nombres:            String(values.nombres ?? ''),
          apellidos:          String(values.apellidos ?? ''),
          documentoIdentidad: String(values.documentoIdentidad ?? ''),
          celular:            values.celular ? String(values.celular) : undefined,
          correo:             values.correo  ? String(values.correo)  : undefined,
          fechaIngreso,
          tipoPersonal:       values.tipoPersonal as TipoPersonal,
          keycloakUserId:     values.keycloakUserId ? String(values.keycloakUserId) : undefined,
          numeroColegiatura:  values.tipoPersonal === 'MEDICO' && values.numeroColegiatura
                                ? String(values.numeroColegiatura) : undefined,
          idEspecialidad:     values.tipoPersonal === 'MEDICO' && values.idEspecialidad
                                ? Number(values.idEspecialidad) : undefined,
        });
        notification.success({ message: 'Personal registrado exitosamente' });
        closeDrawer();
      } catch (err: unknown) {
        const { status, msg } = extractApiError(err);
        if (status === 409) {
          notification.error({ message: 'Ya existe un personal con ese documento o usuario de Keycloak.', description: msg });
        } else {
          notification.error({ message: 'Error al registrar el personal', description: msg });
        }
      }

    } else if (drawerMode === 'edit' && editingPersonal) {
      try {
        await actualizarMut.mutateAsync({
          id: editingPersonal.id,
          data: {
            nombres:            String(values.nombres ?? ''),
            apellidos:          String(values.apellidos ?? ''),
            documentoIdentidad: String(values.documentoIdentidad ?? ''),
            celular:            values.celular ? String(values.celular) : undefined,
            correo:             values.correo  ? String(values.correo)  : undefined,
            fechaIngreso,
            tipoPersonal:       values.tipoPersonal as TipoPersonal,
            numeroColegiatura:  values.tipoPersonal === 'MEDICO' && values.numeroColegiatura
                                  ? String(values.numeroColegiatura) : undefined,
            idEspecialidad:     values.tipoPersonal === 'MEDICO' && values.idEspecialidad
                                  ? Number(values.idEspecialidad) : undefined,
          },
        });
        notification.success({ message: 'Personal actualizado exitosamente' });
        closeDrawer();
      } catch (err: unknown) {
        const { msg } = extractApiError(err);
        notification.error({ message: 'Error al actualizar el personal', description: msg });
      }
    }
  };

  const handleHabilitar = async (p: PersonalDTO) => {
    try {
      await habilitarMut.mutateAsync(p.id);
      notification.success({ message: `${p.nombres} ${p.apellidos} habilitado` });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al habilitar el personal', description: msg });
    }
  };

  const handleDeshabilitar = async (p: PersonalDTO) => {
    try {
      await deshabilitarMut.mutateAsync({ id: p.id, solicitanteKeycloakUserId: keycloak.tokenParsed?.sub });
      notification.success({ message: `${p.nombres} ${p.apellidos} deshabilitado` });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al deshabilitar el personal', description: msg });
    }
  };

  const clearFilters = () => {
    setNombre('');
    setTipoFilter(undefined);
    setEstadoFilter(undefined);
  };

  // ── Especialidades handlers ────────────────────────────────────────────────

  const openCreateEsp = () => {
    espForm.resetFields();
    setEditingEsp(null);
    setEspOpen(true);
  };

  const openEditEsp = (esp: EspecialidadDTO) => {
    setEditingEsp(esp);
    espForm.setFieldsValue({ nombre: esp.nombre, descripcion: esp.descripcion ?? '' });
    setEspOpen(true);
  };

  const closeEspDrawer = () => {
    setEspOpen(false);
    setEditingEsp(null);
    espForm.resetFields();
  };

  const handleSubmitEsp = async (values: Record<string, string>) => {
    if (editingEsp) {
      try {
        await actualizarEspMut.mutateAsync({
          id: editingEsp.id,
          data: { nombre: values.nombre, descripcion: values.descripcion || undefined },
        });
        notification.success({ message: 'Especialidad actualizada' });
        closeEspDrawer();
      } catch (err: unknown) {
        const { msg } = extractApiError(err);
        notification.error({ message: 'Error al actualizar la especialidad', description: msg });
      }
    } else {
      try {
        await personalApi.crearEspecialidad({
          nombre: values.nombre,
          descripcion: values.descripcion || undefined,
        });
        qc.invalidateQueries({ queryKey: ['especialidades'] });
        notification.success({ message: 'Especialidad creada' });
        closeEspDrawer();
      } catch (err: unknown) {
        const { msg } = extractApiError(err);
        notification.error({ message: 'Error al crear la especialidad', description: msg });
      }
    }
  };

  const handleEliminarEsp = async (esp: EspecialidadDTO) => {
    try {
      await eliminarEspMut.mutateAsync(esp.id);
      notification.success({ message: `Especialidad "${esp.nombre}" eliminada` });
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 409) {
        notification.error({
          message: 'No se puede eliminar',
          description: msg ?? 'Esta especialidad tiene médicos asignados. Reasígnelos antes de eliminarla.',
        });
      } else {
        notification.error({ message: 'Error al eliminar la especialidad', description: msg });
      }
    }
  };

  // ── Columns — Especialidades ───────────────────────────────────────────────

  const espColumns: ColumnsType<EspecialidadDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      ellipsis: true,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      ellipsis: true,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 110,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditEsp(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar esta especialidad?"
            description="Fallará si hay médicos asignados."
            onConfirm={() => handleEliminarEsp(r)}
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

  const isSubmitting = crearMut.isPending || actualizarMut.isPending || medicoMut.isPending;

  const columns: ColumnsType<PersonalDTO> = [
    {
      title: 'Nombre completo',
      key: 'nombre',
      ellipsis: true,
      render: (_, r) => `${r.nombres} ${r.apellidos}`,
    },
    {
      title: 'Documento',
      dataIndex: 'documentoIdentidad',
      width: 130,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoPersonal',
      width: 180,
      render: (tipo: TipoPersonal) => (
        <Tag color={TIPO_COLORS[tipo]}>{TIPO_LABELS[tipo]}</Tag>
      ),
    },
    {
      title: 'Celular',
      dataIndex: 'celular',
      ellipsis: true,
      width: 120,
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
      title: 'Acciones',
      key: 'acciones',
      width: 110,
      render: (_, r) => {
        const canManage = isAdmin || r.tipoPersonal !== 'ADMIN';
        if (!canManage) {
          return (
            <Tooltip title="Solo un Administrador puede gestionar este usuario">
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>Restringido</span>
            </Tooltip>
          );
        }
        const esUnoMismo = r.keycloakUserId === keycloak.tokenParsed?.sub;
        return (
          <Space size={4}>
            <Tooltip title="Editar datos">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => openEdit(r)}
              />
            </Tooltip>

            {r.estadoActivo ? (
              esUnoMismo ? (
                <Tooltip title="No puedes deshabilitarte a ti mismo">
                  <Button type="text" icon={<StopOutlined />} size="small" disabled />
                </Tooltip>
              ) : (
                <Popconfirm
                  title="¿Deshabilitar este personal?"
                  description="El personal quedará inactivo en el sistema."
                  onConfirm={() => handleDeshabilitar(r)}
                  okText="Deshabilitar"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancelar"
                >
                  <Tooltip title="Deshabilitar">
                    <Button type="text" icon={<StopOutlined />} size="small" danger />
                  </Tooltip>
                </Popconfirm>
              )
            ) : (
              <Popconfirm
                title="¿Habilitar este personal?"
                onConfirm={() => handleHabilitar(r)}
                okText="Habilitar"
                cancelText="Cancelar"
              >
                <Tooltip title="Habilitar">
                  <Button
                    type="text"
                    icon={<CheckCircleOutlined />}
                    size="small"
                    style={{ color: '#0F6E56' }}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {location.pathname.endsWith('/especialidades') ? null : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <PageHeader
                  title="Personal"
                  actions={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      Nuevo personal
                    </Button>
                  }
                />

                {/* Barra de filtros */}
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  background: '#fff', padding: '12px 16px',
                  borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <Input
                    placeholder="Buscar por nombre..."
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    allowClear
                    style={{ width: 220 }}
                  />
                  <Select
                    placeholder="Tipo de personal"
                    value={tipoFilter}
                    onChange={v => setTipoFilter(v)}
                    allowClear
                    style={{ width: 210 }}
                    options={TIPO_OPTIONS}
                  />
                  <Select
                    placeholder="Estado"
                    value={estadoFilter}
                    onChange={v => setEstadoFilter(v)}
                    allowClear
                    style={{ width: 120 }}
                    options={[
                      { value: true,  label: 'Activo' },
                      { value: false, label: 'Inactivo' },
                    ]}
                  />
                  <Button onClick={clearFilters}>Limpiar</Button>
                </div>

                {/* Error de carga */}
                {isError && (
                  <Alert
                    type="error"
                    showIcon
                    message="No se pudo cargar el listado de personal"
                    description={
                      (() => {
                        const { status, msg } = extractApiError(error);
                        if (status === 403) return 'Sin permisos (403). Verifique los roles del usuario en Keycloak.';
                        if (status === 502 || status === 503) return `ms-personal no disponible (${status}). Puerto 8087.`;
                        return msg ?? 'Error desconocido. Revise la consola del navegador.';
                      })()
                    }
                  />
                )}

                {/* Tabla */}
                <div style={{
                  flex: 1, overflow: 'hidden',
                  background: '#fff', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={lista}
                    loading={isLoading}
                    size="small"
                    scroll={{ y: 'calc(100vh - 340px)' }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: false,
                      showTotal: (total) => `${total} registros`,
                    }}
                  />
                </div>

              </div>
      )}
      {location.pathname.endsWith('/especialidades') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <PageHeader
                  title="Especialidades médicas"
                  actions={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEsp}>
                      Nueva especialidad
                    </Button>
                  }
                />

                <div style={{
                  flex: 1, overflow: 'hidden',
                  background: '#fff', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <Table
                    rowKey="id"
                    columns={espColumns}
                    dataSource={especialidades}
                    size="small"
                    scroll={{ y: 'calc(100vh - 280px)' }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: false,
                      showTotal: (total) => `${total} especialidades`,
                    }}
                  />
                </div>

              </div>
      ) : null}

      {/* Drawer crear / editar — Personal */}
      <Drawer
        title={drawerMode === 'create' ? 'Nuevo personal' : 'Editar personal'}
        open={drawerMode !== null}
        onClose={closeDrawer}
        width={520}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={isSubmitting} onClick={() => form.submit()}>
              {drawerMode === 'create' ? 'Registrar' : 'Guardar cambios'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          <Form.Item
            name="nombres"
            label="Nombres"
            rules={[{ required: true, message: 'Ingrese los nombres' }]}
          >
            <Input placeholder="Ej: Juan Carlos" />
          </Form.Item>

          <Form.Item
            name="apellidos"
            label="Apellidos"
            rules={[{ required: true, message: 'Ingrese los apellidos' }]}
          >
            <Input placeholder="Ej: García López" />
          </Form.Item>

          <Form.Item
            name="documentoIdentidad"
            label="Documento de identidad"
            rules={[{ required: true, message: 'Ingrese el documento' }]}
          >
            <Input placeholder="Ej: 12345678" />
          </Form.Item>

          <Form.Item name="celular" label="Celular">
            <Input placeholder="Ej: 987654321" />
          </Form.Item>

          <Form.Item name="correo" label="Correo electrónico">
            <Input placeholder="Ej: juan.garcia@clinica.pe" type="email" />
          </Form.Item>

          <Form.Item
            name="fechaIngreso"
            label="Fecha de ingreso"
            rules={[{ required: true, message: 'Seleccione la fecha de ingreso' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/AAAA" />
          </Form.Item>

          {/* Keycloak User ID — editable al crear, solo lectura al editar */}
          {drawerMode === 'create' ? (
            <Form.Item
              name="keycloakUserId"
              label="ID de usuario en Keycloak"
              tooltip="El UUID del usuario creado previamente en Keycloak. Vincula el acceso al sistema con este perfil."
              rules={[
                { required: true, message: 'El ID de Keycloak es obligatorio' },
                {
                  pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
                  message: 'Debe ser un UUID válido',
                },
              ]}
            >
              <Input placeholder="Ej: a1b2c3d4-e5f6-7890-abcd-ef1234567890" />
            </Form.Item>
          ) : (
            <Form.Item
              name="_keycloakUserId_readonly"
              label="ID de usuario en Keycloak"
              tooltip="Este vínculo no puede modificarse. El campo es informativo y no se incluye en la actualización."
            >
              <Input disabled />
            </Form.Item>
          )}

          {/* Tipo de personal — editable en crear y editar */}
          <Form.Item
            name="tipoPersonal"
            label="Tipo de personal"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
          >
            <Select
              placeholder="Seleccione el tipo de personal"
              options={TIPO_OPTIONS}
            />
          </Form.Item>

          {/* Sección médica — visible siempre que tipoPersonal sea MEDICO */}
          <Form.Item
            noStyle
            shouldUpdate={(prev: Record<string, unknown>, curr: Record<string, unknown>) =>
              prev.tipoPersonal !== curr.tipoPersonal
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('tipoPersonal') === 'MEDICO' ? (
                <>
                  <Divider style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 12px' }}>
                    Información médica
                  </Divider>
                  <Form.Item
                    name="numeroColegiatura"
                    label="Número de colegiatura"
                    rules={[{ required: true, message: 'Ingrese el número de colegiatura' }]}
                  >
                    <Input placeholder="Ej: CMP-12345" />
                  </Form.Item>
                  <Form.Item
                    name="idEspecialidad"
                    label="Especialidad"
                    rules={[{ required: true, message: 'Seleccione la especialidad' }]}
                  >
                    <Select
                      placeholder="Seleccione la especialidad"
                      showSearch
                      optionFilterProp="label"
                      options={especialidades.map(e => ({ value: e.id, label: e.nombre }))}
                    />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

        </Form>
      </Drawer>

      {/* Drawer crear / editar — Especialidades */}
      <Drawer
        title={editingEsp ? 'Editar especialidad' : 'Nueva especialidad'}
        open={espOpen}
        onClose={closeEspDrawer}
        width={420}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeEspDrawer}>Cancelar</Button>
            <Button
              type="primary"
              loading={actualizarEspMut.isPending}
              onClick={() => espForm.submit()}
            >
              {editingEsp ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        }
      >
        <Form form={espForm} layout="vertical" onFinish={handleSubmitEsp}>
          <Form.Item
            name="nombre"
            label="Nombre de la especialidad"
            rules={[{ required: true, message: 'Ingrese el nombre' }]}
          >
            <Input placeholder="Ej: Cardiología" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Descripción opcional de la especialidad" />
          </Form.Item>
        </Form>
      </Drawer>

    </div>
  );
}
