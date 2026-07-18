export interface DisponibilidadMedicamentoDTO {
  idMedicamento: number;
  cantidadTotal: number;
}

export interface MedicamentoResponseDTO {
  id: number;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  precio?: number;
}

export interface LoteResponseDTO {
  id: number;
  idMedicamento: number;
  numeroLote: string;
  fechaVencimiento: string;
  cantidadDisponible: number;
}

export interface MedicamentoConStockResponseDTO extends MedicamentoResponseDTO {
  stockTotal: number;
  lotes: LoteResponseDTO[];
}

export interface MedicamentoRequestDTO {
  nombre: string;
  principioActivo: string;
  presentacion: string;
  precio: number;
}

export interface MedicamentoUpdateRequestDTO {
  nombre?: string;
  principioActivo?: string;
  presentacion?: string;
  precio?: number;
}

export interface LoteRequestDTO {
  numeroLote: string;
  fechaVencimiento: string;
  cantidadInicial: number;
}

export interface LoteUpdateRequestDTO {
  numeroLote?: string;
  fechaVencimiento?: string;
  cantidadDisponible?: number;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type MotivoMovimiento = 'LOTE_REGISTRADO' | 'PAGO_PROFORMA' | 'AJUSTE_MANUAL';

export interface KardexResponseDTO {
  id: number;
  idMedicamento: number;
  nombreMedicamento: string;
  idLote: number;
  numeroLote: string;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  saldoAnterior: number;
  saldoPosterior: number;
  referencia?: string;
  fecha: string;
}
