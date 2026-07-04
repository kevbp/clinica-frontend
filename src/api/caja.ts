import api from './axios';
import type {
  PagoConsultaRequestDTO,
  PagoConsultaResponseDTO,
  ProformaResponseDTO,
  PagarItemsRequestDTO,
  NotaCreditoResponseDTO,
  ComprobanteResponseDTO,
  TarifaConsultaRequestDTO,
  TarifaConsultaResponseDTO,
  RetiroRequestDTO,
  RetiroResponseDTO,
} from '../types/caja';

// ── Pago de Consulta ────────────────────────────────────────────────────────

export const obtenerPagoPorCita = (idCita: number): Promise<PagoConsultaResponseDTO> =>
  api.get<PagoConsultaResponseDTO>(`/pagos-consulta/cita/${idCita}`).then(r => r.data);

export const crearPagoConsulta = (data: PagoConsultaRequestDTO): Promise<PagoConsultaResponseDTO> =>
  api.post<PagoConsultaResponseDTO>('/pagos-consulta', data).then(r => r.data);

export const confirmarPagoConsulta = (id: number): Promise<PagoConsultaResponseDTO> =>
  api.post<PagoConsultaResponseDTO>(`/pagos-consulta/${id}/confirmar`).then(r => r.data);

export const obtenerComprobantePagoConsulta = (id: number): Promise<ComprobanteResponseDTO> =>
  api.get<ComprobanteResponseDTO>(`/pagos-consulta/${id}/comprobante`).then(r => r.data);

export const obtenerPagoConsultaPorId = (id: number): Promise<PagoConsultaResponseDTO> =>
  api.get<PagoConsultaResponseDTO>(`/pagos-consulta/${id}`).then(r => r.data);

// Ping liviano para detectar si ms-caja está disponible al entrar a la página.
export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/tarifas-consulta').then(() => true);

// ── Tarifas de Consulta ─────────────────────────────────────────────────────

export const listarTarifas = (): Promise<TarifaConsultaResponseDTO[]> =>
  api.get<TarifaConsultaResponseDTO[]>('/tarifas-consulta').then(r => r.data);

export const guardarTarifa = (data: TarifaConsultaRequestDTO): Promise<TarifaConsultaResponseDTO> =>
  api.post<TarifaConsultaResponseDTO>('/tarifas-consulta', data).then(r => r.data);

// ── Notas de Crédito ─────────────────────────────────────────────────────────

export const listarNotasCredito = (idPaciente: number): Promise<NotaCreditoResponseDTO[]> =>
  api.get<NotaCreditoResponseDTO[]>('/notas-credito', { params: { idPaciente } }).then(r => r.data);

// ── Proformas ────────────────────────────────────────────────────────────────

export const listarProformasPorPaciente = (idPaciente: number): Promise<ProformaResponseDTO[]> =>
  api.get<ProformaResponseDTO[]>(`/proformas/paciente/${idPaciente}`).then(r => r.data);

export const obtenerProforma = (id: number): Promise<ProformaResponseDTO> =>
  api.get<ProformaResponseDTO>(`/proformas/${id}`).then(r => r.data);

export const construirProforma = (idPaciente: number): Promise<ProformaResponseDTO> =>
  api.post<ProformaResponseDTO>(`/proformas/paciente/${idPaciente}`).then(r => r.data);

export const pagarItemsProforma = (id: number, data: PagarItemsRequestDTO): Promise<ProformaResponseDTO> =>
  api.post<ProformaResponseDTO>(`/proformas/${id}/pagar-items`, data).then(r => r.data);

export const emitirComprobante = (id: number): Promise<ComprobanteResponseDTO> =>
  api.post<ComprobanteResponseDTO>(`/proformas/${id}/emitir-comprobante`).then(r => r.data);

// ── Comprobantes (historial) ────────────────────────────────────────────────

export const listarComprobantesPorPaciente = (idPaciente: number): Promise<ComprobanteResponseDTO[]> =>
  api.get<ComprobanteResponseDTO[]>('/comprobantes', { params: { idPaciente } }).then(r => r.data);

export const enviarComprobantePorCorreo = (id: number, correo: string): Promise<void> =>
  api.post(`/comprobantes/${id}/enviar-correo`, { correo }).then(() => undefined);

// ── Saldo / Crédito ──────────────────────────────────────────────────────────

export const obtenerSaldoDisponible = (idPaciente: number): Promise<number> =>
  api.get<number>('/pagos-consulta/saldo-disponible', { params: { idPaciente } }).then(r => r.data);

export const aplicarCredito = (idPago: number, idNotaCredito: number): Promise<PagoConsultaResponseDTO> =>
  api.post<PagoConsultaResponseDTO>(`/pagos-consulta/${idPago}/aplicar-credito`, { idNotaCredito }).then(r => r.data);

// ── Notas de Crédito — envío por correo ──────────────────────────────────────

export const enviarNotaCreditoPorCorreo = (id: number, correo: string): Promise<void> =>
  api.post(`/notas-credito/${id}/enviar-correo`, { correo }).then(() => undefined);

// ── Retiros de Nota de Crédito ────────────────────────────────────────────────

export const solicitarRetiro = (idPaciente: number, data: RetiroRequestDTO): Promise<RetiroResponseDTO> =>
  api.post<RetiroResponseDTO>('/retiros-nota-credito', data, { params: { idPaciente } }).then(r => r.data);

export const listarRetirosPorPaciente = (idPaciente: number): Promise<RetiroResponseDTO[]> =>
  api.get<RetiroResponseDTO[]>('/retiros-nota-credito', { params: { idPaciente } }).then(r => r.data);
