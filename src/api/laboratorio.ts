import api from './axios';
import type {
  ExamenResponseDTO,
  ExamenRequestDTO,
  ExamenUpdateRequestDTO,
  ExamenAutorizadoResponseDTO,
} from '../types/laboratorio';

export const listarExamenes = (q?: string): Promise<ExamenResponseDTO[]> =>
  api.get<ExamenResponseDTO[]>('/examenes', { params: q ? { q } : undefined }).then(r => r.data);

export const obtenerExamen = (id: number): Promise<ExamenResponseDTO> =>
  api.get<ExamenResponseDTO>(`/examenes/${id}`).then(r => r.data);

export const crearExamen = (data: ExamenRequestDTO): Promise<ExamenResponseDTO> =>
  api.post<ExamenResponseDTO>('/examenes', data).then(r => r.data);

export const actualizarExamen = (id: number, data: ExamenUpdateRequestDTO): Promise<ExamenResponseDTO> =>
  api.patch<ExamenResponseDTO>(`/examenes/${id}`, data).then(r => r.data);

export const listarAutorizadosPorPaciente = (idPaciente: number): Promise<ExamenAutorizadoResponseDTO[]> =>
  api.get<ExamenAutorizadoResponseDTO[]>(`/examenes-autorizados/paciente/${idPaciente}`).then(r => r.data);

export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/examenes').then(() => true);
