import api from './axios';
import type {
  MedicamentoResponseDTO,
  MedicamentoConStockResponseDTO,
  MedicamentoRequestDTO,
  MedicamentoUpdateRequestDTO,
  LoteRequestDTO,
  LoteUpdateRequestDTO,
  LoteResponseDTO,
  KardexResponseDTO,
} from '../types/farmacia';

export const listarMedicamentos = (q?: string): Promise<MedicamentoResponseDTO[]> =>
  api.get<MedicamentoResponseDTO[]>('/medicamentos', { params: q ? { q } : undefined }).then(r => r.data);

export const obtenerMedicamento = (id: number): Promise<MedicamentoResponseDTO> =>
  api.get<MedicamentoResponseDTO>(`/medicamentos/${id}`).then(r => r.data);

export const listarMedicamentosConStock = (q?: string): Promise<MedicamentoConStockResponseDTO[]> =>
  api.get<MedicamentoConStockResponseDTO[]>('/medicamentos/con-stock', { params: q ? { q } : undefined }).then(r => r.data);

export const listarStockBajo = (umbral = 10): Promise<MedicamentoConStockResponseDTO[]> =>
  api.get<MedicamentoConStockResponseDTO[]>('/medicamentos/stock-bajo', { params: { umbral } }).then(r => r.data);

export const listarProximosAVencer = (dias = 30): Promise<LoteResponseDTO[]> =>
  api.get<LoteResponseDTO[]>('/medicamentos/proximos-vencer', { params: { dias } }).then(r => r.data);

export const crearMedicamento = (data: MedicamentoRequestDTO): Promise<MedicamentoResponseDTO> =>
  api.post<MedicamentoResponseDTO>('/medicamentos', data).then(r => r.data);

export const actualizarMedicamento = (id: number, data: MedicamentoUpdateRequestDTO): Promise<MedicamentoResponseDTO> =>
  api.patch<MedicamentoResponseDTO>(`/medicamentos/${id}`, data).then(r => r.data);

export const agregarLote = (idMedicamento: number, data: LoteRequestDTO): Promise<LoteResponseDTO> =>
  api.post<LoteResponseDTO>(`/medicamentos/${idMedicamento}/lotes`, data).then(r => r.data);

export const actualizarLote = (idMedicamento: number, idLote: number, data: LoteUpdateRequestDTO): Promise<LoteResponseDTO> =>
  api.patch<LoteResponseDTO>(`/medicamentos/${idMedicamento}/lotes/${idLote}`, data).then(r => r.data);

export const obtenerDisponibilidadMedicamento = (id: number): Promise<import('../types/farmacia').DisponibilidadMedicamentoDTO> =>
  api.get(`/medicamentos/${id}/disponibilidad`).then(r => r.data);

export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/medicamentos/con-stock').then(() => true);

export const obtenerKardex = (idMedicamento: number, desde?: string, hasta?: string): Promise<KardexResponseDTO[]> =>
  api.get<KardexResponseDTO[]>(`/medicamentos/${idMedicamento}/kardex`, {
    params: { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) },
  }).then(r => r.data);
