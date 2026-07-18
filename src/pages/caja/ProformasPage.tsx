import { useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Empty,
  List,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  notification,
} from 'antd';
import {
  CheckCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import PageHeader from '../../components/ui/PageHeader';
import BuscadorPaciente from '../../components/pacientes/BuscadorPaciente';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';
import {
  useDisponibilidadCaja,
  useConstruirDesdeReceta,
  useConstruirDesdeOrden,
  useProformasPorPaciente,
} from '../../hooks/useCaja';
import * as historiasApi from '../../api/historias';
import * as farmaciaApi from '../../api/farmacia';
import type { PacienteResponseDTO } from '../../types/pacientes';
import type { EpisodioClinicoDTO, EpisodioCompletoDTO } from '../../types/historias';
import type { ProformaResponseDTO, ItemProformaResponseDTO } from '../../types/caja';

const { Text } = Typography;

// ── helpers ────────────────────────────────────────────────────────────────────

function estadoProformaTag(estado: string) {
  const map: Record<string, { color: string; label: string }> = {
    VIGENTE: { color: 'green', label: 'Vigente' },
    EXPIRADA: { color: 'red', label: 'Expirada' },
    PAGADA: { color: 'blue', label: 'Pagada' },
  };
  const { color, label } = map[estado] ?? { color: 'default', label: estado };
  return <Tag color={color}>{label}</Tag>;
}

function estadoItemTag(estado: string) {
  const map: Record<string, { color: string; label: string }> = {
    PENDIENTE: { color: 'gold', label: 'Pendiente' },
    PAGADO: { color: 'green', label: 'Pagado' },
    NO_DISPONIBLE: { color: 'red', label: 'Sin stock' },
  };
  const { color, label } = map[estado] ?? { color: 'default', label: estado };
  return <Tag color={color}>{label}</Tag>;
}

// ── Tab 1: Nueva proforma ──────────────────────────────────────────────────────

interface StockMap {
  [idMedicamento: number]: number;
}

function NuevaProformaTab() {
  const [paciente, setPaciente] = useState<PacienteResponseDTO | null>(null);
  const [episodioSeleccionado, setEpisodioSeleccionado] = useState<EpisodioCompletoDTO | null>(null);
  const [cargandoEpisodio, setCargandoEpisodio] = useState(false);
  const [stockMap, setStockMap] = useState<StockMap>({});
  const [stockCargando, setStockCargando] = useState(false);
  const [idsRecetaSeleccionados, setIdsRecetaSeleccionados] = useState<Set<number>>(new Set());
  const [idsOrdenSeleccionados, setIdsOrdenSeleccionados] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<{ tipo: 'receta' | 'orden' } | null>(null);
  const [proformaCreada, setProformaCreada] = useState<ProformaResponseDTO | null>(null);

  const crearDesdeReceta = useConstruirDesdeReceta();
  const crearDesdeOrden = useConstruirDesdeOrden();

  const { data: historia, isLoading: historiaCargando, isError: historiaError, error: historiaErr } = useQuery({
    queryKey: ['historias', 'paciente', paciente?.id],
    queryFn: () => historiasApi.obtenerHistoriaPorPaciente(paciente!.id),
    enabled: paciente !== null,
    retry: false,
  });

  const { data: episodios, isLoading: episodiosCargando } = useQuery({
    queryKey: ['historias', 'episodios', historia?.id],
    queryFn: () => historiasApi.listarEpisodiosPorHistoria(historia!.id),
    enabled: !!historia,
    retry: false,
  });

  const seleccionarEpisodio = useCallback(async (ep: EpisodioClinicoDTO) => {
    setEpisodioSeleccionado(null);
    setIdsRecetaSeleccionados(new Set());
    setIdsOrdenSeleccionados(new Set());
    setStockMap({});
    setCargandoEpisodio(true);
    try {
      const completo = await historiasApi.obtenerEpisodioCompleto(ep.idEpisodio);
      setEpisodioSeleccionado(completo);
      if (completo.receta?.lineas.length) {
        setStockCargando(true);
        const entries = await Promise.all(
          completo.receta.lineas.map(async (l) => {
            try {
              const disp = await farmaciaApi.obtenerDisponibilidadMedicamento(l.idMedicamento);
              return [l.idMedicamento, disp.cantidadTotal] as [number, number];
            } catch {
              return [l.idMedicamento, -1] as [number, number];
            }
          })
        );
        setStockMap(Object.fromEntries(entries));
        setStockCargando(false);
      }
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al cargar episodio', description: msg });
    } finally {
      setCargandoEpisodio(false);
    }
  }, []);

  const toggleReceta = (id: number, checked: boolean) => {
    setIdsRecetaSeleccionados((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleOrden = (id: number, checked: boolean) => {
    setIdsOrdenSeleccionados((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const confirmarProforma = async () => {
    if (!preview || !episodioSeleccionado) return;
    try {
      let result: ProformaResponseDTO;
      if (preview.tipo === 'receta' && episodioSeleccionado.receta) {
        result = await crearDesdeReceta.mutateAsync({
          idReceta: episodioSeleccionado.receta.idReceta,
          idsItemsSeleccionados: [...idsRecetaSeleccionados],
        });
      } else if (preview.tipo === 'orden' && episodioSeleccionado.ordenLaboratorio) {
        result = await crearDesdeOrden.mutateAsync({
          idOrden: episodioSeleccionado.ordenLaboratorio.idOrden,
          idsItemsSeleccionados: [...idsOrdenSeleccionados],
        });
      } else return;
      setPreview(null);
      setProformaCreada(result);
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al generar la proforma', description: msg });
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Buscar paciente">
        <BuscadorPaciente
          pacienteSeleccionado={paciente}
          onSeleccionar={(p) => {
            setPaciente(p);
            setEpisodioSeleccionado(null);
          }}
        />
      </Card>

      {paciente && (
        <>
          {historiaCargando && <Spin tip="Cargando historia clínica…" />}

          {historiaError && (
            <Alert
              type="warning"
              showIcon
              message="Sin historia clínica"
              description={
                (historiaErr as { response?: { status?: number } })?.response?.status === 404
                  ? 'Este paciente no tiene historia clínica. Debe haber tenido al menos una consulta finalizada.'
                  : serviceErrorMessage(historiaErr, 'ms-historias-clinicas', 8086)
              }
            />
          )}

          {historia && (
            <Row gutter={16}>
              <Col xs={24} md={10}>
                <Card
                  title={`Episodios — ${historia.codigoHistoria}`}
                  loading={episodiosCargando}
                  style={{ maxHeight: 520, overflow: 'auto' }}
                >
                  {!episodios || episodios.length === 0 ? (
                    <Empty description="Sin episodios registrados" />
                  ) : (
                    <List
                      dataSource={[...episodios].sort((a, b) =>
                        dayjs(b.fechaAtencion).diff(dayjs(a.fechaAtencion))
                      )}
                      renderItem={(ep) => {
                        const seleccionado = episodioSeleccionado?.idEpisodio === ep.idEpisodio;
                        return (
                          <List.Item
                            key={ep.idEpisodio}
                            onClick={() => seleccionarEpisodio(ep)}
                            style={{
                              cursor: 'pointer',
                              background: seleccionado ? '#e6f4ff' : undefined,
                              borderLeft: seleccionado
                                ? '3px solid #1677ff'
                                : '3px solid transparent',
                              padding: '10px 12px',
                            }}
                          >
                            <Space direction="vertical" size={0}>
                              <Text strong>
                                {dayjs(ep.fechaAtencion).format('DD/MM/YYYY HH:mm')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Dr.{' '}
                                {ep.medico
                                  ? `${ep.medico.nombres} ${ep.medico.apellidos}`
                                  : `#${ep.idPersonalMedico}`}
                              </Text>
                              {ep.medico?.especialidad && (
                                <Tag style={{ fontSize: 11, marginTop: 2 }}>
                                  {ep.medico.especialidad}
                                </Tag>
                              )}
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} md={14}>
                {cargandoEpisodio ? (
                  <Card>
                    <Spin tip="Cargando detalles del episodio…" />
                  </Card>
                ) : episodioSeleccionado ? (
                  <EpisodioDetalle
                    episodio={episodioSeleccionado}
                    stockMap={stockMap}
                    stockCargando={stockCargando}
                    idsRecetaSeleccionados={idsRecetaSeleccionados}
                    idsOrdenSeleccionados={idsOrdenSeleccionados}
                    onToggleReceta={toggleReceta}
                    onToggleOrden={toggleOrden}
                    onPreviewReceta={() => setPreview({ tipo: 'receta' })}
                    onPreviewOrden={() => setPreview({ tipo: 'orden' })}
                  />
                ) : (
                  <Card>
                    <Empty description="Selecciona un episodio para ver su receta y/u órdenes de laboratorio" />
                  </Card>
                )}
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Modal de preview — confirmar antes de guardar */}
      <Modal
        open={preview !== null && episodioSeleccionado !== null}
        title={
          <Space>
            <ShoppingCartOutlined />
            {preview?.tipo === 'receta' ? 'Vista previa — Proforma de medicamentos' : 'Vista previa — Proforma de exámenes'}
          </Space>
        }
        onCancel={() => setPreview(null)}
        footer={
          <Space>
            <Button onClick={() => setPreview(null)}>Cancelar</Button>
            <Button
              type="primary"
              loading={crearDesdeReceta.isPending || crearDesdeOrden.isPending}
              onClick={confirmarProforma}
            >
              Confirmar y guardar proforma
            </Button>
          </Space>
        }
        width={560}
      >
        {preview && episodioSeleccionado && (
          <PreviewProforma
            tipo={preview.tipo}
            episodio={episodioSeleccionado}
            stockMap={stockMap}
            idsRecetaSeleccionados={idsRecetaSeleccionados}
            idsOrdenSeleccionados={idsOrdenSeleccionados}
          />
        )}
      </Modal>

      {/* Modal de éxito tras guardar */}
      <Modal
        open={proformaCreada !== null}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            Proforma generada exitosamente
          </Space>
        }
        onCancel={() => setProformaCreada(null)}
        footer={
          <Button type="primary" onClick={() => setProformaCreada(null)}>
            Cerrar
          </Button>
        }
      >
        {proformaCreada && <ProformaResumen proforma={proformaCreada} />}
      </Modal>
    </Space>
  );
}

interface EpisodioDetalleProps {
  episodio: EpisodioCompletoDTO;
  stockMap: StockMap;
  stockCargando: boolean;
  idsRecetaSeleccionados: Set<number>;
  idsOrdenSeleccionados: Set<number>;
  onToggleReceta: (id: number, checked: boolean) => void;
  onToggleOrden: (id: number, checked: boolean) => void;
  onPreviewReceta: () => void;
  onPreviewOrden: () => void;
}

function EpisodioDetalle({
  episodio,
  stockMap,
  stockCargando,
  idsRecetaSeleccionados,
  idsOrdenSeleccionados,
  onToggleReceta,
  onToggleOrden,
  onPreviewReceta,
  onPreviewOrden,
}: EpisodioDetalleProps) {
  const receta = episodio.receta;
  const orden = episodio.ordenLaboratorio;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {receta && (
        <Card
          title={
            <Space>
              <MedicineBoxOutlined style={{ color: '#1677ff' }} />
              Receta — medicamentos
              <Tag color="blue" style={{ fontSize: 11 }}>
                …{receta.idReceta.slice(-8)}
              </Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              disabled={idsRecetaSeleccionados.size === 0}
              onClick={onPreviewReceta}
            >
              Generar proforma
            </Button>
          }
        >
          {stockCargando && (
            <Spin
              tip="Verificando disponibilidad en farmacia…"
              style={{ display: 'block', marginBottom: 8 }}
            />
          )}
          <Space direction="vertical" style={{ width: '100%' }}>
            {receta.lineas.map((l) => {
              const stock = stockMap[l.idMedicamento];
              const sinStock =
                stock !== undefined && stock !== -1 && stock < l.cantidadTotal;
              return (
                <div
                  key={l.idMedicamento}
                  style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                >
                  <Space align="start">
                    <Checkbox
                      checked={idsRecetaSeleccionados.has(l.idMedicamento)}
                      onChange={(e) => onToggleReceta(l.idMedicamento, e.target.checked)}
                    />
                    <div>
                      <Text strong>
                        {l.nombreMedicamento ?? `Medicamento #${l.idMedicamento}`}
                      </Text>
                      {l.principioActivo && (
                        <Text type="secondary"> — {l.principioActivo}</Text>
                      )}
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        {[l.dosis, l.viaAdministracion, l.frecuencia, l.duracion]
                          .filter(Boolean)
                          .join(' · ')}{' '}
                        · Cant: {l.cantidadTotal}
                      </div>
                      {sinStock && (
                        <Alert
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          message={`Solo hay ${stock} unidades disponibles`}
                          style={{ marginTop: 4, padding: '2px 8px', fontSize: 12 }}
                        />
                      )}
                    </div>
                  </Space>
                </div>
              );
            })}
          </Space>
        </Card>
      )}

      {orden && (
        <Card
          title={
            <Space>
              <ExperimentOutlined style={{ color: '#722ed1' }} />
              Orden de laboratorio
              <Tag color="purple" style={{ fontSize: 11 }}>
                …{orden.idOrden.slice(-8)}
              </Tag>
            </Space>
          }
          extra={
            <Button
              style={idsOrdenSeleccionados.size > 0 ? { background: '#722ed1', borderColor: '#722ed1' } : undefined}
              type="primary"
              icon={<ShoppingCartOutlined />}
              disabled={idsOrdenSeleccionados.size === 0}
              onClick={onPreviewOrden}
            >
              Generar proforma
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {orden.lineas.map((l) => (
              <div
                key={l.idExamen}
                style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <Space align="start">
                  <Checkbox
                    checked={idsOrdenSeleccionados.has(l.idExamen)}
                    onChange={(e) => onToggleOrden(l.idExamen, e.target.checked)}
                  />
                  <div>
                    <Text strong>
                      {l.nombreExamen ?? `Examen #${l.idExamen}`}
                    </Text>
                    {l.categoria && (
                      <Tag style={{ marginLeft: 6, fontSize: 11 }}>{l.categoria}</Tag>
                    )}
                    {l.indicacionesPreparacion && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        {l.indicacionesPreparacion}
                      </div>
                    )}
                  </div>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {!receta && !orden && (
        <Card>
          <Empty description="Este episodio no tiene receta ni orden de laboratorio" />
        </Card>
      )}
    </Space>
  );
}

function PreviewProforma({
  tipo,
  episodio,
  stockMap,
  idsRecetaSeleccionados,
  idsOrdenSeleccionados,
}: {
  tipo: 'receta' | 'orden';
  episodio: EpisodioCompletoDTO;
  stockMap: StockMap;
  idsRecetaSeleccionados: Set<number>;
  idsOrdenSeleccionados: Set<number>;
}) {
  const receta = episodio.receta;
  const orden = episodio.ordenLaboratorio;

  if (tipo === 'receta' && receta) {
    const lineas = receta.lineas.filter(l => idsRecetaSeleccionados.has(l.idMedicamento));
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">
          Se guardará una proforma con los siguientes medicamentos seleccionados:
        </Text>
        {lineas.map(l => {
          const stock = stockMap[l.idMedicamento];
          const sinStock = stock !== undefined && stock !== -1 && stock < l.cantidadTotal;
          return (
            <div key={l.idMedicamento} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Text strong>{l.nombreMedicamento ?? `Medicamento #${l.idMedicamento}`}</Text>
              <div style={{ fontSize: 12, color: '#666' }}>
                {[l.dosis, l.viaAdministracion, l.frecuencia, l.duracion].filter(Boolean).join(' · ')} · Cant: {l.cantidadTotal}
              </div>
              {sinStock && (
                <Alert
                  type="warning"
                  showIcon
                  message={`Solo hay ${stock} unidades disponibles`}
                  style={{ marginTop: 4, padding: '2px 8px', fontSize: 12 }}
                />
              )}
            </div>
          );
        })}
        <Divider style={{ margin: '8px 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          El precio se congela al confirmar. Vigencia: 7 días.
        </Text>
      </Space>
    );
  }

  if (tipo === 'orden' && orden) {
    const lineas = orden.lineas.filter(l => idsOrdenSeleccionados.has(l.idExamen));
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">
          Se guardará una proforma con los siguientes exámenes seleccionados:
        </Text>
        {lineas.map(l => (
          <div key={l.idExamen} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Text strong>{l.nombreExamen ?? `Examen #${l.idExamen}`}</Text>
            {l.categoria && <Tag style={{ marginLeft: 8, fontSize: 11 }}>{l.categoria}</Tag>}
            {l.indicacionesPreparacion && (
              <div style={{ fontSize: 12, color: '#666' }}>{l.indicacionesPreparacion}</div>
            )}
          </div>
        ))}
        <Divider style={{ margin: '8px 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          El precio se congela al confirmar. Vigencia: 7 días.
        </Text>
      </Space>
    );
  }

  return null;
}

function calcularIgvProforma(items: ItemProformaResponseDTO[]) {
  const total = items.reduce((s, i) => s + i.precioCongelado, 0);
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - subtotal) * 100) / 100;
  return { total, subtotal, igv };
}

function ProformaResumen({ proforma }: { proforma: ProformaResponseDTO }) {
  const { total, subtotal, igv } = calcularIgvProforma(proforma.items);
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Row gutter={[8, 4]}>
        <Col span={12}>
          <Text type="secondary">Tipo: </Text>
          <Tag color={proforma.tipo === 'MEDICAMENTOS' ? 'blue' : 'purple'}>
            {proforma.tipo}
          </Tag>
        </Col>
        <Col span={12}>
          <Text type="secondary">Estado: </Text>
          {estadoProformaTag(proforma.estadoProforma)}
        </Col>
        <Col span={12}>
          <Text type="secondary">Generada: </Text>
          <Text>{dayjs(proforma.fechaGeneracion).format('DD/MM/YYYY HH:mm')}</Text>
        </Col>
        <Col span={12}>
          <Text type="secondary">Vence: </Text>
          <Text strong>{dayjs(proforma.fechaVigencia).format('DD/MM/YYYY')}</Text>
        </Col>
        {proforma.idReceta && (
          <Col span={24}>
            <Text type="secondary">Receta: </Text>
            <Text code>…{proforma.idReceta.slice(-8)}</Text>
          </Col>
        )}
        {proforma.idOrden && (
          <Col span={24}>
            <Text type="secondary">Orden: </Text>
            <Text code>…{proforma.idOrden.slice(-8)}</Text>
          </Col>
        )}
      </Row>
      <Divider style={{ margin: '8px 0' }} />
      <Table
        dataSource={proforma.items}
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          {
            title: 'Concepto',
            dataIndex: 'nombreItem',
            key: 'nombre',
            render: (v: string, r: ItemProformaResponseDTO) => (
              <Space direction="vertical" size={0}>
                <Text strong>{v}</Text>
                {r.tipo === 'MEDICAMENTO' && r.principioActivo && (
                  <Text type="secondary" style={{ fontSize: 11 }}>{r.principioActivo}</Text>
                )}
                {r.tipo === 'EXAMEN' && r.categoria && (
                  <Text type="secondary" style={{ fontSize: 11 }}>{r.categoria}</Text>
                )}
              </Space>
            ),
          },
          {
            title: 'Cant.',
            dataIndex: 'cantidad',
            key: 'cantidad',
            align: 'center' as const,
            width: 60,
            render: (v?: number) => v ?? 1,
          },
          {
            title: 'P. Unit.',
            dataIndex: 'precioUnitario',
            key: 'unitario',
            align: 'right' as const,
            width: 90,
            render: (v: number) => `S/ ${v.toFixed(2)}`,
          },
          {
            title: 'Total',
            dataIndex: 'precioCongelado',
            key: 'total',
            align: 'right' as const,
            width: 90,
            render: (v: number) => `S/ ${v.toFixed(2)}`,
          },
        ]}
      />
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: '10px 16px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">Subtotal</Text>
          <Text>S/ {subtotal.toFixed(2)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">IGV (18%)</Text>
          <Text>S/ {igv.toFixed(2)}</Text>
        </div>
        <Divider style={{ margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Total</Text>
          <Text strong style={{ fontSize: 16 }}>S/ {total.toFixed(2)}</Text>
        </div>
      </div>
      <Alert
        type="info"
        showIcon
        message={
          <Text style={{ fontSize: 12 }}>
            Precios congelados al momento de generación. Vigentes hasta{' '}
            <Text strong>{dayjs(proforma.fechaVigencia).format('DD/MM/YYYY')}</Text>.
          </Text>
        }
        style={{ padding: '4px 12px' }}
      />
    </Space>
  );
}

// ── Tab 2: Proformas generadas ─────────────────────────────────────────────────

function ProformasGeneradasTab() {
  const [paciente, setPaciente] = useState<PacienteResponseDTO | null>(null);
  const [proformaDrawer, setProformaDrawer] = useState<ProformaResponseDTO | null>(null);

  const { data: proformas, isLoading } = useProformasPorPaciente(paciente?.id ?? null);

  const abrirProforma = (p: ProformaResponseDTO) => {
    setProformaDrawer(p);
  };

  // Agrupa proformas por fuente (misma receta o misma orden)
  const agrupar = (ps: ProformaResponseDTO[]) => {
    const grupos = new Map<string, ProformaResponseDTO[]>();
    for (const p of ps) {
      const key = p.idReceta
        ? `receta:${p.idReceta}`
        : p.idOrden
        ? `orden:${p.idOrden}`
        : `sin-fuente:${p.id}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(p);
    }
    return grupos;
  };

  const grupos = proformas ? agrupar(proformas) : new Map<string, ProformaResponseDTO[]>();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Buscar paciente">
        <BuscadorPaciente
          pacienteSeleccionado={paciente}
          onSeleccionar={setPaciente}
        />
      </Card>

      {paciente && (
        <Card title="Proformas del paciente" loading={isLoading}>
          {!proformas || proformas.length === 0 ? (
            <Empty description="No hay proformas generadas para este paciente" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {[...grupos.entries()].map(([key, grupo]) => {
                const esReceta = key.startsWith('receta:');
                const esOrden = key.startsWith('orden:');
                const fuenteId = esReceta
                  ? `…${grupo[0].idReceta!.slice(-8)}`
                  : esOrden
                  ? `…${grupo[0].idOrden!.slice(-8)}`
                  : null;

                return (
                  <Card
                    key={key}
                    size="small"
                    title={
                      <Space>
                        {esReceta && <MedicineBoxOutlined style={{ color: '#1677ff' }} />}
                        {esOrden && <ExperimentOutlined style={{ color: '#722ed1' }} />}
                        {esReceta ? 'Receta' : esOrden ? 'Orden de laboratorio' : 'Proforma'}
                        {fuenteId && (
                          <Text code style={{ fontSize: 11 }}>
                            {fuenteId}
                          </Text>
                        )}
                        {grupo.length > 1 && (
                          <Tooltip title="Se generaron múltiples proformas desde esta misma fuente">
                            <Tag color="orange">{grupo.length} proformas</Tag>
                          </Tooltip>
                        )}
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {[...grupo]
                        .sort((a, b) =>
                          dayjs(b.fechaGeneracion).diff(dayjs(a.fechaGeneracion))
                        )
                        .map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 0',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                          >
                            <Space wrap>
                              <Tag color={p.tipo === 'MEDICAMENTOS' ? 'blue' : 'purple'}>
                                {p.tipo}
                              </Tag>
                              {estadoProformaTag(p.estadoProforma)}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(p.fechaGeneracion).format('DD/MM/YYYY HH:mm')}
                              </Text>
                              {p.estadoProforma === 'VIGENTE' && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  · Vence {dayjs(p.fechaVigencia).format('DD/MM/YYYY')}
                                </Text>
                              )}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                · {p.items.length} ítem(s)
                              </Text>
                            </Space>
                            <Button
                              size="small"
                              icon={<FileTextOutlined />}
                              onClick={() => abrirProforma(p)}
                            >
                              Ver / Pagar
                            </Button>
                          </div>
                        ))}
                    </Space>
                  </Card>
                );
              })}
            </Space>
          )}
        </Card>
      )}

      {/* Drawer de detalle — solo vista */}
      <Drawer
        open={proformaDrawer !== null}
        onClose={() => setProformaDrawer(null)}
        title={
          proformaDrawer && (
            <Space>
              {proformaDrawer.tipo === 'MEDICAMENTOS' ? (
                <MedicineBoxOutlined style={{ color: '#1677ff' }} />
              ) : (
                <ExperimentOutlined style={{ color: '#722ed1' }} />
              )}
              Proforma #{proformaDrawer.id}
              {estadoProformaTag(proformaDrawer.estadoProforma)}
            </Space>
          )
        }
        width={520}
      >
        {proformaDrawer && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={[8, 4]}>
              {proformaDrawer.idReceta && (
                <Col span={24}>
                  <Text type="secondary">Receta origen: </Text>
                  <Text code>…{proformaDrawer.idReceta.slice(-8)}</Text>
                </Col>
              )}
              {proformaDrawer.idOrden && (
                <Col span={24}>
                  <Text type="secondary">Orden origen: </Text>
                  <Text code>…{proformaDrawer.idOrden.slice(-8)}</Text>
                </Col>
              )}
              <Col span={12}>
                <Text type="secondary">Generada: </Text>
                <Text>{dayjs(proformaDrawer.fechaGeneracion).format('DD/MM/YYYY HH:mm')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Vence: </Text>
                <Text strong>{dayjs(proformaDrawer.fechaVigencia).format('DD/MM/YYYY')}</Text>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0' }} />

            {proformaDrawer.estadoProforma === 'EXPIRADA' && (
              <Alert
                type="error"
                showIcon
                message="Proforma expirada"
                description='Genere una nueva proforma desde la receta u orden correspondiente (pestaña "Nueva proforma").'
              />
            )}

            <Space direction="vertical" style={{ width: '100%' }}>
              {proformaDrawer.items.map((item) => (
                <ItemProformaCard key={item.id} item={item} />
              ))}
            </Space>

            <Divider style={{ margin: '8px 0' }} />

            {(() => {
              const itemsPendientes = proformaDrawer.items.filter((i) => i.estado === 'PENDIENTE');
              const { total, subtotal, igv } = calcularIgvProforma(itemsPendientes);
              return (
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '10px 16px', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary">Subtotal</Text>
                    <Text>S/ {subtotal.toFixed(2)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary">IGV (18%)</Text>
                    <Text>S/ {igv.toFixed(2)}</Text>
                  </div>
                  <Divider style={{ margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Total</Text>
                    <Text strong style={{ fontSize: 15 }}>S/ {total.toFixed(2)}</Text>
                  </div>
                </div>
              );
            })()}

            <Alert
              type="info"
              showIcon
              message={
                <Text style={{ fontSize: 12 }}>
                  Para realizar el pago, dirígete a <Text strong>Caja → Pagos</Text>.
                  Los precios están vigentes hasta{' '}
                  <Text strong>{dayjs(proformaDrawer.fechaVigencia).format('DD/MM/YYYY')}</Text>.
                </Text>
              }
              style={{ padding: '6px 12px' }}
            />
          </Space>
        )}
      </Drawer>
    </Space>
  );
}

function ItemProformaCard({ item }: { item: ItemProformaResponseDTO }) {
  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: '10px 12px',
        background:
          item.estado === 'PAGADO'
            ? '#f6ffed'
            : item.estado === 'NO_DISPONIBLE'
            ? '#fff2f0'
            : '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>{item.nombreItem}</Text>
            {estadoItemTag(item.estado)}
          </Space>
          {item.tipo === 'MEDICAMENTO' && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {[item.dosis, item.frecuencia, item.duracion].filter(Boolean).join(' · ')}
              {item.principioActivo && ` — ${item.principioActivo}`}
            </div>
          )}
          {item.tipo === 'EXAMEN' && item.categoria && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.categoria}</div>
          )}
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            S/ {item.precioUnitario.toFixed(2)} × {item.cantidad ?? 1}
          </div>
        </div>
        <Text strong style={{ whiteSpace: 'nowrap' }}>
          S/ {item.precioCongelado.toFixed(2)}
        </Text>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ProformasPage() {
  const { isError: cajaError, error: cajaErr } = useDisponibilidadCaja();

  return (
    <div>
      <PageHeader
        title="Proformas"
      />

      {cajaError && (
        <Alert
          type="error"
          showIcon
          message="ms-caja no disponible"
          description={serviceErrorMessage(cajaErr, 'ms-caja', 8088)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="nueva"
        items={[
          {
            key: 'nueva',
            label: (
              <Space>
                <ShoppingCartOutlined />
                Nueva proforma
              </Space>
            ),
            children: <NuevaProformaTab />,
          },
          {
            key: 'generadas',
            label: (
              <Space>
                <FileTextOutlined />
                Proformas generadas
              </Space>
            ),
            children: <ProformasGeneradasTab />,
          },
        ]}
      />
    </div>
  );
}
