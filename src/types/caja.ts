export type EstadoPagoConsulta = 'PENDIENTE' | 'PAGADO' | 'PAGADO_SIN_CONFIRMAR';
export type EstadoItem = 'PENDIENTE' | 'PAGADO' | 'NO_DISPONIBLE';
export type EstadoNotaCredito = 'DISPONIBLE' | 'USADA';
export type EstadoRetiro = 'SOLICITADO' | 'PROCESADO';
export type TipoItem = 'MEDICAMENTO' | 'EXAMEN';
export type TipoComprobante = 'CONSULTA' | 'PROFORMA';
export type TipoNotaCredito =
  | 'CANCELACION_ANTICIPADA'
  | 'CANCELACION_TARDIA'
  | 'CANCELACION_POR_CLINICA'
  | 'NO_SHOW'
  | 'ERROR_COBRO';

export interface PagoConsultaRequestDTO {
  idCita: number;
  idPaciente: number;
  idPersonalMedico: number;
  correoPaciente?: string;
  nombrePaciente?: string;
}

export interface PagoConsultaResponseDTO {
  id: number;
  idCita: number;
  idPaciente: number;
  monto: number;
  estado: EstadoPagoConsulta;
  montoCreditoAplicado: number;
  montoACobrar: number;
}

export interface ItemProformaResponseDTO {
  id: number;
  tipo: TipoItem;
  idItem: number;
  descripcion: string;
  precioCongelado: number;
  cantidad?: number;
  estado: EstadoItem;
}

export interface ProformaResponseDTO {
  id: number;
  idPaciente: number;
  fechaGeneracion: string;
  items: ItemProformaResponseDTO[];
}

export interface PagarItemsRequestDTO {
  idsItems: number[];
}

export interface NotaCreditoResponseDTO {
  id: number;
  numero: string;
  idPaciente: number;
  tipo: TipoNotaCredito;
  monto: number;
  montoRetenido: number;
  idPagoConsultaOrigen: number;
  motivo: string;
  estado: EstadoNotaCredito;
  idComprobanteRelacionado?: number;
}

export interface ComprobanteResponseDTO {
  id: number;
  tipo: TipoComprobante;
  idOrigen: number;
  subtotal: number;
  igv: number;
  montoTotal: number;
  fechaEmision: string;
  numero: string;
  idCita?: number;
  especialidad?: string;
  descuento?: number;
  conceptoDescuento?: string;
}

export interface RetiroRequestDTO {
  idNotaCredito: number;
  nombreBanco: string;
  numeroCuenta: string;
  nombreTitular: string;
  correoConfirmacion?: string;
}

export interface RetiroResponseDTO {
  id: number;
  idNotaCredito: number;
  idPaciente: number;
  monto: number;
  nombreBanco: string;
  numeroCuenta: string;
  nombreTitular: string;
  estado: EstadoRetiro;
  fechaSolicitud: string;
}

export interface TarifaConsultaRequestDTO {
  idEspecialidad: number;
  monto: number;
}

export interface TarifaConsultaResponseDTO {
  idEspecialidad: number;
  monto: number;
}
