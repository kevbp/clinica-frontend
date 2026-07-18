import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Table, Button, Tag, Input, Drawer, Form, InputNumber,
  DatePicker, Space, App, Alert, Tooltip, Select, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import {
  useMedicamentosConStock, useStockBajo, useProximosAVencer,
  useDisponibilidadFarmacia, useCrearMedicamento, useActualizarMedicamento, useAgregarLote, useActualizarLote,
  useKardex,
} from '../../hooks/useFarmacia';
import { serviceErrorMessage, extractApiError } from '../../utils/errorUtils';
import type { MedicamentoConStockResponseDTO, LoteResponseDTO, KardexResponseDTO, TipoMovimiento } from '../../types/farmacia';

type LoteEditState = { open: boolean; lote?: LoteResponseDTO; idMedicamento?: number; nombreMed?: string };

const { Text } = Typography;

const UMBRAL_STOCK = 10;
const DIAS_VENCER = 30;

export default function FarmaciaPage() {
  const { notification } = App.useApp();
  const location = useLocation();
  const [busqueda, setBusqueda] = useState('');

  const [kardexMedId, setKardexMedId] = useState<number | null>(null);
  const [kardexDesde, setKardexDesde] = useState<string | undefined>();
  const [kardexHasta, setKardexHasta] = useState<string | undefined>();

  const { data: medicamentos = [] } = useMedicamentosConStock(busqueda || undefined);
  const { data: stockBajo = [] } = useStockBajo(UMBRAL_STOCK);
  const { data: proximosVencer = [] } = useProximosAVencer(DIAS_VENCER);
  const { isError: msError, error: msErrorObj } = useDisponibilidadFarmacia();
  const { data: kardexData = [], isFetching: kardexLoading } = useKardex(kardexMedId, kardexDesde, kardexHasta);

  const todosMedicamentos = medicamentos; // ya cargados arriba

  // Drawers
  const [drawerMed, setDrawerMed] = useState<{ open: boolean; editar?: MedicamentoConStockResponseDTO }>({ open: false });
  const [drawerLote, setDrawerLote] = useState<{ open: boolean; idMedicamento?: number; nombreMed?: string }>({ open: false });
  const [drawerEditarLote, setDrawerEditarLote] = useState<LoteEditState>({ open: false });
  const [formEditarLote] = Form.useForm();

  const [formMed] = Form.useForm();
  const [formLote] = Form.useForm();

  const mutCrear = useCrearMedicamento();
  const mutActualizar = useActualizarMedicamento();
  const mutLote = useAgregarLote();
  const mutActualizarLote = useActualizarLote();

  const abrirNuevo = () => {
    formMed.resetFields();
    setDrawerMed({ open: true });
  };

  const abrirEditar = (m: MedicamentoConStockResponseDTO) => {
    formMed.setFieldsValue({ nombre: m.nombre, principioActivo: m.principioActivo, presentacion: m.presentacion, precio: m.precio });
    setDrawerMed({ open: true, editar: m });
  };

  const abrirAgregarLote = (m: MedicamentoConStockResponseDTO) => {
    formLote.resetFields();
    setDrawerLote({ open: true, idMedicamento: m.id, nombreMed: m.nombre });
  };

  const abrirEditarLote = (lote: LoteResponseDTO, m: MedicamentoConStockResponseDTO) => {
    formEditarLote.setFieldsValue({
      numeroLote: lote.numeroLote,
      fechaVencimiento: dayjs(lote.fechaVencimiento),
      cantidadDisponible: lote.cantidadDisponible,
    });
    setDrawerEditarLote({ open: true, lote, idMedicamento: m.id, nombreMed: m.nombre });
  };

  const guardarEdicionLote = async (values: { numeroLote: string; fechaVencimiento: dayjs.Dayjs; cantidadDisponible: number }) => {
    if (!drawerEditarLote.lote || !drawerEditarLote.idMedicamento) return;
    try {
      await mutActualizarLote.mutateAsync({
        idMedicamento: drawerEditarLote.idMedicamento,
        idLote: drawerEditarLote.lote.id,
        data: {
          numeroLote: values.numeroLote,
          fechaVencimiento: values.fechaVencimiento.format('YYYY-MM-DD'),
          cantidadDisponible: values.cantidadDisponible,
        },
      });
      notification.success({ message: 'Lote actualizado' });
      setDrawerEditarLote({ open: false });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al actualizar lote', description: msg });
    }
  };

  const guardarMedicamento = async (values: {
    nombre: string; principioActivo: string; presentacion: string; precio?: number;
  }) => {
    try {
      if (drawerMed.editar) {
        await mutActualizar.mutateAsync({ id: drawerMed.editar.id, data: values });
        notification.success({ message: 'Medicamento actualizado' });
      } else {
        await mutCrear.mutateAsync({ ...values, precio: values.precio ?? 0 });
        notification.success({ message: 'Medicamento registrado' });
      }
      setDrawerMed({ open: false });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al guardar', description: msg });
    }
  };

  const guardarLote = async (values: { numeroLote: string; fechaVencimiento: dayjs.Dayjs; cantidadInicial: number }) => {
    if (!drawerLote.idMedicamento) return;
    try {
      await mutLote.mutateAsync({
        idMedicamento: drawerLote.idMedicamento,
        data: {
          numeroLote: values.numeroLote,
          fechaVencimiento: values.fechaVencimiento.format('YYYY-MM-DD'),
          cantidadInicial: values.cantidadInicial,
        },
      });
      notification.success({ message: 'Lote registrado' });
      setDrawerLote({ open: false });
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al registrar lote', description: msg });
    }
  };

  const columnasCatalogo: ColumnsType<MedicamentoConStockResponseDTO> = [
    {
      title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.principioActivo}</Text>
        </Space>
      ),
    },
    { title: 'Presentación', dataIndex: 'presentacion', key: 'presentacion' },
    {
      title: 'Precio', dataIndex: 'precio', key: 'precio',
      render: (v?: number) => v != null ? `S/ ${Number(v).toFixed(2)}` : <Text type="secondary">—</Text>,
    },
    {
      title: 'Stock total', dataIndex: 'stockTotal', key: 'stockTotal',
      render: (v: number) => (
        <Tag color={v === 0 ? 'red' : v <= UMBRAL_STOCK ? 'orange' : 'green'}>
          {v} uds.
        </Tag>
      ),
    },
    {
      title: 'Acciones', key: 'acciones', width: 160,
      render: (_: unknown, r) => (
        <Space>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(r)} />
          </Tooltip>
          <Button size="small" icon={<PlusOutlined />} onClick={() => abrirAgregarLote(r)}>
            Lote
          </Button>
        </Space>
      ),
    },
  ];

  const columnasStockBajo: ColumnsType<MedicamentoConStockResponseDTO> = [
    { title: 'Medicamento', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Principio activo', dataIndex: 'principioActivo', key: 'principioActivo' },
    {
      title: 'Stock actual', dataIndex: 'stockTotal', key: 'stockTotal',
      render: (v: number) => <Tag color={v === 0 ? 'red' : 'orange'}>{v} uds.</Tag>,
    },
  ];

  const columnasVencer: ColumnsType<LoteResponseDTO> = [
    { title: 'N° Lote', dataIndex: 'numeroLote', key: 'numeroLote' },
    {
      title: 'Vencimiento', dataIndex: 'fechaVencimiento', key: 'fechaVencimiento',
      render: (v: string) => {
        const dias = dayjs(v).diff(dayjs(), 'day');
        return (
          <Space>
            <Text>{dayjs(v).format('DD/MM/YYYY')}</Text>
            <Tag color={dias <= 7 ? 'red' : 'orange'}>{dias}d</Tag>
          </Space>
        );
      },
    },
    { title: 'Stock', dataIndex: 'cantidadDisponible', key: 'cantidadDisponible', render: (v: number) => `${v} uds.` },
  ];

  const lotesExpandidos = (med: MedicamentoConStockResponseDTO) => (
    <Table
      dataSource={med.lotes}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        { title: 'N° Lote', dataIndex: 'numeroLote', key: 'numeroLote' },
        {
          title: 'Vencimiento', dataIndex: 'fechaVencimiento', key: 'fv',
          render: (v: string) => {
            const vencido = dayjs(v).isBefore(dayjs());
            return <Text type={vencido ? 'danger' : undefined}>{dayjs(v).format('DD/MM/YYYY')}</Text>;
          },
        },
        {
          title: 'Stock', dataIndex: 'cantidadDisponible', key: 'cant',
          render: (v: number) => <Tag color={v === 0 ? 'default' : 'blue'}>{v} uds.</Tag>,
        },
        {
          title: '', key: 'accion', width: 64,
          render: (_: unknown, lote: LoteResponseDTO) => (
            <Tooltip title="Editar lote">
              <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditarLote(lote, med)} />
            </Tooltip>
          ),
        },
      ]}
    />
  );

  return (
    <div>
      <PageHeader
        title="Farmacia"
        actions={
          location.pathname.endsWith('/catalogo') ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo medicamento
            </Button>
          ) : undefined
        }
      />

      {msError && (
        <Alert
          type="error"
          showIcon
          message="Servicio de farmacia no disponible"
          description={serviceErrorMessage(msErrorObj, 'ms-farmacia', 8084)}
          style={{ marginBottom: 16 }}
        />
      )}

      {location.pathname.endsWith('/catalogo') && (
        <>
          <Input.Search
            placeholder="Buscar por nombre o principio activo…"
            allowClear
            prefix={<SearchOutlined />}
            style={{ maxWidth: 360, marginBottom: 16 }}
            onSearch={v => setBusqueda(v)}
            onChange={e => { if (!e.target.value) setBusqueda(''); }}
          />
          <Table
            dataSource={medicamentos}
            rowKey="id"
            columns={columnasCatalogo}
            expandable={{ expandedRowRender: lotesExpandidos }}
            pagination={{ pageSize: 20 }}
          />
        </>
      )}

      {location.pathname.endsWith('/stock-bajo') && (
        <>
          <Alert
            type="warning"
            showIcon
            message={`Medicamentos con stock ≤ ${UMBRAL_STOCK} unidades`}
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={stockBajo}
            rowKey="id"
            columns={columnasStockBajo}
            pagination={false}
          />
        </>
      )}

      {location.pathname.endsWith('/vencimiento') && (
        <>
          <Alert
            type="warning"
            showIcon
            message={`Lotes que vencen en los próximos ${DIAS_VENCER} días con stock disponible`}
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={proximosVencer}
            rowKey="id"
            columns={columnasVencer}
            pagination={false}
          />
        </>
      )}

      {location.pathname.endsWith('/kardex') && (
        <KardexSection
          medicamentos={todosMedicamentos}
          idSeleccionado={kardexMedId}
          onSeleccionar={setKardexMedId}
          onDesde={setKardexDesde}
          onHasta={setKardexHasta}
          datos={kardexData}
          cargando={kardexLoading}
        />
      )}

      {/* Drawer: crear / editar medicamento */}
      <Drawer
        title={drawerMed.editar ? 'Editar medicamento' : 'Nuevo medicamento'}
        open={drawerMed.open}
        onClose={() => setDrawerMed({ open: false })}
        width={440}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawerMed({ open: false })}>Cancelar</Button>
            <Button type="primary" onClick={() => formMed.submit()} loading={mutCrear.isPending || mutActualizar.isPending}>
              {drawerMed.editar ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </Space>
        }
      >
        <Form form={formMed} layout="vertical" onFinish={guardarMedicamento}>
          <Form.Item name="nombre" label="Nombre comercial" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Amoxicilina 500mg" />
          </Form.Item>
          <Form.Item name="principioActivo" label="Principio activo" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Amoxicilina" />
          </Form.Item>
          <Form.Item name="presentacion" label="Presentación" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Cápsula 500mg x 20 uds." />
          </Form.Item>
          {!drawerMed.editar && (
            <Form.Item name="precio" label="Precio unitario (S/)" rules={[{ required: true, message: 'Requerido' }]}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          )}
          {drawerMed.editar && (
            <Form.Item name="precio" label="Precio unitario (S/)">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="Sin cambio" />
            </Form.Item>
          )}
        </Form>
      </Drawer>

      {/* Drawer: agregar lote */}
      <Drawer
        title={`Agregar lote — ${drawerLote.nombreMed ?? ''}`}
        open={drawerLote.open}
        onClose={() => setDrawerLote({ open: false })}
        width={400}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawerLote({ open: false })}>Cancelar</Button>
            <Button type="primary" onClick={() => formLote.submit()} loading={mutLote.isPending}>
              Registrar lote
            </Button>
          </Space>
        }
      >
        <Form form={formLote} layout="vertical" onFinish={guardarLote}>
          <Form.Item name="numeroLote" label="Número de lote" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: LOT-2026-001" />
          </Form.Item>
          <Form.Item name="fechaVencimiento" label="Fecha de vencimiento" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={d => d.isBefore(dayjs())} />
          </Form.Item>
          <Form.Item name="cantidadInicial" label="Cantidad inicial" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Ej: 100" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer: editar lote */}
      <Drawer
        title={`Editar lote — ${drawerEditarLote.nombreMed ?? ''}`}
        open={drawerEditarLote.open}
        onClose={() => setDrawerEditarLote({ open: false })}
        width={400}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawerEditarLote({ open: false })}>Cancelar</Button>
            <Button type="primary" onClick={() => formEditarLote.submit()} loading={mutActualizarLote.isPending}>
              Guardar cambios
            </Button>
          </Space>
        }
      >
        <Form form={formEditarLote} layout="vertical" onFinish={guardarEdicionLote}>
          <Form.Item name="numeroLote" label="Número de lote" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fechaVencimiento" label="Fecha de vencimiento" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="cantidadDisponible" label="Cantidad disponible" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

