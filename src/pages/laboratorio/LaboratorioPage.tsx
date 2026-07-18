import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Table, Button, Tag, Input, Drawer, Form, InputNumber,
  AutoComplete, Space, App, Alert, Tooltip, Typography, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import {
  useListarExamenes, useAutorizadosPorPaciente, useDisponibilidadLaboratorio,
  useCrearExamen, useActualizarExamen,
} from '../../hooks/useLaboratorio';
import { serviceErrorMessage, extractApiError } from '../../utils/errorUtils';
import type { ExamenResponseDTO, ExamenAutorizadoResponseDTO } from '../../types/laboratorio';
import type { PacienteResponseDTO } from '../../types/pacientes';

const { Text } = Typography;

const CATEGORIAS = ['Hematología', 'Bioquímica', 'Microbiología', 'Inmunología', 'Uroanálisis', 'Imagenología', 'Anatomía Patológica', 'Otro'];

export default function LaboratorioPage() {
  const { notification } = App.useApp();
  const location = useLocation();
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResponseDTO | null>(null);

  const { data: examenes = [] } = useListarExamenes(busqueda || undefined);
  const { data: autorizados = [], isLoading: cargandoAutorizados } = useAutorizadosPorPaciente(
    pacienteSeleccionado?.id ?? null
  );
  const { isError: msError, error: msErrorObj } = useDisponibilidadLaboratorio();

  const [drawer, setDrawer] = useState<{ open: boolean; editar?: ExamenResponseDTO }>({ open: false });
  const [form] = Form.useForm();

  const mutCrear = useCrearExamen();
  const mutActualizar = useActualizarExamen();

  const abrirNuevo = () => {
    form.resetFields();
    setDrawer({ open: true });
  };

  const abrirEditar = (e: ExamenResponseDTO) => {
    form.setFieldsValue({ nombre: e.nombre, categoria: e.categoria, descripcion: e.descripcion, precio: e.precio });
    setDrawer({ open: true, editar: e });
  };

  const guardar = async (values: { nombre: string; categoria: string; descripcion?: string; precio?: number }) => {
    try {
      if (drawer.editar) {
        await mutActualizar.mutateAsync({ id: drawer.editar.id, data: values });
        notification.success({ message: 'Examen actualizado' });
      } else {
        await mutCrear.mutateAsync({ ...values, precio: values.precio ?? 0 });
        notification.success({ message: 'Examen registrado' });
      }
      setDrawer({ open: false });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al guardar', description: msg });
    }
  };

  const columnasCatalogo: ColumnsType<ExamenResponseDTO> = [
    {
      title: 'Examen', dataIndex: 'nombre', key: 'nombre',
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {r.descripcion && <Text type="secondary" style={{ fontSize: 12 }}>{r.descripcion}</Text>}
        </Space>
      ),
    },
    {
      title: 'Categoría', dataIndex: 'categoria', key: 'categoria',
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Precio', dataIndex: 'precio', key: 'precio',
      render: (v?: number) => v != null ? `S/ ${Number(v).toFixed(2)}` : <Text type="secondary">—</Text>,
    },
    {
      title: 'Acciones', key: 'acciones', width: 80,
      render: (_: unknown, r) => (
        <Tooltip title="Editar">
          <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(r)} />
        </Tooltip>
      ),
    },
  ];

  const columnasAutorizados: ColumnsType<ExamenAutorizadoResponseDTO> = [
    {
      title: 'Examen', dataIndex: 'nombreExamen', key: 'nombreExamen',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Autorizado el', dataIndex: 'fechaAutorizacion', key: 'fecha',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Episodio', dataIndex: 'idEpisodioClinico', key: 'episodio',
      render: (v: string) => (
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {v.slice(-8)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Laboratorio"
        actions={
          location.pathname.endsWith('/catalogo') ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo examen
            </Button>
          ) : undefined
        }
      />

      {msError && (
        <Alert
          type="error"
          showIcon
          message="Servicio de laboratorio no disponible"
          description={serviceErrorMessage(msErrorObj, 'ms-laboratorio', 8085)}
          style={{ marginBottom: 16 }}
        />
      )}

      {location.pathname.endsWith('/catalogo') && (
        <>
          <Input.Search
            placeholder="Buscar por nombre o categoría…"
            allowClear
            prefix={<SearchOutlined />}
            style={{ maxWidth: 360, marginBottom: 16 }}
            onSearch={v => setBusqueda(v)}
            onChange={e => { if (!e.target.value) setBusqueda(''); }}
          />
          <Table
            dataSource={examenes}
            rowKey="id"
            columns={columnasCatalogo}
            pagination={{ pageSize: 20 }}
          />
        </>
      )}

      {location.pathname.endsWith('/autorizados') && (
        <>
          <div style={{ maxWidth: 480, marginBottom: 20 }}>
            <BuscadorPaciente
              pacienteSeleccionado={pacienteSeleccionado}
              onSeleccionar={setPacienteSeleccionado}
              placeholder="Buscar paciente para ver sus exámenes autorizados"
            />
          </div>

          {!pacienteSeleccionado && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Selecciona un paciente para ver sus exámenes autorizados"
            />
          )}

          {pacienteSeleccionado && (
            <>
              <Alert
                type="info"
                showIcon
                message={
                  <span>
                    Exámenes autorizados de{' '}
                    <Text strong>
                      {pacienteSeleccionado.nombres} {pacienteSeleccionado.apellidos}
                    </Text>
                    {' '}— {autorizados.length} registro{autorizados.length !== 1 ? 's' : ''}
                  </span>
                }
                style={{ marginBottom: 16 }}
              />
              <Table
                dataSource={autorizados}
                rowKey="id"
                columns={columnasAutorizados}
                loading={cargandoAutorizados}
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: 'Este paciente no tiene exámenes autorizados' }}
              />
            </>
          )}
        </>
      )}

      <Drawer
        title={drawer.editar ? 'Editar examen' : 'Nuevo examen'}
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        width={440}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawer({ open: false })}>Cancelar</Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={mutCrear.isPending || mutActualizar.isPending}
            >
              {drawer.editar ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Form.Item name="nombre" label="Nombre del examen" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Hemograma completo" />
          </Form.Item>
          <Form.Item name="categoria" label="Categoría" rules={[{ required: true, message: 'Requerido' }]}>
            <AutoComplete
              options={CATEGORIAS.map(c => ({ value: c }))}
              placeholder="Ej: Hematología"
              filterOption={(input, option) =>
                (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción opcional del examen" />
          </Form.Item>
          {!drawer.editar && (
            <Form.Item name="precio" label="Precio (S/)" rules={[{ required: true, message: 'Requerido' }]}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          )}
          {drawer.editar && (
            <Form.Item name="precio" label="Precio (S/)">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="Sin cambio" />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
