import api from './axios';
import type {
  CitaMedicaResponseDTO,
  CitaMedicaRequestDTO,
  ReagendarRequestDTO,
  SlotDisponibleDTO,
  CitasFiltros,
  EstadoCita,
} from '../types/citas';

export const listar = (filtros: CitasFiltros = {}): Promise<CitaMedicaResponseDTO[]> =>
  api.get<CitaMedicaResponseDTO[]>('/citas', { params: filtros }).then(r => r.data);

export const obtenerPorId = (id: number): Promise<CitaMedicaResponseDTO> =>
  api.get<CitaMedicaResponseDTO>(`/citas/${id}`).then(r => r.data);

export const disponibilidad = (idPersonal: number, fecha: string): Promise<SlotDisponibleDTO[]> =>
  api.get<SlotDisponibleDTO[]>('/citas/disponibilidad', { params: { idPersonal, fecha } }).then(r => r.data);

export const crear = (data: CitaMedicaRequestDTO): Promise<CitaMedicaResponseDTO> =>
  api.post<CitaMedicaResponseDTO>('/citas', data).then(r => r.data);

export const actualizarEstado = (id: number, estado: EstadoCita): Promise<CitaMedicaResponseDTO> =>
  api.patch<CitaMedicaResponseDTO>(`/citas/${id}/estado`, { estado }).then(r => r.data);

export const cancelarPendientePago = (id: number): Promise<CitaMedicaResponseDTO> =>
  api.delete<CitaMedicaResponseDTO>(`/citas/${id}`).then(r => r.data);

export const cancelarConfirmada = (id: number): Promise<CitaMedicaResponseDTO> =>
  api.post<CitaMedicaResponseDTO>(`/citas/${id}/cancelar-confirmada`).then(r => r.data);

export const cancelarPorClinica = (id: number): Promise<CitaMedicaResponseDTO> =>
  api.post<CitaMedicaResponseDTO>(`/citas/${id}/cancelar-por-clinica`).then(r => r.data);

export const reagendar = (id: number, data: ReagendarRequestDTO): Promise<CitaMedicaResponseDTO> =>
  api.post<CitaMedicaResponseDTO>(`/citas/${id}/reagendar`, data).then(r => r.data);

// Ping liviano para detectar si ms-citas está disponible al entrar a la página.
export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/citas').then(() => true);