// ─── Kardex Section ──────────────────────────────────────────────────────────

const TIPO_COLOR: Record<TipoMovimiento, string> = {
  ENTRADA: 'success',
  SALIDA: 'error',
  AJUSTE: 'warning',
};

const TIPO_LABEL: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
};

const MOTIVO_LABEL: Record<string, string> = {
  LOTE_REGISTRADO: 'Lote registrado',
  PAGO_PROFORMA: 'Pago proforma',
  AJUSTE_MANUAL: 'Ajuste manual',
};

function exportarKardexCsv(datos: KardexResponseDTO[], nombreMed: string) {
  const header = ['Fecha', 'Tipo', 'Motivo', 'Lote', 'Cantidad', 'Saldo Anterior', 'Saldo Posterior', 'Referencia'];
  const rows = datos.map(d => [
    dayjs(d.fecha).format('DD/MM/YYYY HH:mm'),
    TIPO_LABEL[d.tipo],
    MOTIVO_LABEL[d.motivo] ?? d.motivo,
    d.numeroLote,
    d.tipo === 'ENTRADA' ? `+${d.cantidad}` : d.tipo === 'SALIDA' ? `-${d.cantidad}` : `±${d.cantidad}`,
    d.saldoAnterior,
    d.saldoPosterior,
    d.referencia ?? '',
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kardex_${nombreMed.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KardexSection({
  medicamentos,
  idSeleccionado,
  onSeleccionar,
  onDesde,
  onHasta,
  datos,
  cargando,
}: {
  medicamentos: MedicamentoConStockResponseDTO[];
  idSeleccionado: number | null;
  onSeleccionar: (id: number | null) => void;
  onDesde: (v: string | undefined) => void;
  onHasta: (v: string | undefined) => void;
  datos: KardexResponseDTO[];
  cargando: boolean;
}) {
  const medSeleccionado = medicamentos.find(m => m.id === idSeleccionado);

  const columnas: ColumnsType<KardexResponseDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 150,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 100,
      render: (v: TipoMovimiento) => <Tag color={TIPO_COLOR[v]}>{TIPO_LABEL[v]}</Tag>,
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      render: (v: string) => MOTIVO_LABEL[v] ?? v,
    },
    {
      title: 'Lote',
      dataIndex: 'numeroLote',
      key: 'numeroLote',
      width: 130,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 90,
      align: 'right' as const,
      render: (v: number, row: KardexResponseDTO) => {
        const color = row.tipo === 'ENTRADA' ? '#52c41a' : row.tipo === 'SALIDA' ? '#ff4d4f' : '#faad14';
        const prefix = row.tipo === 'ENTRADA' ? '+' : row.tipo === 'SALIDA' ? '-' : '±';
        return <Text style={{ color, fontVariantNumeric: 'tabular-nums' }}>{prefix}{v}</Text>;
      },
    },
    {
      title: 'Saldo Ant.',
      dataIndex: 'saldoAnterior',
      key: 'saldoAnterior',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    {
      title: 'Saldo Post.',
      dataIndex: 'saldoPosterior',
      key: 'saldoPosterior',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          showSearch
          placeholder="Seleccionar medicamento…"
          style={{ width: 280 }}
          optionFilterProp="label"
          options={medicamentos.map(m => ({ value: m.id, label: m.nombre }))}
          onChange={v => onSeleccionar(v ?? null)}
          allowClear
          onClear={() => onSeleccionar(null)}
        />
        <DatePicker
          placeholder="Desde"
          onChange={d => onDesde(d ? d.format('YYYY-MM-DD') : undefined)}
          style={{ width: 140 }}
        />
        <DatePicker
          placeholder="Hasta"
          onChange={d => onHasta(d ? d.format('YYYY-MM-DD') : undefined)}
          style={{ width: 140 }}
        />
        <Button
          icon={<DownloadOutlined />}
          disabled={datos.length === 0}
          onClick={() => exportarKardexCsv(datos, medSeleccionado?.nombre ?? 'medicamento')}
        >
          Exportar CSV
        </Button>
      </Space>
      {idSeleccionado === null ? (
        <Alert type="info" showIcon message="Selecciona un medicamento para ver su kardex de movimientos." />
      ) : (
        <Table
          dataSource={datos}
          rowKey="id"
          columns={columnas}
          loading={cargando}
          pagination={{ pageSize: 50 }}
          size="small"
          locale={{ emptyText: 'Sin movimientos registrados para este medicamento en el período seleccionado.' }}
        />
      )}
    </>
  );
}
